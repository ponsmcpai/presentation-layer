// Pages Function: pure bonding-curve buy/sell PREVIEW for a pons launch token.
// v2: pool address comes from the request (client already has it from /api/launches
// which includes pool). No feed lookup here — faster, no double fetch, no timeouts.
// Reserves: getReserves() for V2 pools, fallback to balanceOf reads for post-grad pools.
// Never broadcasts. Execution stays in the agent's MCP server.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

const RPCS = [
  'https://robinhood-mainnet.g.alchemy.com/v2/alch_wXyV1PsUL90Ki4-BYN1WP',
  'https://rpc.nodeflare.app/robinhood/public',
];

const WETH = '0x0bd7d308f8e1639fab988df18a8011f41eacad73';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of RPCS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'ponsmcp-web/1.0' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: AbortSignal.timeout(8_000),
        });
        if (res.status === 429) { await sleep(800); continue; }
        if (!res.ok) continue;
        const j = await res.json();
        if (j.error) continue; // contract revert etc — treat as missing data
        return j.result;
      } catch { /* next endpoint */ }
    }
  }
  throw new Error('all RPC endpoints failed');
}

function parseWei(hex) {
  const h = String(hex ?? '0x');
  if (h === '0x' || h.length < 3) return 0n;
  return BigInt(h);
}

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return j400('invalid json'); }
  const token = String(body.token ?? '');
  const pool = String(body.pool ?? '');
  const side = body.side === 'sell' ? 'sell' : 'buy';
  if (!/^0x[0-9a-fA-F]{40}$/.test(token)) return j400('invalid token address');
  if (!/^0x[0-9a-fA-F]{40}$/.test(pool)) return j400('pool address required (fetch from /api/launches)');
  if (side === 'buy' && !(Number(body.amount) > 0)) return j400('invalid amount');

  try {
    const poolLc = pool.toLowerCase();
    const [reservesRaw, token0Raw, wethBalRaw, tokenBalRaw] = await Promise.all([
      rpc('eth_call', [{ to: pool, data: '0x0902f1ac' }, 'latest']).catch(() => null), // getReserves() — V2 pools only
      rpc('eth_call', [{ to: pool, data: '0x0dfe1681' }, 'latest']), // token0()
      rpc('eth_call', [{ to: WETH, data: '0x70a08231' + poolLc.slice(2).toLowerCase().padStart(64, '0') }, 'latest']), // WETH.balanceOf(pool)
      rpc('eth_call', [{ to: token, data: '0x70a08231' + poolLc.slice(2).padStart(64, '0') }, 'latest']), // TOKEN.balanceOf(pool) — arg is the POOL address
    ]);
    let wethReserve, tokenReserve;
    const balPath = !reservesRaw || reservesRaw === '0x';
    if (!balPath) {
      const raw = String(reservesRaw).slice(2);
      const reserve0 = BigInt('0x' + raw.slice(0, 64));
      const reserve1 = BigInt('0x' + raw.slice(64, 128));
      const token0Addr = '0x' + String(token0Raw ?? '0x').slice(-40).toLowerCase();
      const wethIsToken0 = token0Addr === WETH;
      wethReserve = wethIsToken0 ? reserve0 : reserve1;
      tokenReserve = wethIsToken0 ? reserve1 : reserve0;
    } else {
      wethReserve = parseWei(wethBalRaw);
      tokenReserve = parseWei(tokenBalRaw);
    }
    if (wethReserve === 0n || tokenReserve === 0n) {
      // Diagnose which side is empty to make failures actionable.
      return j400(`pool reserves unavailable (path=${balPath ? 'balances' : 'getReserves'}, weth=${wethReserve}, token=${tokenReserve})`);
    }

    const FEE_NUM = 997n, FEE_DEN = 1000n;
    // Human amount -> wei without float: split on '.', pad fraction to 18.
    const [whole, frac = ''] = String(body.amount).replace(/[^0-9.]/g, '').split('.');
    const frac18 = frac.slice(0, 18).padEnd(18, '0');
    const amountWei = BigInt(whole || '0') * 10n ** 18n + BigInt(frac18 || '0');
    if (amountWei <= 0n) return j400('invalid amount');

    if (side === 'buy') {
      const inAfterFee = amountWei * FEE_NUM;
      const tokensOut = (inAfterFee * tokenReserve) / (wethReserve * FEE_DEN + inAfterFee);
      // Price impact of this trade
      const impactPct = Number(inAfterFee * 100n / (wethReserve * FEE_DEN + inAfterFee));
      return ok({ side, amountEth: String(body.amount), tokensOut: tokensOut.toString(), feeEth: (Number(amountWei) / 1e18 * 0.003).toFixed(6), priceImpactPct: Number(impactPct.toFixed(2)), pool });
    } else {
      const inAfterFee = amountWei * FEE_NUM;
      const ethOut = (inAfterFee * wethReserve) / (tokenReserve * FEE_DEN + inAfterFee);
      const impactPct = Number(inAfterFee * 100n / (tokenReserve * FEE_DEN + inAfterFee));
      return ok({ side, amountTokens: String(body.amount), quoteOut: ethOut.toString(), priceImpactPct: Number(impactPct.toFixed(2)), pool });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? 'quote failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}

function ok(payload) {
  return new Response(JSON.stringify({
    ...payload,
    preview: true,
    note: 'Preview only. Execution runs from your PonsMCP server with policy checks — the browser never signs.',
  }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function j400(msg) {
  return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
