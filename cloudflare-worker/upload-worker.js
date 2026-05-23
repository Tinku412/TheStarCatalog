/**
 * Cloudflare Worker — R2 Upload Proxy
 * ─────────────────────────────────────
 * Receives multipart/form-data file uploads from the browser,
 * signs them with AWS SigV4, and PUTs them directly into R2.
 * Credentials stay here (server-side) — never exposed to the browser.
 *
 * Environment variables (set in Cloudflare Dashboard → Workers → Settings → Variables):
 *   R2_ACCESS_KEY_ID      — your R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY  — your R2 Secret Access Key
 *   R2_BUCKET             — bucket name  (e.g. "profilepics")
 *   R2_ENDPOINT           — S3 API root  (e.g. "https://<accountId>.r2.cloudflarestorage.com")
 *   R2_PUBLIC_URL         — public read URL (e.g. "https://pub-xxx.r2.dev")
 *   ALLOWED_ORIGIN        — your site domain (e.g. "https://thestarcatalog.com")
 *                           set to "*" during development if needed
 *
 * Endpoints exposed by this Worker:
 *   POST /upload  — upload a file
 *                   FormData fields:
 *                     file    (required) — the File/Blob
 *                     prefix  (optional) — storage folder, default "uploads"
 *                   Returns JSON: { url: "https://pub-xxx.r2.dev/prefix/filename.ext" }
 *
 * Deploy:
 *   wrangler deploy   (after filling in wrangler.toml)
 */

export default {
    async fetch(request, env) {
        // Resolve which origin to echo back in CORS headers.
        // ALLOWED_ORIGIN can be a comma-separated list, e.g.:
        //   "https://thestarcatalog.com,http://localhost:9000,http://localhost:3000"
        // or a single wildcard "*" to allow any origin.
        const requestOrigin = request.headers.get('Origin') || '';
        const allowedList   = (env.ALLOWED_ORIGIN || '*')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        let resolvedOrigin;
        if (allowedList.includes('*')) {
            resolvedOrigin = '*';
        } else if (allowedList.some(o => o === requestOrigin)) {
            // Reflect the exact request origin so the browser accepts it
            resolvedOrigin = requestOrigin;
        } else if (allowedList.some(o => /^https?:\/\/localhost(:\d+)?$/.test(o) || o === requestOrigin)) {
            resolvedOrigin = requestOrigin;
        } else {
            // Default: use the first entry (production domain)
            resolvedOrigin = allowedList[0];
        }

        // ── CORS preflight ────────────────────────────────────────────────────
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(resolvedOrigin),
            });
        }

        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/upload') {
            return handleUpload(request, env, resolvedOrigin);
        }

        return new Response('Not found', { status: 404 });
    },
};

// ── Upload handler ────────────────────────────────────────────────────────────
async function handleUpload(request, env, allowedOrigin) {
    let formData;
    try {
        formData = await request.formData();
    } catch {
        return jsonError('Invalid request — expected multipart/form-data', 400, allowedOrigin);
    }

    const file   = formData.get('file');
    const prefix = (formData.get('prefix') || 'uploads').replace(/[^a-z0-9_\-\/]/gi, '').replace(/\/+$/, '');

    if (!file || typeof file.arrayBuffer !== 'function') {
        return jsonError('Missing "file" field', 400, allowedOrigin);
    }
    if (file.size > 10 * 1024 * 1024) {
        return jsonError('File too large (max 10 MB)', 413, allowedOrigin);
    }

    const ext      = (file.name || 'upload').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    const key      = `${prefix}/${Date.now()}-${randomHex(8)}.${ext}`;
    const mimeType = file.type || 'application/octet-stream';
    const body     = await file.arrayBuffer();

    try {
        await putObject(env, key, body, mimeType);
    } catch (err) {
        return jsonError('Upload to R2 failed: ' + err.message, 502, allowedOrigin);
    }

    const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    return new Response(JSON.stringify({ url: publicUrl, key }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
    });
}

// ── R2 / S3-compatible PUT via SigV4 ─────────────────────────────────────────
async function putObject(env, key, body, contentType) {
    const bucket   = env.R2_BUCKET;
    const endpoint = env.R2_ENDPOINT.replace(/\/$/, '');
    const host     = new URL(endpoint).host;
    const region   = 'auto';
    const service  = 's3';

    const now      = new Date();
    const amzDate  = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStr  = amzDate.slice(0, 8);

    const payloadHash = await sha256hex(body);

    const canonicalUri     = `/${bucket}/${key}`;
    const canonicalHeaders = [
        `content-type:${contentType}`,
        `host:${host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';

    const signedHeaders    = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

    const credentialScope = `${dateStr}/${region}/${service}/aws4_request`;
    const stringToSign    = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256hex(canonicalRequest)].join('\n');

    const signingKey  = await deriveSigningKey(env.R2_SECRET_ACCESS_KEY, dateStr, region, service);
    const signature   = toHex(await hmacSha256Bytes(signingKey, stringToSign));
    const authHeader  = `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${credentialScope},SignedHeaders=${signedHeaders},Signature=${signature}`;

    const res = await fetch(`${endpoint}/${bucket}/${key}`, {
        method:  'PUT',
        headers: {
            Authorization:          authHeader,
            'Content-Type':         contentType,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date':           amzDate,
        },
        body,
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`${res.status} — ${txt.slice(0, 300)}`);
    }
}

// ── Crypto helpers (Web Crypto API — available in Workers runtime) ────────────
async function sha256hex(data) {
    const buf  = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return toHex(new Uint8Array(hash));
}

async function hmacSha256Bytes(keyBytes, message) {
    const key = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

async function deriveSigningKey(secret, date, region, service) {
    const kDate    = await hmacSha256Bytes(new TextEncoder().encode('AWS4' + secret), date);
    const kRegion  = await hmacSha256Bytes(kDate, region);
    const kService = await hmacSha256Bytes(kRegion, service);
    return hmacSha256Bytes(kService, 'aws4_request');
}

function toHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(n) {
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return toHex(arr).slice(0, n);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function jsonError(msg, status, origin) {
    return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
}
