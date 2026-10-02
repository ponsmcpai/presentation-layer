// Server-owned priced resource: /api/merchant/r/<serviceId>?intent=pi_...
// Registry-priced, registry-owned merchant resources. Payment verifies the exact
// USDG transfer on-chain before the resource unlocks.
// @ts-nocheck — Cloudflare Pages supplies D1 runtime bindings.
import { json, publicIntent } from '../../../_lib/payment';

const PONS_V2_FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';

async function chainCall(env, to, data) {
  const alchemyKey = env.PONSMCP_ALCHEMY_KEY;
  const url = alchemyKey
    ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://rpc.nodeflare.app/robinhood/public';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 ponsmcp-web/1.0' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(6000),
  });
  const payload = await res.json();
  if (payload.error) throw new Error(payload.error.message);
  return payload.result;
}

// Content generators keyed by service id — each pulls real data, computed at
// unlock time, instead of returning a static placeholder string.
async function buildUnlockedContent(service, env) {
  if (service.id === 'svc_launchintel01') {
    try {
      const configCountHex = await chainCall(env, PONS_V2_FACTORY, '0xae72d871'); // launchConfigCount()
      const blockHex = await (await fetch(
        env.PONSMCP_ALCHEMY_KEY ? `https://robinhood-mainnet.g.alchemy.com/v2/${env.PONSMCP_ALCHEMY_KEY}` : 'https://rpc.nodeflare.app/robinhood/public',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 ponsmcp-web/1.0' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] }) }
      )).json();
      return {
        kind: 'live_chain_snapshot',
        factory: PONS_V2_FACTORY,
        launch_config_count: parseInt(configCountHex, 16),
        latest_block: parseInt(blockHex.result, 16),
        note: 'Computed live from Robinhood Chain at unlock time — not cached, not fabricated.',
      };
    } catch (e) {
      return { kind: 'live_chain_snapshot', error: `chain read failed: ${e.message}` };
    }
  }
  if (service.id === 'svc_sdkguide01') {
    return {
      kind: 'integration_guide',
      install: 'npm install -g @ponsmcp/sdk',
      quickstart: [
        'const client = new PonsMCPClient({ privateKey: process.env.PONSMCP_PRIVATE_KEY })',
        'const quote = await client.quote("5.00")',
        'const result = await client.pay({ payTo: "0x...", amountUsd: "5.00" })',
      ],
      policy_defaults: { per_tx_cap_usdg: 100, daily_cap_usdg: 1000 },
      docs: 'https://ponsmcp.com/docs',
    };
  }
  if (service.id === 'svc_devsandbox01') {
    return {
      kind: 'sandbox_receipt',
      message: 'Micro payment settled successfully — your payment rail works end to end.',
      what_this_proves: [
        'USDG transfer verified on Robinhood Chain (4663)',
        'Receipt matched: token, recipient, and exact amount',
        'Policy engine allowed a sub-cent settlement',
      ],
      next_step: 'Point your agent at any service in this catalog — the flow is identical at every price point.',
      docs: 'https://ponsmcp.com/docs',
    };
  }
  if (service.id === 'svc_signalfeed01') {
    try {
      const { results } = await env.ponsmcp_payments.prepare(
        'SELECT symbol, token_address, price_usd, market_cap_usd, ath_drawdown_pct, liquidity_usd, holders_total, source_type, signal_at FROM market_signals WHERE price_usd IS NOT NULL ORDER BY signal_at DESC LIMIT 10'
      ).all();
      return {
        kind: 'signal_digest',
        generated_at: new Date().toISOString(),
        top_signals: (results ?? []).map((r) => ({
          symbol: r.symbol, address: r.token_address,
          price_usd: r.price_usd, market_cap_usd: r.market_cap_usd,
          ath_drawdown_pct: r.ath_drawdown_pct, liquidity_usd: r.liquidity_usd,
          holders: r.holders_total, source: r.source_type, captured: r.signal_at,
        })),
        note: 'Latest notifier-captured Grade A signals. Data identical to the Live Signals tab.',
      };
    } catch (e) {
      return { kind: 'signal_digest', error: `digest failed: ${e.message}` };
    }
  }
  if (service.id === 'svc_stockscreen01') {
    try {
      const pairsRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=robinhood', { signal: AbortSignal.timeout(9000) });
      // Batch-read every stock token price via balanceOf-style calls is heavy; use DexScreener token endpoint in chunks.
      const { STOCK_TOKENS } = { STOCK_TOKENS: JSON.parse('{"AAPL":"0xaf3d76f1834a1d425780943c99ea8a608f8a93f9","AMD":"0x86923f96303d656e4aa86d9d42d1e57ad2023fdc","AMZN":"0x12f190a9f9d7d37a250758b26824b97ce941bf54","BE":"0x822cc93ffd030293e9842c30bbd678f530701867","COIN":"0x6330d8c3178a418788df01a47479c0ce7ccf450b","CRWV":"0x5f10a1c971b69e47e059e1dc91901b59b3fb49c3","GOOGL":"0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3","INTC":"0xc72b96e0e48ecd4dc75e1e45396e26300bc39681","META":"0xc0d6457c16cc70d6790dd43521c899c87ce02f35","MSFT":"0xe93237c50d904957cf27e7b1133b510c669c2e74","MU":"0xff080c8ce2e5feadaca0da81314ae59d232d4afd","NFLX":"0xe0444ef8bf4ed74f74fd73686e2ddf4c1c5591e8","NVDA":"0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec","ORCL":"0xb0992820e760d836549ba69bc7598b4af75dee03","PLTR":"0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a","SNDK":"0xb90a19ff0af67f7779aff50a882a9cff42446400","SPCX":"0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea","TSLA":"0x322f0929c4625ed5bad873c95208d54e1c003b2d","USAR":"0xd917b029c761d264c6a312bbbcda868658ef86a6"}') };
      const addrs = Object.values(STOCK_TOKENS);
      const out = [];
      for (let i = 0; i < addrs.length; i += 25) {
        const chunk = addrs.slice(i, i + 25).join(',');
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk}`, { signal: AbortSignal.timeout(9000) });
        const data = await res.json();
        for (const pair of (data.pairs ?? [])) {
          if (pair.chainId !== 'robinhood') continue;
          const base = pair.baseToken?.address?.toLowerCase();
          const sym = Object.entries(STOCK_TOKENS).find(([, a]) => a.toLowerCase() === base)?.[0];
          if (!sym) continue;
          const prev = out.find((o) => o.symbol === sym);
          if (!prev || (pair.liquidity?.usd ?? 0) > prev.liquidity_usd) {
            out.push({ symbol: sym, price_usd: pair.priceUsd ? Number(pair.priceUsd) : null, liquidity_usd: pair.liquidity?.usd ?? 0, change_24h_pct: pair.priceChange?.h24 ?? null, dex: pair.dexId });
          }
        }
      }
      out.sort((a, b) => b.liquidity_usd - a.liquidity_usd);
      return {
        kind: 'stock_screener_report',
        generated_at: new Date().toISOString(),
        universe: Object.keys(STOCK_TOKENS).length,
        ranked_by_liquidity: out,
        note: 'All 19 Robinhood Chain tokenized stocks, live-ranked by DEX liquidity at unlock time.',
      };
    } catch (e) {
      return { kind: 'stock_screener_report', error: `screener failed: ${e.message}` };
    }
  }
  return { kind: 'generic', content: `Receipt verified. Resource "${service.name}" is unlocked.` };
}

export async function onRequestGet({ request, params, env }) {
  const service = await env.ponsmcp_payments.prepare(
    'SELECT * FROM merchant_services WHERE id = ? AND active = 1'
  ).bind(params.serviceId).first();
  if (!service) return json({ error: 'Service not found' }, 404);
  const intentId = new URL(request.url).searchParams.get('intent');
  const row = intentId
    ? await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(intentId).first()
    : null;
  const matchesService = row && row.service_id === service.id;
  if (!matchesService || row.status !== 'paid') {
    return json({
      error: 'PAYMENT-REQUIRED',
      message: `This resource costs ${service.price_usdg_display} USDG to ${service.merchant_address}.`,
      service: { id: service.id, name: service.name, merchant: service.merchant_address, price_usdg: service.price_usdg_display },
      intent: row ? publicIntent(row) : null,
      create_intent: { amount_usdg: service.price_usdg_display, merchant_address: service.merchant_address, service_id: service.id },
      protocol: { name: 'PonsMCP Payment Intent', chain_id: 4663 },
    }, 402, { 'Payment-Required': 'true' });
  }
  const unlocked = await buildUnlockedContent(service, env);
  return json({
    data: {
      title: service.name,
      tx_hash: row.tx_hash,
      intent: publicIntent(row),
      ...unlocked,
    },
  });
}
