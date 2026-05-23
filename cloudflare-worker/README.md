# Cloudflare R2 Upload Worker — Setup Guide

## Overview
Images (profile pictures + review photos) are uploaded to **Cloudflare R2** via a
lightweight Worker that signs requests server-side. This keeps your R2 secret key
out of the browser entirely.

---

## Step 1 — Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

---

## Step 2 — Set secret environment variables

Run these two commands and enter the values when prompted:

```bash
cd cloudflare-worker

wrangler secret put R2_ACCESS_KEY_ID
# Enter: 2f49fb1cbdd19e15281a54027782abb3

wrangler secret put R2_SECRET_ACCESS_KEY
# Enter: 337c74cb44417a4cb4c308f5cc00a9463ef6aaae159765de4079d991ba8d72a0
```

The non-secret config (bucket name, endpoint, public URL, allowed origin) is already
set in `wrangler.toml`. Update `ALLOWED_ORIGIN` if your domain changes.

---

## Step 3 — Deploy the Worker

```bash
wrangler deploy
```

Wrangler will print the Worker URL, e.g.:
```
https://star-catalog-upload.<your-subdomain>.workers.dev
```

---

## Step 4 — Update the frontend

Open `r2-upload.js` and update the `R2_WORKER_URL` constant to your Worker URL:

```js
const R2_WORKER_URL = 'https://star-catalog-upload.<your-subdomain>.workers.dev';
```

---

## Step 5 — Configure R2 bucket CORS

In the Cloudflare Dashboard:
1. Go to **R2** → bucket **profilepics** → **Settings** → **CORS Policy**
2. Add the following policy (replace the origin with your actual domain):

```json
[
  {
    "AllowedOrigins": ["https://thestarcatalog.com", "https://*.workers.dev"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

> GET/HEAD CORS is needed so browsers can display images from the public URL.
> The actual uploads go through the Worker (no direct browser-to-R2 PUT needed).

---

## How it works

```
Browser  →  POST /upload (FormData with file)  →  Worker
Worker   →  AWS SigV4 signed PUT               →  R2 bucket
Worker   →  returns { url: "https://pub-xxx.r2.dev/..." }
Browser  →  saves URL string to Supabase (sc_profiles / sc_reviews)
```

All metadata (names, descriptions, reviews, etc.) still goes through Supabase.
Only the binary image file bytes touch R2/Cloudflare.

---

## File structure

```
cloudflare-worker/
  upload-worker.js   ← Worker source (deploy this)
  wrangler.toml      ← Wrangler configuration

r2-upload.js         ← Browser client (update R2_WORKER_URL after deploy)
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Upload failed: 403` | Secrets not set, or wrong access key |
| `Upload failed: CORS error` | ALLOWED_ORIGIN in wrangler.toml doesn't match your site |
| Images not displaying | R2 bucket is not public, or CORS GET policy missing |
| `Upload failed: 413` | File is over 10 MB |
