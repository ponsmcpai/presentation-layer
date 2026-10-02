// Pages Function: same-origin proxy for DexScreener price of $MCP.
// The site's CSP sets connect-src 'self', so the browser cannot call the DexScreener
// API directly — this function fetches server-side and returns just the fields the
// console needs. Cached 30s to stay well under DexScreener's rate limits.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

const MCP_CA = '0x15da2596F4C21227185466066Bf0f19d9D526B8a';

export async function onRequestGet() {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MCP_CA}`, {
      headers: { 'User-Agent': 'ponsmcp-web/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return new Response(JSON.stringify({ error: `upstream ${res.status}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    const pair = (data.pairs ?? [])
      .filter((p) => p.chainId === 'robinhood')
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (!pair) return new Response(JSON.stringify({ error: 'no pairs' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({
      priceUsd: pair.priceUsd ?? null,
      change24h: pair.priceChange?.h24 ?? null,
      liquidityUsd: pair.liquidity?.usd ?? null,
      volume24h: pair.volume?.h24 ?? null,
      marketCap: pair.marketCap ?? null,
      pairUrl: pair.url ?? null,
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? 'fetch failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
