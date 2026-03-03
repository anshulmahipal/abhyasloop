# Supabase Reverse Proxy (Cloudflare Worker)

Proxies all traffic to your Supabase project so that apps can reach it even when `*.supabase.co` is blocked (e.g. ISP/DNS blocking in India).

## Features

- **HTTP/HTTPS proxy**: Forwards all methods (GET, POST, PUT, PATCH, DELETE, etc.) to `https://[YOUR_PROJECT_ID].supabase.co`.
- **Headers**: Overwrites `Host` to the Supabase origin; forwards `Authorization`, `Apikey`, `Content-Type`, and other headers.
- **CORS**: Handles `OPTIONS` preflight and adds `Access-Control-*` to responses so React Native and web apps work without CORS errors.
- **Auth redirects**: Rewrites `Location` headers in responses so magic links and OAuth redirects point to your proxy domain instead of `.supabase.co`.
- **WebSocket**: Cloudflare Workers do **not** support outbound WebSocket connections, so Supabase Realtime cannot be proxied through this Worker. The Worker returns `426 Upgrade Required` with an explanatory body for Realtime requests. Options: use Realtime only when not behind a block, or run a proxy that supports outbound WebSocket (e.g. Durable Objects, or a small VPS).

## Prerequisites

- Node.js 18+
- A Cloudflare account (free tier is enough).
- Your Supabase project URL: `https://<project-ref>.supabase.co`.

## Setup

### 1. Install and configure

```bash
cd workers/supabase-proxy
npm install
```

Set the Supabase origin as a **secret** (never commit it in code):

```bash
npx wrangler secret put SUPABASE_ORIGIN
# When prompted, enter: https://YOUR_PROJECT_REF.supabase.co
```

Optional: restrict CORS to your app origins (recommended in production):

```bash
npx wrangler secret put CORS_ORIGIN
# Enter e.g. https://yourapp.com or https://myapp.expo.dev (comma not supported; use one origin or *)
```

### 2. Deploy

```bash
npx wrangler deploy
```

After deploy you’ll get a URL like:

`https://supabase-proxy.<your-subdomain>.workers.dev`

To use a custom domain (e.g. `supabase.yourdomain.com`), add a `routes` section in `wrangler.toml` and configure the domain in the Cloudflare dashboard.

### 3. Update your Supabase client (React Native / Expo)

Your app already supports a proxy URL via `EXPO_PUBLIC_SUPABASE_PROXY_URL`. Point it to the Worker URL.

**Option A: Environment variable (recommended)**

In `.env` or your Expo config:

```bash
# Use the Cloudflare Worker as the Supabase base URL
EXPO_PUBLIC_SUPABASE_PROXY_URL=https://supabase-proxy.<your-subdomain>.workers.dev
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Do **not** set `EXPO_PUBLIC_SUPABASE_URL` when using the proxy (or set it to the same value); the client in `lib/supabase.ts` already prefers `EXPO_PUBLIC_SUPABASE_PROXY_URL` when present.

**Option B: Code (if you don’t use env)**

In `lib/supabase.ts`, the URL is already:

```ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_PROXY_URL?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;
```

So you only need to set `EXPO_PUBLIC_SUPABASE_PROXY_URL` to your Worker URL. No code change required.

**Web (Next.js)**

If your web app also goes through the proxy:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase-proxy.<your-subdomain>.workers.dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Use this URL when creating the Supabase client on the web.

### 4. Auth redirect URLs (Supabase Dashboard)

For magic links and OAuth to work via the proxy:

1. In Supabase: **Authentication → URL Configuration**.
2. Set **Site URL** to your app’s URL (e.g. `https://yourapp.com` or your Expo deep link).
3. Add **Redirect URLs** that Supabase will see in the rewritten `Location` header, e.g.:
   - `https://supabase-proxy.<your-subdomain>.workers.dev/auth/v1/**`
   - Or your custom domain: `https://supabase.yourdomain.com/auth/v1/**`

Supabase may still send the first redirect to the proxy; the proxy rewrites it so the browser goes to the proxy domain, and your app should handle the callback path (e.g. `/auth/v1/callback`) and complete sign-in.

## WebSocket (Realtime)

Cloudflare Workers **do not support outbound WebSocket** connections, so this Worker cannot proxy Supabase Realtime. Requests with `Upgrade: websocket` receive `426 Upgrade Required` and a JSON body explaining the limitation.

**Options:**

1. **Use Realtime only when not blocked** – e.g. allow Realtime when the app detects it can reach Supabase directly; use the proxy only for REST and Auth when blocked.
2. **Disable Realtime** – if you don’t need live subscriptions, use the proxy for all other traffic.
3. **Another proxy** – use a proxy that supports outbound WebSocket (e.g. Durable Objects, or a small VPS with a WebSocket-capable reverse proxy).

The Supabase JS client will fall back or error on Realtime when the proxy returns 426; your app can catch this and disable Realtime features when using the proxy.

## Local development

```bash
npm run dev
```

Use the local URL (e.g. `http://localhost:8787`) as `EXPO_PUBLIC_SUPABASE_PROXY_URL` for testing. Set the secret locally:

```bash
echo "https://YOUR_PROJECT_REF.supabase.co" | npx wrangler secret put SUPABASE_ORIGIN
```

## Troubleshooting

| Issue | Check |
|-------|------|
| 500 / Configuration error | `SUPABASE_ORIGIN` secret is set and is `https://....supabase.co` (no trailing slash). |
| CORS errors | Set `CORS_ORIGIN` to your app origin or `*` for dev. |
| Auth redirect goes to supabase.co | Worker rewrites `Location`; ensure you’re using the proxy URL as the Supabase base URL and that redirect URLs in Supabase include the proxy domain. |
| Realtime not connecting | Workers don't support outbound WebSocket; use one of the options in the WebSocket section above. |

## Files

- `src/index.ts` – Worker entry: CORS, proxy, Location rewrite, WebSocket returns 426 with explanation.
- `wrangler.toml` – Cloudflare Worker config (name, compatibility_date, optional routes).
- `package.json` – Scripts and dependencies for Wrangler and TypeScript.
