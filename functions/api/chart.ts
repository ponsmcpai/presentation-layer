// Pages Function: CoinGecko market-chart proxy for PONS (same-origin for CSP).
// The console's CSP sets connect-src 'self', so all external chart data must
// flow through /api/*. Cached 120s — CoinGecko free tier allows this comfortably.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const coin = (url.searchParams.get('coin') ?? 'pons').replace(/[^a-z0-9-]/gi, '');
  const days = ['1', '7', '30'].includes(url.searchParams.get('days') ?? '') ? url.searchParams.get('days') : '1';

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}`,
      { headers: { 'User-Agent': 'ponsmcp-web/1.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(12_000) },
    );
    if (!res.ok) return new Response(JSON.stringify({ error: `upstream ${res.status}` }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    return new Response(
      JSON.stringify({ prices: data.prices ?? [] }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? 'fetch failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
