// Types + helpers shared across the Mission Control components (split out of
// the former AppPage.tsx monolith). Pure data — no JSX here.

export const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
export const RH_EXPLORER = 'https://robinhoodchain.blockscout.com';

export async function rpc<T = string>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message ?? `RPC HTTP ${response.status}`);
  return data.result as T;
}

export const hexToBig = (hex: string) => BigInt(hex === '0x' || !hex ? '0x0' : hex);
export const addrOk = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

export type Quote = {
  id: string;
  merchant: string;
  amount: number;
  amountBase: string;
  createdAt: string;
  protectedResource: string | null;
  verifyEndpoint: string;
};

export type Live = { block: string; gas: string };
export type IntentRow = { id: string; status: 'pending' | 'paid' | 'failed'; payment: { amount_usdg: string; pay_to: string }; tx_hash: string | null; created_at: string };
export type Service = { id: string; merchant: string; name: string; resource_path: string; price_usdg: string; active: boolean };

// ── Market data for a token (used by analysis drawer) ───────────────────
export interface SignalRow {
  id: string; source: string; symbol: string; tokenAddress: string;
  priceUsd: number | null; volume24hUsd: number | null; marketCapUsd: number | null;
  athUsd: number | null; athDrawdownPct: number | null; liquidityUsd: number | null;
  change5mPct: number | null; change1hPct: number | null; ageText: string | null;
  holdersTotal: number | null; top10Pct: number | null;
  smartBuys: number | null; smartSells: number | null; smartNetUsd: number | null; clusterBuyWallets: number | null;
  rugScore: number | null; renounced: boolean; devHoldPct: number | null;
  xHandle: string | null; xFollowers: number | null; narrative: string | null; signalAt: string;
}

// ── Launch record (feed) ────────────────────────────────────────────────
export interface LaunchRow {
  name?: string; symbol?: string; token?: string; tier: string;
  priceUsd?: number | null; marketCapUsd?: number | null; liquidityUsd?: number | null;
  graduationProgressPct?: number | null; graduated?: boolean;
  launchedAt?: string | null; description?: string | null; logo?: string | null;
  deployer?: string | null; pool?: string | null; transactionHash?: string | null;
}

// ── Formatters ──────────────────────────────────────────────────────────
export function fmtUsd(v: number | null | undefined, digits = 2): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(digits)}`;
}
export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  // Trim to 4 significant decimals without scientific notation
  const s = v.toFixed(Math.min(10, Math.max(6, -Math.floor(Math.log10(v)) + 3)));
  return `$${s.replace(/0+$/, '').replace(/\.$/, '')}`;
}
export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
export function pctColor(v: number | null | undefined): string {
  if (v == null) return 'rgba(255,255,255,0.5)';
  return v >= 0 ? '#86efac' : '#fca5a5';
}

// ── Token icon: IPFS logo → gradient letter avatar (GMGN style) ────────
export function ipfsToHttp(uri?: string | null): string | null {
  if (!uri) return null;
  // Route through same-origin proxy — site CSP (img-src 'self') blocks direct
  // IPFS/pinata image loads, so /api/logo fetches server-side and caches.
  if (uri.startsWith('ipfs://')) return `/api/logo?url=${encodeURIComponent('https://flap.mypinata.cloud/ipfs/' + uri.slice(7))}`;
  if (uri.startsWith('https://')) return `/api/logo?url=${encodeURIComponent(uri)}`;
  return null;
}
