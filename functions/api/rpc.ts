// Pages Function: proxy Robinhood Chain RPC (same-origin, avoids CORS/browser-block issues).
// Retries on 429/5xx with short backoff so browser boots survive rate limits.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.
const UPSTREAM = 'https://rpc.mainnet.chain.robinhood.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function onRequestPost({ request }) {
  const body = await request.text();
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ponsmcp-web/0.1' },
      body,
    });
    if (res.ok) {
      return new Response(res.body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    last = res;
    if (res.status === 429 || res.status >= 500) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    break;
  }
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: `upstream ${last?.status ?? 'error'}` } }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  });
}
