// Pages Function: DexScreener proxy with 30s edge cache (avoids client-side 429s).
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.
const PONS = '0x39dBED3a2bd333467115dE45665cC57F813C4571';

export async function onRequestGet() {
  const upstream = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${PONS}`, {
    headers: { 'User-Agent': 'ponsmcp-web/0.1' },
    cf: { cacheEverything: true, cacheTtl: 30 },
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
    },
  });
}
