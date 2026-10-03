// Pages Function: GeckoTerminal OHLCV chart proxy for any Robinhood Chain token.
// GeckoTerminal supports Robinhood Chain natively with OHLCV candle data — 
// far better than CoinGecko (which only has PONS). Works for any token with a DEX pair.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') ?? '').toLowerCase();
  const resolution = ['hour', 'day', 'minute'].includes(url.searchParams.get('res') ?? '') 
    ? url.searchParams.get('res') : 'hour';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 48), 200);

  if (!/^0x[0-9a-f]{40}$/.test(token)) {
    return json({ error: 'invalid token address' }, 400);
  }

  try {
    // Step 1: find the best pool for this token
    const poolsRes = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/${token}/pools?page=1`,
      { headers: { Accept: 'application/json', 'User-Agent': 'ponsmcp-web/1.0' }, signal: AbortSignal.timeout(8_000) }
    );
    if (!poolsRes.ok) return json({ error: `geckoterminal pools ${poolsRes.status}` }, 502);
    const poolsData = await poolsRes.json();
    const pools = poolsData?.data ?? [];
    if (!pools.length) return json({ error: 'no pools found' }, 404);

    // Pick pool with highest liquidity
    const best = pools.sort((a, b) => 
      Number(b.attributes?.reserve_in_usd ?? 0) - Number(a.attributes?.reserve_in_usd ?? 0)
    )[0];
    const poolAddr = best.id?.replace('robinhood_', '');
    const priceUsd = best.attributes?.base_token_price_usd ?? null;
    const liquidityUsd = best.attributes?.reserve_in_usd ?? null;

    // Step 2: fetch OHLCV candles
    const ohlcvRes = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/robinhood/pools/${poolAddr}/ohlcv/${resolution}?aggregate=1&limit=${limit}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'ponsmcp-web/1.0' }, signal: AbortSignal.timeout(8_000) }
    );
    if (!ohlcvRes.ok) return json({ error: `geckoterminal ohlcv ${ohlcvRes.status}` }, 502);
    const ohlcvData = await ohlcvRes.json();
    const candles = ohlcvData?.data?.attributes?.ohlcv_list ?? [];

    // candle format: [timestamp, open, high, low, close, volume]
    return new Response(JSON.stringify({
      token, pool: poolAddr, priceUsd, liquidityUsd,
      resolution, candles,
      source: 'GeckoTerminal',
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    return json({ error: e?.message ?? 'fetch failed' }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
