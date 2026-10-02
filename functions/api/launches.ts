// Pages Function: pons launch intelligence for the web console.
// Fetches the official launch feed (with mirror fallback, same as the SDK),
// applies the Grade A / Early Watch screening, returns ranked JSON.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.
const FEED_URL = 'https://www.ponsfamily.com/api/pons-launches';
const MIRROR = 'https://r.jina.ai/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchFeed() {
  const attempts = [`${FEED_URL}?limit=50`, `${MIRROR}${FEED_URL}?limit=50`];
  let lastError;
  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ponsmcp-web/1.0' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue; }
      const text = await res.text();
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { /* fall through */ }
      }
      return JSON.parse(text);
    } catch (e) { lastError = e; }
  }
  throw lastError instanceof Error ? lastError : new Error('feed unreachable');
}

function screen(l) {
  const liq = Number(l.liquidityUsd ?? 0);
  const grad = l.graduated ? 100 : Number(l.graduationProgressPct ?? 0);
  const change = null; // feed does not expose 24h change directly
  const gradeA = liq > 500 && grad > 5 && (change === null || change > -50);
  const earlyWatch = liq > 0 && grad < 10;
  const tier = grad >= 100 || l.graduated ? 'Graduated' : gradeA ? 'Grade A' : earlyWatch ? 'Early Watch' : liq > 0 ? 'Watch' : 'Low Signal';
  return { tier, grad, liq };
}

export async function onRequestGet() {
  let launches;
  try {
    launches = await fetchFeed();
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
  const ranked = launches.map((l) => {
    const { tier, grad, liq } = screen(l);
    return {
      name: l.name, symbol: l.symbol, token: l.token,
      priceUsd: l.priceUsd ?? null,
      marketCapUsd: l.marketCapUsd ?? null,
      liquidityUsd: l.liquidityUsd ?? null,
      graduationProgressPct: l.graduationProgressPct,
      graduated: !!l.graduated,
      launchedAt: l.launchedAt ?? null,
      tier,
      _sortGrad: grad,
      _sortLiq: liq,
    };
  }).sort((a, b) => b._sortGrad - a._sortGrad || b._sortLiq - a._sortLiq);

  const summary = {};
  for (const r of ranked) summary[r.tier] = (summary[r.tier] ?? 0) + 1;

  return new Response(
    JSON.stringify({ total: ranked.length, summary, launches: ranked }, null, 0),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } },
  );
}
