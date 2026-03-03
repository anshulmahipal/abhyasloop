/**
 * Cloudflare Worker: Supabase reverse proxy
 * Bypasses ISP-level DNS blocking by proxying all traffic to your Supabase project.
 *
 * - Forwards HTTP/HTTPS with correct Host and headers
 * - CORS: full preflight (OPTIONS) and response headers
 * - Rewrites Location headers so auth redirects use the proxy domain
 * - WebSocket pass-through for Supabase Realtime
 */

export interface Env {
  /** Full Supabase origin, e.g. https://xxxxxxxx.supabase.co (no trailing slash) */
  SUPABASE_ORIGIN: string;
  /** Optional: allowed origin for CORS (defaults to *). Use your app origin(s) in production. */
  CORS_ORIGIN?: string;
}

const DEFAULT_CORS_ORIGIN = '*';

/** Headers we never forward to Supabase (or from Supabase to client). */
const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
  'proxy-connection',
]);

/** Response headers we may rewrite (e.g. Location). */
const REWRITE_RESPONSE_HEADERS = new Set(['location']);

function getSupabaseOrigin(env: Env): string {
  const origin = env.SUPABASE_ORIGIN?.trim().replace(/\/$/, '');
  if (!origin || !origin.startsWith('https://')) {
    throw new Response('SUPABASE_ORIGIN must be set to https://[project].supabase.co', { status: 500 });
  }
  return origin;
}

/** Resolve CORS Allow-Origin: use CORS_ORIGIN secret, else reflect request Origin (for credentialed requests). */
function getCorsOrigin(env: Env, request: Request): string {
  if (env.CORS_ORIGIN?.trim()) return env.CORS_ORIGIN.trim();
  const requestOrigin = request.headers.get('Origin')?.trim();
  if (requestOrigin) return requestOrigin;
  return DEFAULT_CORS_ORIGIN;
}

const DEFAULT_ALLOW_HEADERS =
  'Authorization, Content-Type, Accept, Apikey, X-Client-Info, Range, X-Requested-With, Origin';

function corsHeaders(env: Env, request: Request): Headers {
  const origin = getCorsOrigin(env, request);
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', origin);
  // Required when app sends Authorization/Apikey: browser rejects * with credentials
  if (origin !== '*') {
    h.set('Access-Control-Allow-Credentials', 'true');
  }
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  // Echo preflight request headers so we never block a header Supabase client sends
  const requestHeaders = request.headers.get('Access-Control-Request-Headers');
  h.set('Access-Control-Allow-Headers', requestHeaders?.trim() || DEFAULT_ALLOW_HEADERS);
  h.set('Access-Control-Max-Age', '86400');
  h.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length');
  h.set('Vary', 'Origin');
  return h;
}

function addCorsToResponse(response: Response, env: Env, request: Request): Response {
  const cors = corsHeaders(env, request);
  const newHeaders = new Headers(response.headers);
  cors.forEach((value, key) => newHeaders.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/** Build upstream URL from incoming request and worker URL (proxy base). */
function buildUpstreamUrl(request: Request, supabaseOrigin: string, proxyBaseUrl: string): string {
  const url = new URL(request.url);
  const path = url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`;
  const search = url.search;
  return `${supabaseOrigin}${path}${search}`;
}

/** Rewrite Location header so redirects go to proxy domain instead of .supabase.co */
function rewriteLocationHeader(
  value: string,
  supabaseOrigin: string,
  proxyBaseUrl: string
): string {
  try {
    const loc = new URL(value, supabaseOrigin);
    if (loc.origin !== supabaseOrigin) return value;
    const proxy = new URL(proxyBaseUrl);
    loc.protocol = proxy.protocol;
    loc.host = proxy.host;
    return loc.toString();
  } catch {
    return value;
  }
}

/** Copy request headers to a new Headers, skipping hop-by-hop and setting Host. */
function forwardRequestHeaders(request: Request, supabaseOrigin: string): Headers {
  const out = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (SKIP_REQUEST_HEADERS.has(lower)) return;
    out.set(key, value);
  });
  const host = new URL(supabaseOrigin).host;
  out.set('Host', host);
  return out;
}

/** Copy response headers and rewrite Location (and optionally CSP) to point to proxy. */
function forwardResponseHeaders(
  response: Response,
  supabaseOrigin: string,
  proxyBaseUrl: string
): Headers {
  const out = new Headers();
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'transfer-encoding') return;
    if (REWRITE_RESPONSE_HEADERS.has(lower)) {
      value = rewriteLocationHeader(value, supabaseOrigin, proxyBaseUrl);
    }
    out.set(key, value);
  });
  return out;
}

/** Proxy HTTP request to Supabase and return response with CORS and Location rewrite. */
async function proxyFetch(
  request: Request,
  env: Env,
  supabaseOrigin: string,
  proxyBaseUrl: string
): Promise<Response> {
  const upstreamUrl = buildUpstreamUrl(request, supabaseOrigin, proxyBaseUrl);
  const headers = forwardRequestHeaders(request, supabaseOrigin);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    init.body = request.body;
  }

  const res = await fetch(upstreamUrl, init);
  const body = await res.arrayBuffer();
  const outHeaders = forwardResponseHeaders(res, supabaseOrigin, proxyBaseUrl);
  const outResponse = new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: outHeaders,
  });
  return addCorsToResponse(outResponse, env, request);
}

/** WebSocket: Cloudflare Workers do not support outbound WebSocket, so we cannot
 *  proxy Realtime. Return 426 with a clear message; Realtime will need another path
 *  (e.g. use when not behind a block, or a proxy that supports outbound WS). */
function handleWebSocket(request: Request, env: Env): Response {
  const body = JSON.stringify({
    error: 'WebSocket proxy not supported',
    message:
      'Supabase Realtime (WebSocket) cannot be proxied through this Worker because Cloudflare Workers do not support outbound WebSocket. Use Realtime only when not behind a block, or use a different proxy (e.g. Durable Objects or a VPS).',
  });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  corsHeaders(env, request).forEach((v, k) => headers.set(k, v));
  return new Response(body, { status: 426, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxyBaseUrl = new URL(request.url).origin;

    // CORS preflight first — never depend on SUPABASE_ORIGIN so preflight never returns 500
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request),
      });
    }

    let supabaseOrigin: string;
    try {
      supabaseOrigin = getSupabaseOrigin(env);
    } catch (e) {
      return e instanceof Response ? e : new Response('Configuration error', { status: 500 });
    }

    // WebSocket: Workers don't support outbound WS, so we can't proxy Realtime.
    const upgrade = request.headers.get('Upgrade')?.toLowerCase();
    if (upgrade === 'websocket') {
      return handleWebSocket(request, env);
    }

    // Root path: Supabase returns "requested path is invalid"; return a friendly message instead
    const path = new URL(request.url).pathname;
    if (!path || path === '/') {
      const body = JSON.stringify({
        ok: true,
        message: 'Supabase proxy is running. Use paths like /auth/v1/..., /rest/v1/... from your app.',
      });
      const headers = new Headers({ 'Content-Type': 'application/json' });
      corsHeaders(env, request).forEach((v, k) => headers.set(k, v));
      return new Response(body, { status: 200, headers });
    }

    return proxyFetch(request, env, supabaseOrigin, proxyBaseUrl);
  },
};
