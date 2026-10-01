// Pages Function: strict read-only Robinhood Chain RPC proxy (same-origin, avoids CORS issues).
// Only whitelisted read methods are forwarded. No signing/broadcast methods pass through.
// Retries on 429/5xx with short backoff; rate-limited per IP per minute.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.
const UPSTREAM = 'https://rpc.mainnet.chain.robinhood.com';
const ALLOWED_METHODS = new Set([
  'eth_blockNumber', 'eth_chainId', 'eth_gasPrice', 'eth_getBalance',
  'eth_getTransactionReceipt', 'eth_getTransactionCount', 'eth_call',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000;
  const row = await env.ponsmcp_payments.prepare(
    'INSERT INTO api_rate_limits (bucket, client_ip, window_start, request_count) VALUES (?, ?, ?, 1) ON CONFLICT(bucket, client_ip, window_start) DO UPDATE SET request_count = request_count + 1 RETURNING request_count'
  ).bind('rpc_proxy', ip, windowStart).first();
  if (Number(row?.request_count ?? 1) > 60) {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'rate limit exceeded' } }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }
  const body = await request.text();
  if (body.length > 8192) {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'request too large' } }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid json' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const method = String(parsed?.method ?? '');
  if (!ALLOWED_METHODS.has(method)) {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: parsed?.id ?? null, error: { code: -32601, message: `method not allowed: ${method || '(empty)'}` } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ponsmcp-web/0.1' },
      body: JSON.stringify({ jsonrpc: '2.0', id: parsed.id ?? 1, method, params: parsed.params ?? [] }),
    });
    if (res.ok) {
      return new Response(res.body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    last = res;
    if (res.status === 429 || res.status >= 500) { await sleep(700 * (attempt + 1)); continue; }
    break;
  }
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: parsed?.id ?? null, error: { code: -32000, message: `upstream ${last?.status ?? 'error'}` } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
}
