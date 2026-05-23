/**
 * r2-upload.js — Browser client for the Star Catalog R2 upload Worker
 *
 * Usage:
 *   const url = await r2Upload(file, 'profile-pictures');
 *   const url = await r2Upload(file, 'review-images/profileId');
 *
 * The Worker URL below should be the deployed URL of cloudflare-worker/upload-worker.js.
 * Update R2_WORKER_URL after deploying the Worker.
 */

// ── Configuration ─────────────────────────────────────────────────────────────
// After deploying the Worker, replace this URL with your Worker's URL.
// It will look like: https://star-catalog-upload.<your-subdomain>.workers.dev
const R2_WORKER_URL = 'https://star-catalog-upload.thestarcatalog.workers.dev';


/**
 * Upload a file to Cloudflare R2 via the upload Worker.
 * @param {File}   file    - File object to upload
 * @param {string} prefix  - Storage folder prefix (e.g. 'profile-pictures')
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function r2Upload(file, prefix = 'uploads') {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
        throw new Error('File too large. Maximum size is 10 MB.');
    }

    const fd = new FormData();
    fd.append('file',   file);
    fd.append('prefix', prefix);

    const res = await fetch(`${R2_WORKER_URL}/upload`, {
        method: 'POST',
        body:   fd,
    });

    let json;
    try {
        json = await res.json();
    } catch {
        throw new Error(`Upload failed (${res.status}): unexpected response`);
    }

    if (!res.ok || json.error) {
        throw new Error(`Upload failed: ${json.error || res.status}`);
    }

    return json.url;
}
