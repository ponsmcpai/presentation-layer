// Shared PonsMCP payment primitives for Pages Functions.
// @ts-nocheck — Cloudflare Pages supplies D1 runtime bindings.

export const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
export const CHAIN_ID = 4663;
// P2/P1 FIX: rpc.mainnet.chain.robinhood.com resolves to an ISP block page
// on some networks and hangs instead of refusing. Use Alchemy (from env) or nodeflare.
// NOTE: Pages Functions env is only accessible per-request; this module-level constant
// is a safe public fallback. For Alchemy, pass env.PONSMCP_ALCHEMY_KEY at call time.
export const RPC_URL = 'https://rpc.nodeflare.app/robinhood/public';
const RPC_FALLBACK = 'https://lb.routeme.sh/rpc/evm/4663';

// Build RPC URL list given an optional Cloudflare env binding.
export function getRpcUrls(env?: { PONSMCP_ALCHEMY_KEY?: string }): string[] {
  const key = env?.PONSMCP_ALCHEMY_KEY;
  return [
    ...(key ? [`https://robinhood-mainnet.g.alchemy.com/v2/${key}`] : []),
    RPC_URL,
    RPC_FALLBACK,
  ];
}
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const addressOk = (value) => /^0x[0-9a-fA-F]{40}$/.test(value ?? '');
export const hashOk = (value) => /^0x[0-9a-fA-F]{64}$/.test(value ?? '');

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export async function readJson(request, maxBytes = 4096) {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('Request body too large');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error('Request body too large');
  try { return JSON.parse(raw); } catch { throw new Error('Malformed JSON body'); }
}

export async function rateLimit(request, env, bucket, limit = 15) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000;
  const row = await env.ponsmcp_payments.prepare(
    'INSERT INTO api_rate_limits (bucket, client_ip, window_start, request_count) VALUES (?, ?, ?, 1) ON CONFLICT(bucket, client_ip, window_start) DO UPDATE SET request_count = request_count + 1 RETURNING request_count'
  ).bind(bucket, ip, windowStart).first();
  return Number(row?.request_count ?? 1) <= limit;
}

export function amountToMicro(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('amount_usdg must be a decimal string');
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,6})?$/.test(text)) throw new Error('amount_usdg supports up to 6 decimal places');
  const [whole, fraction = ''] = text.split('.');
  const micro = BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
  if (micro <= 0n || micro > 100_000_000n) throw new Error('amount_usdg must be > 0 and <= 100');
  return { micro, display: `${whole}.${(fraction + '000000').slice(0, 6)}` };
}

export async function rpc(method, params, env?: { PONSMCP_ALCHEMY_KEY?: string }) {
  let last;
  const urls = getRpcUrls(env);
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'ponsmcp-payments/0.1' },
          body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
          signal: AbortSignal.timeout(8_000), // P2 FIX: was missing — prevents indefinite hang on blocked URL
        });
        if (response.ok) {
          const data = await response.json();
          if (data.error) throw new Error(data.error.message ?? 'RPC error');
          return data.result;
        }
        last = response.status;
        if (response.status === 429) { await new Promise(r => setTimeout(r, 600)); continue; }
        break; // non-retryable HTTP error — try next URL
      } catch (e: any) {
        last = e?.message ?? 'fetch failed';
        break; // network error — try next URL
      }
    }
  }
  throw new Error(`RPC unavailable: tried ${urls.length} endpoints, last error: ${last ?? 'unknown'}`);
}

export function verifiedUsdGTransfer(receipt, merchantAddress, amountBase) {
  if (!receipt || receipt.status !== '0x1') return false;
  const merchant = merchantAddress.toLowerCase().replace(/^0x/, '');
  const expected = BigInt(amountBase);
  return (receipt.logs ?? []).some((log) => {
    if (log.address?.toLowerCase() !== USDG.toLowerCase()) return false;
    if (log.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC || log.topics.length < 3) return false;
    const recipient = log.topics[2].slice(-40).toLowerCase();
    const value = BigInt(log.data === '0x' ? '0x0' : log.data);
    return recipient === merchant && value === expected;
  });
}

export function publicIntent(row) {
  return {
    id: row.id,
    status: row.status,
    service_id: row.service_id ?? null,
    payment: {
      network: 'robinhood',
      chain_id: CHAIN_ID,
      asset: 'USDG',
      asset_address: USDG,
      amount_usdg: row.amount_usdg_display,
      amount_base: row.amount_usdg_base,
      pay_to: row.merchant_address,
    },
    tx_hash: row.tx_hash ?? null,
    created_at: row.created_at,
    verified_at: row.verified_at ?? null,
  };
}
