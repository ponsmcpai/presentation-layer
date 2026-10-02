// Pages Function: market signals from the live notifier pipeline (Grade A / Early Watch).
// Returns latest signal per token, newest first. Sourced from /root/grade_a_signals.txt
// via scripts/parse_notifier_signals.py -> market_signals table.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const source = url.searchParams.get('source'); // 'GRADE A' | 'EARLY WATCH' | null
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 60), 100);

  const where = source ? 'WHERE source_type = ?1' : '';
  const stmt = env.ponsmcp_payments.prepare(
    `SELECT * FROM market_signals ${where} ORDER BY (price_usd IS NULL) ASC, signal_at DESC LIMIT ?${source ? 2 : 1}`
  );
  const q = source ? stmt.bind(source, limit) : stmt.bind(limit);
  const { results } = await q.all();

  const signals = (results ?? []).map((r) => ({
    id: r.id,
    source: r.source_type,
    symbol: r.symbol,
    tokenAddress: r.token_address,
    priceUsd: r.price_usd,
    volume24hUsd: r.volume_24h_usd,
    marketCapUsd: r.market_cap_usd,
    athUsd: r.ath_usd,
    athDrawdownPct: r.ath_drawdown_pct,
    liquidityUsd: r.liquidity_usd,
    change5mPct: r.change_5m_pct,
    change1hPct: r.change_1h_pct,
    ageText: r.age_text,
    holdersTotal: r.holders_total,
    top10Pct: r.top10_pct,
    smartBuys: r.smart_buys,
    smartSells: r.smart_sells,
    smartNetUsd: r.smart_net_usd,
    clusterBuyWallets: r.cluster_buy_wallets,
    rugScore: r.rug_score,
    renounced: !!r.renounced,
    devHoldPct: r.dev_hold_pct,
    xHandle: r.x_handle,
    xFollowers: r.x_followers,
    narrative: r.narrative,
    signalAt: r.signal_at,
  }));

  return new Response(
    JSON.stringify({ count: signals.length, signals }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } },
  );
}
