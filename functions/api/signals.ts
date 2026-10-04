// Pages Function: market signals from the live notifier pipeline (Grade A / Early Watch).
// Returns latest signal per token, newest first. Sourced from /root/grade_a_signals.txt
// via scripts/parse_notifier_signals.py -> market_signals table.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.
import { rateLimit } from '../_lib/payment';

export async function onRequestGet({ request, env }) {
  // P2 FIX: DB read was unmetered — cap at 30 queries/min/IP (feed polls every 30s+).
  if (!await rateLimit(request, env, 'signals_read', 30)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded; retry in a minute' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
  const url = new URL(request.url);
  const source = url.searchParams.get('source'); // 'GRADE A' | 'EARLY WATCH' | null
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 60), 100);

  const where = source ? 'WHERE source_type = ?1' : '';
  const stmt = env.ponsmcp_payments.prepare(
    `SELECT * FROM market_signals ${where} ORDER BY (price_usd IS NULL) ASC, signal_at DESC LIMIT ?${source ? 2 : 1}`
  );
  const q = source ? stmt.bind(source, limit) : stmt.bind(limit);
  const { results } = await q.all();

  // Coerce numeric fields: D1 rows may contain '' or string numbers from the notifier parser.
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

  const signals = (results ?? []).map((r) => ({
    id: r.id,
    id: r.id,
    source: r.source_type,
    symbol: r.symbol,
    tokenAddress: r.token_address,
    priceUsd: num(r.price_usd),
    volume24hUsd: num(r.volume_24h_usd),
    marketCapUsd: num(r.market_cap_usd),
    athUsd: num(r.ath_usd),
    athDrawdownPct: num(r.ath_drawdown_pct),
    liquidityUsd: num(r.liquidity_usd),
    change5mPct: num(r.change_5m_pct),
    change1hPct: num(r.change_1h_pct),
    ageText: r.age_text,
    holdersTotal: num(r.holders_total),
    top10Pct: num(r.top10_pct),
    smartBuys: num(r.smart_buys),
    smartSells: num(r.smart_sells),
    smartNetUsd: num(r.smart_net_usd),
    clusterBuyWallets: r.cluster_buy_wallets,
    rugScore: num(r.rug_score),
    renounced: !!r.renounced,
    devHoldPct: num(r.dev_hold_pct),
    xHandle: r.x_handle,
    xFollowers: num(r.x_followers),
    narrative: r.narrative,
    signalAt: r.signal_at,
  }));

  return new Response(
    JSON.stringify({ count: signals.length, signals }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } },
  );
}
