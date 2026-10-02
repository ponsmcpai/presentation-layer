import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Boxes, Check, CheckCircle2, CircleDollarSign, Copy,
  ExternalLink, FileCheck2, Gauge, Loader2, Menu, Network, Receipt, RefreshCw,
  Settings, ShieldCheck, X,
} from 'lucide-react';

const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const RH_EXPLORER = 'https://robinhoodchain.blockscout.com';

async function rpc<T = string>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message ?? `RPC HTTP ${response.status}`);
  return data.result as T;
}

const hexToBig = (hex: string) => BigInt(hex === '0x' || !hex ? '0x0' : hex);
const addrOk = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

type Quote = {
  id: string;
  merchant: string;
  amount: number;
  amountBase: string;
  createdAt: string;
  protectedResource: string | null;
  verifyEndpoint: string;
};

type Live = { block: string; gas: string };
type IntentRow = { id: string; status: 'pending' | 'paid' | 'failed'; payment: { amount_usdg: string; pay_to: string }; tx_hash: string | null; created_at: string };
type Service = { id: string; merchant: string; name: string; resource_path: string; price_usdg: string; active: boolean };

const NAV = [
  { group: 'PAYMENTS', items: [
    { key: 'New payment', icon: CircleDollarSign },
    { key: 'Receipts', icon: FileCheck2 },
    { key: 'Activity', icon: Receipt },
  ] },
  { group: 'INTELLIGENCE', items: [
    { key: 'Chain status', icon: Activity },
    { key: 'Services', icon: Boxes },
  ] },
  { group: 'CAPABILITIES', items: [
    { key: 'MCP tools', icon: Boxes },
    { key: 'Launch intel', icon: Activity },
  ] },
  { group: 'DEVELOPER', items: [
    { key: 'Integration', icon: Network },
    { key: 'Policy', icon: Gauge },
    { key: 'Settings', icon: Settings },
  ] },
] as const;

type Tab = (typeof NAV)[number]['items'][number]['key'];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-md p-1.5 transition-colors hover:bg-white/10"
      style={{ color: 'rgba(255,255,255,0.45)' }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Step({ number, title, active, done }: { number: number; title: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex size-6 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: done ? 'rgba(74,222,128,0.2)' : active ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${done ? 'rgba(74,222,128,0.45)' : active ? 'rgba(254,215,170,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: done ? '#4ade80' : active ? '#fed7aa' : 'rgba(255,255,255,0.4)',
        }}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span className="text-xs font-semibold" style={{ color: active || done ? 'white' : 'rgba(255,255,255,0.4)' }}>{title}</span>
    </div>
  );
}

function Card({ title, subtitle, children, accent, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <section className={`h-full overflow-hidden rounded-2xl ${className}`} style={{ background: 'rgba(16,16,16,0.62)', border: `1px solid ${accent ? 'rgba(249,115,22,0.32)' : 'rgba(255,255,255,0.1)'}` }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Shared tiny SVG sparkline (no deps) ────────────────────────────────
function Sparkline({ points, width = 260, height = 64, color = '#f97316' }: { points: [number, number][]; width?: number; height?: number; color?: string }) {
  if (!points || points.length < 2) return <div style={{ height }} />;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const d = points.map((p, i) => {
    const x = ((p[0] - minX) / (maxX - minX || 1)) * width;
    const y = height - ((p[1] - minY) / spanY) * height;
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// ── Token icon: IPFS logo → gradient letter avatar (GMGN style) ────────
function ipfsToHttp(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith('https://')) return uri;
  return null;
}
function TokenIcon({ src, symbol, size = 36 }: { src?: string | null; symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  const letter = (symbol || '?').slice(0, 1).toUpperCase();
  const hue = [...(symbol || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (!src || err) {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))` }}>
        {letter}
      </div>
    );
  }
  return <img src={src} alt={symbol} width={size} height={size} onError={() => setErr(true)} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
}

// ── Market data for a token (used by analysis drawer) ───────────────────
interface SignalRow {
  id: string; source: string; symbol: string; tokenAddress: string;
  priceUsd: number | null; volume24hUsd: number | null; marketCapUsd: number | null;
  athUsd: number | null; athDrawdownPct: number | null; liquidityUsd: number | null;
  change5mPct: number | null; change1hPct: number | null; ageText: string | null;
  holdersTotal: number | null; top10Pct: number | null;
  smartBuys: number | null; smartSells: number | null; smartNetUsd: number | null; clusterBuyWallets: number | null;
  rugScore: number | null; renounced: boolean; devHoldPct: number | null;
  xHandle: string | null; xFollowers: number | null; narrative: string | null; signalAt: string;
}

function fmtUsd(v: number | null | undefined, digits = 2): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(digits)}`;
}
function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  // Trim to 4 significant decimals without scientific notation
  const s = v.toFixed(Math.min(10, Math.max(6, -Math.floor(Math.log10(v)) + 3)));
  return `$${s.replace(/0+$/, '').replace(/\.$/, '')}`;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
function pctColor(v: number | null | undefined): string {
  if (v == null) return 'rgba(255,255,255,0.5)';
  return v >= 0 ? '#86efac' : '#fca5a5';
}

// ── Launch record (feed) ────────────────────────────────────────────────
interface LaunchRow {
  name?: string; symbol?: string; token?: string; tier: string;
  priceUsd?: number | null; marketCapUsd?: number | null; liquidityUsd?: number | null;
  graduationProgressPct?: number | null; graduated?: boolean;
  launchedAt?: string | null; description?: string | null; logo?: string | null;
  deployer?: string | null; pool?: string | null; transactionHash?: string | null;
}

// ── Buy/sell preview (pure math via curve inputs) ───────────────────────
function TradePreview({ launch, onClose }: { launch: LaunchRow; onClose: () => void }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('0.1');
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<{ tokensOut?: string | null; quoteOut?: string | null; feeEth?: string | null; priceImpactPct?: number | null; error?: string } | null>(null);

  const runQuote = async () => {
    setBusy(true); setQuote(null);
    try {
      // Real quote path: server-side curve math using live pair reserves is the
      // MCP server's job; the browser shows the plan and hands off execution.
      const res = await fetch('/api/launch-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: launch.token, pool: launch.pool, side, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'preview failed');
      setQuote(data);
    } catch (e: any) {
      setQuote({ error: e?.message ?? 'preview failed' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5" style={{ background: '#141414', border: '1px solid rgba(249,115,22,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <TokenIcon src={ipfsToHttp(launch.logo)} symbol={launch.symbol ?? '?'} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{launch.name ?? launch.symbol}</p>
            <p className="font-mono text-[10px] text-white/35">{launch.token?.slice(0, 16)}…</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-white/40 hover:text-white">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
          {(['buy', 'sell'] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} className="rounded-lg py-2 text-xs font-bold uppercase tracking-wide" style={side === s ? (s === 'buy' ? { background: 'rgba(74,222,128,0.15)', color: '#86efac' } : { background: 'rgba(248,113,113,0.15)', color: '#fca5a5' }) : {}}>{s}</button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-lg text-white outline-none" placeholder="0.0" />
          <span className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fdba74' }}>{side === 'buy' ? 'ETH' : (launch.symbol ?? 'TOKEN')}</span>
        </div>

        <button onClick={() => void runQuote()} disabled={busy} className="btn-primary mt-3 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50">
          {busy ? 'Quoting curve…' : `Preview ${side}`}
        </button>

        {quote?.error && (
          <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)' }}>{quote.error}</p>
        )}
        {quote && !quote.error && (
          <div className="mt-3 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {side === 'buy' ? (
              <>
                <Row k="You receive" v={`${quote.tokensOut ? (Number(BigInt(quote.tokensOut)) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'} ${launch.symbol ?? ''}`} accent />
                <Row k="LP fee (0.3%)" v={`${quote.feeEth ?? '—'} ETH`} />
                <Row k="Price impact" v={quote.priceImpactPct != null ? `${quote.priceImpactPct.toFixed(2)}%` : '—'} color={quote.priceImpactPct != null && quote.priceImpactPct > 5 ? '#fca5a5' : '#86efac'} />
              </>
            ) : (
              <>
                <Row k="You receive" v={`${quote.quoteOut ? (Number(BigInt(quote.quoteOut)) / 1e18).toFixed(6) : '—'} ETH`} accent />
                <Row k="Price impact" v={quote.priceImpactPct != null ? `${quote.priceImpactPct.toFixed(2)}%` : '—'} color={quote.priceImpactPct != null && quote.priceImpactPct > 5 ? '#fca5a5' : '#86efac'} />
              </>
            )}
            <div className="mt-3 flex items-start gap-2 rounded-lg p-3" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
              <p className="text-[11px] leading-relaxed text-white/60">This is a <b className="text-white">preview</b>. Execution happens from your PonsMCP server with policy checks — this browser never signs. The curve quote is computed live, slippage applies at execution.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, accent, color }: { k: string; v: string; accent?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-white/40">{k}</span>
      <span className="font-mono font-bold" style={{ color: color ?? (accent ? '#fdba74' : 'rgba(255,255,255,0.85)') }}>{v}</span>
    </div>
  );
}

// ── Analysis drawer for a signal token (GMGN-style breakdown) ───────────
function SignalDrawer({ signal, onClose }: { signal: SignalRow; onClose: () => void }) {
  const [chart, setChart] = useState<[number, number][] | null>(null);
  const [chartErr, setChartErr] = useState(false);
  const [chartRange, setChartRange] = useState<'1' | '7' | '30'>('1');

  useEffect(() => {
    let alive = true;
    setChart(null); setChartErr(false);
    (async () => {
      try {
        const res = await fetch(`/api/chart?coin=pons&days=${chartRange}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (alive) setChart((data.prices ?? []).map((p: [number, number]) => [p[0], p[1]] as [number, number]));
      } catch { if (alive) setChartErr(true); }
    })();
    return () => { alive = false; };
  }, [chartRange]);

  const first = chart?.[0]?.[1] ?? 0;
  const last = chart?.[chart.length - 1]?.[1] ?? 0;
  const up = last >= first;
  const riskFlags: string[] = [];
  if (signal.top10Pct != null && signal.top10Pct > 70) riskFlags.push(`Top 10 holders control ${signal.top10Pct.toFixed(0)}% of supply`);
  if (signal.rugScore != null && signal.rugScore > 50) riskFlags.push(`Rug risk score ${signal.rugScore.toFixed(0)}/100`);
  if (signal.renounced === false) riskFlags.push('Ownership not renounced');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ background: '#141414', border: '1px solid rgba(249,115,22,0.25)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <TokenIcon symbol={signal.symbol} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-white">{signal.symbol}</p>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold" style={{ background: signal.source === 'GRADE A' ? 'rgba(249,115,22,0.14)' : 'rgba(96,165,250,0.12)', color: signal.source === 'GRADE A' ? '#fdba74' : '#93c5fd' }}>{signal.source}</span>
            </div>
            <p className="font-mono text-[10px] text-white/35">{signal.tokenAddress.slice(0, 12)}…{signal.tokenAddress.slice(-6)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-white/40 hover:text-white">✕</button>
        </div>

        <div className="space-y-4 p-5">
          {/* Chart */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-white/70">PONS reference chart · CoinGecko</p>
              <div className="flex gap-1">
                {(['1', '7', '30'] as const).map((d) => (
                  <button key={d} onClick={() => setChartRange(d)} className="rounded px-2 py-0.5 font-mono text-[10px]" style={chartRange === d ? { background: 'rgba(249,115,22,0.2)', color: '#fdba74' } : { color: 'rgba(255,255,255,0.35)' }}>{d}D</button>
                ))}
              </div>
            </div>
            {chartErr && <p className="py-6 text-center text-xs text-white/30">Chart unavailable right now</p>}
            {!chartErr && !chart && <div className="py-8 text-center font-mono text-xs text-white/30">Loading chart…</div>}
            {chart && chart.length > 2 && (
              <>
                <Sparkline points={chart} width={420} height={90} color={up ? '#4ade80' : '#f87171'} />
                <div className="mt-1 flex justify-between font-mono text-[10px]" style={{ color: pctColor(last - first) }}>
                  <span>{fmtPrice(first)}</span>
                  <span>{up ? '▲' : '▼'} {fmtPct(first ? ((last - first) / first) * 100 : 0)}</span>
                  <span>{fmtPrice(last)}</span>
                </div>
              </>
            )}
          </div>

          {/* Market */}
          <Section title="MARKET">
            <Grid>
              <Cell k="Price" v={fmtPrice(signal.priceUsd)} accent />
              <Cell k="Market cap" v={fmtUsd(signal.marketCapUsd)} />
              <Cell k="ATH" v={signal.athUsd != null ? `${fmtUsd(signal.athUsd)} (${fmtPct(signal.athDrawdownPct)})` : '—'} />
              <Cell k="Liquidity" v={fmtUsd(signal.liquidityUsd)} />
              <Cell k="24h volume" v={fmtUsd(signal.volume24hUsd)} />
              <Cell k="Age" v={signal.ageText ?? '—'} />
              <Cell k="1h change" v={fmtPct(signal.change1hPct)} color={pctColor(signal.change1hPct)} />
              <Cell k="5m change" v={fmtPct(signal.change5mPct)} color={pctColor(signal.change5mPct)} />
            </Grid>
          </Section>

          {/* Holders */}
          <Section title="HOLDERS">
            <Grid>
              <Cell k="Total holders" v={signal.holdersTotal?.toLocaleString() ?? '—'} />
              <Cell k="Top 10 share" v={signal.top10Pct != null ? `${signal.top10Pct.toFixed(0)}%${signal.top10Pct > 70 ? ' ⚠️' : ''}` : '—'} color={signal.top10Pct != null && signal.top10Pct > 70 ? '#fca5a5' : undefined} />
              <Cell k="Dev holding" v={signal.devHoldPct != null ? `${signal.devHoldPct.toFixed(0)}%` : '—'} />
            </Grid>
          </Section>

          {/* Smart money */}
          {(signal.smartBuys != null || signal.clusterBuyWallets != null) && (
            <Section title="SMART MONEY">
              <Grid>
                <Cell k="Buys / sells" v={signal.smartBuys != null ? `🟢 ${signal.smartBuys} / 🔴 ${signal.smartSells ?? 0}` : '—'} />
                <Cell k="Net flow" v={signal.smartNetUsd != null ? `${signal.smartNetUsd >= 0 ? '+' : ''}${fmtUsd(signal.smartNetUsd)}` : '—'} color={pctColor(signal.smartNetUsd)} />
                <Cell k="Buy cluster" v={signal.clusterBuyWallets != null ? `${signal.clusterBuyWallets} wallets` : '—'} />
              </Grid>
            </Section>
          )}

          {/* Risk */}
          <Section title="RISK">
            <Grid>
              <Cell k="Rug score" v={signal.rugScore != null ? `${signal.rugScore.toFixed(0)}/100` : '—'} color={signal.rugScore != null && signal.rugScore > 50 ? '#fca5a5' : '#86efac'} />
              <Cell k="Renounced" v={signal.renounced ? '✅ Yes' : '❌ No'} color={signal.renounced ? '#86efac' : '#fca5a5'} />
            </Grid>
            {riskFlags.map((f) => (
              <p key={f} className="mt-2 rounded-lg px-3 py-2 text-[11px]" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.07)' }}>⚠ {f}</p>
            ))}
          </Section>

          {/* Social + narrative */}
          {(signal.xHandle || signal.narrative) && (
            <Section title="CONTEXT">
              {signal.xHandle && (
                <p className="text-xs text-white/55">X: <a href={`https://x.com/${signal.xHandle}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#f97316]">@{signal.xHandle}</a>{signal.xFollowers != null ? ` · ${signal.xFollowers.toLocaleString()} followers` : ''}</p>
              )}
              {signal.narrative && <p className="mt-1 text-xs italic text-white/45">“{signal.narrative}”</p>}
            </Section>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={`https://robinhoodchain.blockscout.com/token/${signal.tokenAddress}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">
              Blockscout <ExternalLink className="h-3 w-3" />
            </a>
            <a href={`https://dexscreener.com/robinhood/${signal.tokenAddress}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">
              DexScreener <ExternalLink className="h-3 w-3" />
            </a>
            <button onClick={() => { navigator.clipboard?.writeText(signal.tokenAddress); }} className="btn-secondary rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">Copy CA</button>
          </div>
          <p className="font-mono text-[9px] text-white/25">Signal captured {signal.signalAt} · via live notifier pipeline</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fdba74]">{title}</p>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>{children}</div>;
}
function Cell({ k, v, color, accent }: { k: string; v: string; color?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11px] text-white/40">{k}</span>
      <span className="font-mono text-xs font-bold" style={{ color: color ?? (accent ? '#fdba74' : 'rgba(255,255,255,0.85)') }}>{v}</span>
    </div>
  );
}

// ── Main Market Intel panel ─────────────────────────────────────────────
function LaunchIntelPanel() {
  const [subTab, setSubTab] = useState<'signals' | 'launches'>('signals');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'GRADE A' | 'EARLY WATCH'>('ALL');
  const [signals, setSignals] = useState<SignalRow[] | null>(null);
  const [signalsErr, setSignalsErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState<{ total: number; summary: Record<string, number>; launches: LaunchRow[] } | null>(null);
  const [launchesErr, setLaunchesErr] = useState('');
  const [launchesLoading, setLaunchesLoading] = useState(true);
  const [selected, setSelected] = useState<SignalRow | null>(null);
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchRow | null>(null);
  const [tradeLaunch, setTradeLaunch] = useState<LaunchRow | null>(null);

  const loadSignals = useCallback(async () => {
    setLoading(true); setSignalsErr('');
    try {
      const q = sourceFilter === 'ALL' ? '' : `&source=${encodeURIComponent(sourceFilter)}`;
      const res = await fetch(`/api/signals?limit=60${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setSignals(data.signals);
    } catch (e: any) { setSignalsErr(e?.message ?? 'Could not load signals'); }
    finally { setLoading(false); }
  }, [sourceFilter]);

  const loadLaunches = useCallback(async () => {
    setLaunchesLoading(true); setLaunchesErr('');
    try {
      const res = await fetch('/api/launches');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setLaunches(data);
    } catch (e: any) { setLaunchesErr(e?.message ?? 'Could not load launches'); }
    finally { setLaunchesLoading(false); }
  }, []);

  useEffect(() => { if (subTab === 'signals') void loadSignals(); }, [subTab, loadSignals]);
  useEffect(() => { if (subTab === 'launches') void loadLaunches(); }, [subTab, loadLaunches]);

  const tierColor = (tier: string) =>
    tier === 'Graduated' ? { bg: 'rgba(74,222,128,0.12)', fg: '#86efac' }
    : tier === 'Grade A' ? { bg: 'rgba(249,115,22,0.14)', fg: '#fdba74' }
    : tier === 'Early Watch' ? { bg: 'rgba(96,165,250,0.12)', fg: '#93c5fd' }
    : { bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.4)' };

  return (
    <div className="grid gap-5">
      {/* Sub tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'rgba(16,16,16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {(['signals', 'launches'] as const).map((s) => (
          <button key={s} onClick={() => setSubTab(s)} className="rounded-lg py-2 text-xs font-bold uppercase tracking-wide" style={subTab === s ? { background: 'rgba(249,115,22,0.18)', color: '#fdba74' } : { color: 'rgba(255,255,255,0.4)' }}>
            {s === 'signals' ? 'Live signals' : 'Launch feed'}
          </button>
        ))}
      </div>

      {/* ============ SIGNALS ============ */}
      {subTab === 'signals' && (
        <Card title="Market intelligence" subtitle="Live Grade A / Early Watch signals from the always-on notifier pipeline — click any row for full analysis.">
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {(['ALL', 'GRADE A', 'EARLY WATCH'] as const).map((f) => (
                <button key={f} onClick={() => setSourceFilter(f)} className="rounded-full px-3 py-1 font-mono text-[11px] font-bold" style={sourceFilter === f ? { background: 'rgba(249,115,22,0.2)', color: '#fdba74' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{f}</button>
              ))}
              <button onClick={() => void loadSignals()} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white"><RefreshCw className="h-3 w-3" /> Refresh</button>
            </div>

            {loading && <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10"><div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" /></div>}
            {signalsErr && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {signalsErr} <button onClick={() => void loadSignals()} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button>
              </div>
            )}
            {signals && signals.length === 0 && <p className="py-6 text-center text-sm text-white/35">No signals captured yet for this filter.</p>}
            {signals && signals.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="hidden grid-cols-[2.2fr_1fr_0.9fr_1fr_1.1fr_auto] items-center gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-white/30 sm:grid" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
                  <span>Token</span><span className="text-right">MC</span><span className="text-right">ATH dd</span><span className="text-right">Liq</span><span className="text-right">Holders</span><span>Signal</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {signals.map((s) => (
                    <button key={s.id} onClick={() => setSelected(s)} className="grid w-full grid-cols-2 items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] sm:grid-cols-[2.2fr_1fr_0.9fr_1fr_1.1fr_auto]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TokenIcon symbol={s.symbol} size={30} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{s.symbol}</p>
                          <p className="truncate font-mono text-[9px] text-white/30">{fmtPrice(s.priceUsd)} · {s.ageText ?? '—'}</p>
                        </div>
                      </div>
                      <span className="text-right font-mono text-[11px] text-white/70">{fmtUsd(s.marketCapUsd)}</span>
                      <span className="hidden text-right font-mono text-[11px] sm:block" style={{ color: pctColor(s.athDrawdownPct) }}>{s.athDrawdownPct != null ? `${s.athDrawdownPct.toFixed(0)}%` : '—'}</span>
                      <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(s.liquidityUsd)}</span>
                      <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{s.holdersTotal?.toLocaleString() ?? '—'}</span>
                      <span className="justify-self-end rounded-full px-2 py-0.5 font-mono text-[9px] font-bold" style={{ background: s.source === 'GRADE A' ? 'rgba(249,115,22,0.14)' : 'rgba(96,165,250,0.12)', color: s.source === 'GRADE A' ? '#fdba74' : '#93c5fd' }}>{s.source === 'GRADE A' ? 'A' : 'EW'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-white/30">
              Sourced from the live Telegram notifier watching Grade [A] and Early Watch channels — the same feed used for manual screening. Every field (MC, ATH, holders, smart money, rug score) is parsed from real-time signal messages, never fabricated.
            </p>
          </div>
        </Card>
      )}

      {/* ============ LAUNCHES ============ */}
      {subTab === 'launches' && (
        <Card title="Launch feed" subtitle="Every pons launch is viewable — including Low Signal. Click a row for full analysis, or Preview to run a buy/sell quote.">
          <div className="p-5">
            {launchesLoading && <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10"><div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" /></div>}
            {launchesErr && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)' }}>
                {launchesErr} <button onClick={() => void loadLaunches()} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button>
              </div>
            )}
            {launches && (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(launches.summary).map(([tier, count]) => (
                    <span key={tier} className="rounded-full px-3 py-1 font-mono text-[11px] font-bold" style={{ background: tierColor(tier).bg, color: tierColor(tier).fg }}>{count} {tier}</span>
                  ))}
                  <button onClick={() => void loadLaunches()} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white"><RefreshCw className="h-3 w-3" /> Refresh</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {launches.launches.map((l, i) => (
                      <div key={l.token ?? i} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]">
                        <button onClick={() => setSelectedLaunch(l)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={34} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-white">{l.name ?? l.symbol ?? 'unnamed'}</p>
                            <p className="truncate font-mono text-[9px] text-white/30">{l.priceUsd != null ? fmtPrice(l.priceUsd) : '—'} · MC {fmtUsd(l.marketCapUsd)} · grad {l.graduationProgressPct != null ? `${Math.round(l.graduationProgressPct)}%` : l.graduated ? '100%' : '—'}</p>
                          </div>
                          <span className="hidden shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold sm:block" style={{ background: tierColor(l.tier).bg, color: tierColor(l.tier).fg }}>{l.tier}</span>
                        </button>
                        <button onClick={() => setTradeLaunch(l)} className="shrink-0 rounded-full border border-[#f97316]/40 px-3 py-1.5 text-[10px] font-bold text-[#fdba74] transition hover:bg-[#f97316]/10">
                          Trade
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {selected && <SignalDrawer signal={selected} onClose={() => setSelected(null)} />}
      {selectedLaunch && <LaunchDrawer launch={selectedLaunch} onClose={() => setSelectedLaunch(null)} />}
      {tradeLaunch && <TradePreview launch={tradeLaunch} onClose={() => setTradeLaunch(null)} />}
    </div>
  );
}

// ── Launch analysis drawer (feed tokens: MC, grad, deployer, tx) ────────
function LaunchDrawer({ launch, onClose }: { launch: LaunchRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ background: '#141414', border: '1px solid rgba(249,115,22,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <TokenIcon src={ipfsToHttp(launch.logo)} symbol={launch.symbol ?? '?'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-white">{launch.name ?? launch.symbol ?? 'unnamed'}</p>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold" style={{ background: launch.tier === 'Graduated' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', color: launch.tier === 'Graduated' ? '#86efac' : 'rgba(255,255,255,0.4)' }}>{launch.tier}</span>
            </div>
            <p className="font-mono text-[10px] text-white/35">{launch.token?.slice(0, 12)}…</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-white/40 hover:text-white">✕</button>
        </div>
        <div className="space-y-4 p-5">
          <Section title="MARKET">
            <Grid>
              <Cell k="Price" v={fmtPrice(launch.priceUsd)} accent />
              <Cell k="Market cap" v={fmtUsd(launch.marketCapUsd)} />
              <Cell k="Liquidity" v={fmtUsd(launch.liquidityUsd)} />
              <Cell k="Graduation" v={launch.graduationProgressPct != null ? `${Math.round(launch.graduationProgressPct)}%` : launch.graduated ? '100%' : '—'} />
            </Grid>
          </Section>
          {launch.description && (
            <Section title="ABOUT">
              <p className="text-xs leading-relaxed text-white/55">{launch.description}</p>
            </Section>
          )}
          <Section title="ON-CHAIN">
            <Grid>
              <Cell k="Deployer" v={launch.deployer ? `${launch.deployer.slice(0, 8)}…${launch.deployer.slice(-4)}` : '—'} />
              <Cell k="Pool" v={launch.pool ? `${launch.pool.slice(0, 8)}…` : '—'} />
              <Cell k="Launched" v={launch.launchedAt ? new Date(launch.launchedAt).toLocaleDateString() : '—'} />
            </Grid>
          </Section>
          <div className="flex flex-wrap gap-2 pt-1">
            {launch.token && (
              <>
                <a href={`https://robinhoodchain.blockscout.com/token/${launch.token}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">Blockscout <ExternalLink className="h-3 w-3" /></a>
                <a href={`https://dexscreener.com/robinhood/${launch.token}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">DexScreener <ExternalLink className="h-3 w-3" /></a>
                <button onClick={() => navigator.clipboard?.writeText(launch.token!)} className="btn-secondary rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">Copy CA</button>
              </>
            )}
          </div>
          <p className="font-mono text-[9px] text-white/25">Read-only intelligence. Execution stays in your PonsMCP server.</p>
        </div>
      </div>
    </div>
  );
}

export function AppPage() {
  const [tab, setTab] = useState<Tab>('New payment');
  const [navOpen, setNavOpen] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('5.00');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState<Live>({ block: '—', gas: '—' });
  const [mcpPrice, setMcpPrice] = useState<{ priceUsd: string; change24h: number | null } | null>(null);
  const [txHash, setTxHash] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ status: 'success' | 'reverted'; block: string; gas: string; hash: string } | null>(null);
  const [history, setHistory] = useState<IntentRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [justPassedPolicy, setJustPassedPolicy] = useState(false);
  const [liveTick, setLiveTick] = useState(false);

  const refreshLive = useCallback(async () => {
    const retry = async <T,>(work: () => Promise<T>): Promise<T | null> => {
      for (let i = 0; i < 3; i++) {
        try { return await work(); } catch { await new Promise((r) => setTimeout(r, 800 * (i + 1))); }
      }
      return null;
    };
    const [block, gas] = await Promise.all([
      retry(() => rpc<string>('eth_blockNumber', [])),
      retry(() => rpc<string>('eth_gasPrice', [])),
    ]);
    setLive({
      block: block ? Number(hexToBig(block)).toLocaleString('en-US') : '—',
      gas: gas ? `${(Number(hexToBig(gas)) / 1e9).toFixed(3)} gwei` : '—',
    });
    setLiveTick(true);
    setTimeout(() => setLiveTick(false), 500);
  }, []);

  useEffect(() => { void refreshLive(); }, [refreshLive]);
  useEffect(() => {
    const id = setInterval(() => { void refreshLive(); }, 12000);
    return () => clearInterval(id);
  }, [refreshLive]);

  const refreshMcpPrice = useCallback(async () => {
    try {
      // Same-origin proxy — the site CSP forbids direct DexScreener calls from the browser.
      const res = await fetch('/api/mcp-price');
      const data = await res.json();
      if (res.ok && data.priceUsd) {
        setMcpPrice({
          priceUsd: Number(data.priceUsd).toLocaleString('en-US', { minimumSignificantDigits: 3, maximumSignificantDigits: 3 }),
          change24h: data.change24h ?? null,
        });
      }
    } catch { /* keep last known value; never show a fake price */ }
  }, []);
  useEffect(() => { void refreshMcpPrice(); const id = setInterval(() => void refreshMcpPrice(), 30000); return () => clearInterval(id); }, [refreshMcpPrice]);

  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/intents?limit=10');
      const data = await response.json();
      if (response.ok) setHistory(data.intents ?? []);
    } catch { /* activity is non-critical */ }
  }, []);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  const refreshServices = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/services');
      const data = await response.json();
      if (response.ok && Array.isArray(data.services)) setServices(data.services);
    } catch { /* catalog optional */ }
  }, []);
  useEffect(() => { void refreshServices(); }, [refreshServices]);

  const createQuote = async () => {
    setError('');
    const parsed = Number(amount);
    if (!addrOk(merchant)) { setError('Enter a valid merchant wallet address (0x + 40 hex characters).'); return; }
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) { setError('Amount must be greater than 0 and within the 100 USDG per-payment policy cap.'); return; }
    setQuoteBusy(true);
    setQuote(null);
    setJustPassedPolicy(false);
    try {
      // Give the policy check a visible beat — this is a real server round trip,
      // not a canned animation, but we don't want it to feel instantaneous either.
      await new Promise((r) => setTimeout(r, 380));
      const response = await fetch('/api/intents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_address: merchant, amount_usdg: parsed.toFixed(6) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create payment intent');
      const intent = data.intent;
      setQuote({
        id: intent.id,
        merchant: intent.payment.pay_to,
        amount: Number(intent.payment.amount_usdg),
        amountBase: intent.payment.amount_base,
        createdAt: intent.created_at,
        protectedResource: data.next.protected_resource,
        verifyEndpoint: data.next.verify,
      });
      setJustPassedPolicy(true);
      setTimeout(() => setJustPassedPolicy(false), 1600);
      void refreshHistory();
    } catch (e: any) { setError(e?.message ?? 'Could not create payment intent.'); }
    finally { setQuoteBusy(false); }
  };

  const verifyReceipt = async () => {
    setError('');
    setReceipt(null);
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) { setError('Enter a transaction hash (0x + 64 hex characters).'); return; }
    setReceiptBusy(true);
    try {
      if (quote) {
        const response = await fetch(quote.verifyEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tx_hash: txHash }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Intent verification failed');
        setReceipt({ status: 'success', block: Number(data.receipt.block_number).toLocaleString('en-US'), gas: Number(data.receipt.gas_used).toLocaleString('en-US'), hash: txHash });
        void refreshHistory();
      } else {
        const chainReceipt = await rpc<any>('eth_getTransactionReceipt', [txHash]);
        if (!chainReceipt) { setError('No receipt yet. The transaction may still be pending, or this hash is not on Robinhood Chain.'); return; }
        setReceipt({
          status: chainReceipt.status === '0x1' ? 'success' : 'reverted',
          block: Number(hexToBig(chainReceipt.blockNumber)).toLocaleString('en-US'),
          gas: Number(hexToBig(chainReceipt.gasUsed)).toLocaleString('en-US'),
          hash: txHash,
        });
      }
    } catch (e: any) { setError(e?.message ?? 'Receipt lookup failed.'); }
    finally { setReceiptBusy(false); }
  };

  const serverRequest = quote ? JSON.stringify({
    intent_id: quote.id,
    tool: 'pons_pay',
    arguments: { payTo: quote.merchant, amountUsd: quote.amount.toFixed(2) },
  }, null, 2) : '';

  const settingsSnippet = [
    '# PonsMCP agent runtime — required environment',
    'PONSMCP_PRIVATE_KEY=<your 32-byte hex key, generated offline>',
    '',
    '# Spending policy (defaults shown)',
    'PONSMCP_MAX_PER_TX=100000000    # 100 USDG per transaction (base units)',
    'PONSMCP_DAILY_LIMIT=1000000000  # 1,000 USDG per day (base units)',
    '',
    '# Optional: pons launch intel via Alchemy',
    '# PONSMCP_ALCHEMY_KEY=<key>',
  ].join('\n');

  const paidCount = history.filter((i) => i.status === 'paid').length;
  const pendingCount = history.filter((i) => i.status === 'pending').length;

  const sidebar = (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0c0b09]">
      <div className="px-4 pb-3 pt-5">
        <Link to="/" className="group flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="size-[32px] rounded-lg object-cover" />
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.2em] text-white">PONSMCP</span>
            <span className="text-[9.5px] tracking-[0.14em] text-white/30">MISSION CONTROL</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV.map((group) => (
          <div key={group.group} className="mb-3">
            <div className="px-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.18em] text-white/40">{group.group}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const selected = tab === item.key;
                return (
                  <button key={item.key} onClick={() => { setTab(item.key); setNavOpen(false); }}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition ${selected ? 'bg-[#f97316]/12 font-medium text-[#fdba74]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}>
                    <item.icon className="h-4 w-4" />
                    {item.key}
                    {item.key === 'Activity' && pendingCount > 0 && (
                      <span className="ml-auto rounded-full bg-[#f97316]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#fdba74]">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] px-4 py-3.5">
        <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/35">Settlement</div>
        <a href={`${RH_EXPLORER}/token/${USDG}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 font-mono text-[11px] text-[#f97316]">USDG {USDG.slice(0, 8)}… <ExternalLink className="h-3 w-3" /></a>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen md:block">{sidebar}</div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/[0.07] bg-[#0c0b09]/90 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setNavOpen(true)} className="rounded-lg border border-white/10 p-2 text-white/70" aria-label="Open menu">
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="text-sm font-bold tracking-[-0.03em] text-white">Mission Control</span>
        </div>

        <div className="w-full px-5 pb-24 pt-6 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-white sm:text-3xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Mission <span className="gradient-text">Control</span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/50">
                Policy-safe MPP payment requests for autonomous agents. Quotes in USDG, execution from your PonsMCP server, proof from the chain.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://x.com/Pons_MCP" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center rounded-full px-3.5 py-2 text-xs font-bold text-white/70">𝕏</a>
              <a href="https://github.com/ponsmcpai/ponsmcp-sdk" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
                <Network className="h-3.5 w-3.5" /> SDK source
              </a>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              {
                label: '$MCP token',
                value: mcpPrice ? `$${mcpPrice.priceUsd}` : 'Loading…',
                sub: mcpPrice?.change24h != null ? `MCP · 24h ${mcpPrice.change24h >= 0 ? '+' : ''}${mcpPrice.change24h.toFixed(1)}%` : 'MCP · live on Uniswap V4 (RH)',
                live: true,
                href: 'https://dexscreener.com/robinhood/0x50a505074173d50d7d21d45e19d3a94202dfce860273100d1c19008051e9475f',
                changeColor: mcpPrice?.change24h != null ? (mcpPrice.change24h >= 0 ? '#86efac' : '#fca5a5') : undefined,
              },
              { label: 'Latest block', value: live.block, sub: 'Robinhood Chain · 4663', live: true },
              { label: 'Network gas', value: live.gas, sub: 'Gas token: ETH', live: true },
              { label: 'MCP tools', value: '25 tools', sub: 'Reads · payments · stocks · launches', live: false },
            ]).map(({ label, value, sub, live: isLive, href, changeColor }) => {
              const content = (
                <>
                  <p className="text-[11px] text-white/40">{label}</p>
                  <p className={`mt-1 truncate text-base font-bold ${isLive && liveTick ? 'animate-count-flicker' : ''}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: changeColor ?? 'white' }}>{value}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/30">{sub}</p>
                </>
              );
              const cls = `relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 ${href ? 'transition hover:border-[#f97316]/40 hover:bg-white/[0.05]' : ''}`;
              return href ? (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {isLive && <span className="absolute right-3 top-3 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" /></span>}
                  {content}
                </a>
              ) : (
                <div key={label} className={cls}>
                  {isLive && <span className="absolute right-3 top-3 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" /></span>}
                  {content}
                </div>
              );
            })}
          </div>

          {/* ============ TAB: NEW PAYMENT ============ */}
          {tab === 'New payment' && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-5 rounded-2xl p-4" style={{ background: 'rgba(16,16,16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Step number={1} title="Create request" active={!quote && !quoteBusy} done={!!quote} />
                <div className="hidden h-px w-8 sm:block" style={{ background: 'rgba(255,255,255,0.12)' }} />
                <Step number={2} title="Review quote" active={quoteBusy || !!quote} done={!!quote && !!receipt && receipt.status === 'success'} />
                <div className="hidden h-px w-8 sm:block" style={{ background: 'rgba(255,255,255,0.12)' }} />
                <Step number={3} title="Agent execution" active={!!quote && !receipt} done={!!receipt && receipt.status === 'success'} />
                <span className="ml-auto font-mono text-[11px] text-white/35">Payments never sign in this browser</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-5">
                <Card title="New MPP payment request" subtitle="USDG settlement · Robinhood Chain · limit 100 USDG per payment" className="lg:col-span-3 flex">
                  <div className="flex flex-col gap-5 p-6">
                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {services.slice(0, 3).map((service) => (
                          <button key={service.id} onClick={() => { setMerchant(service.merchant); setAmount(Number(service.price_usdg).toFixed(2)); setQuote(null); }}
                            className="rounded-full border border-[#f97316]/30 bg-[#f97316]/[0.08] px-3 py-1.5 text-xs text-[#fdba74] transition hover:bg-[#f97316]/15">
                            {service.name} · {Number(service.price_usdg).toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-white/80">Merchant wallet</span>
                      <input
                        value={merchant}
                        onChange={(e) => { setMerchant(e.target.value); setQuote(null); }}
                        placeholder="0x…"
                        spellCheck={false}
                        className="w-full rounded-lg px-3.5 py-3 text-sm outline-none"
                        style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${merchant && !addrOk(merchant) ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.13)'}`, color: '#fff7ed', fontFamily: "'DM Mono', monospace" }}
                      />
                      <span className="text-xs text-white/35">The recipient that receives USDG after the agent executes the payment.</span>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-white/80">Amount</span>
                      <div className="flex overflow-hidden rounded-lg" style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.13)' }}>
                        <input type="number" min="0.01" max="100" step="0.01" value={amount}
                          onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
                          className="min-w-0 flex-1 px-3.5 py-3 text-sm outline-none"
                          style={{ background: 'transparent', color: 'white', fontFamily: "'DM Mono', monospace" }} />
                        <span className="flex items-center px-4 text-sm font-bold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fed7aa', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>USDG</span>
                      </div>
                    </label>
                    {error && <p className="rounded-lg px-3.5 py-3 text-sm" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
                    <button onClick={createQuote} disabled={quoteBusy} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold disabled:opacity-70">
                      {quoteBusy ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Checking policy & pricing…</>
                      ) : (
                        <>Create payment quote <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </Card>

                <Card title="Policy guard" subtitle="Enforced inside your PonsMCP server before broadcast" className="lg:col-span-2 flex">
                    <div className={`flex flex-1 flex-col justify-between gap-4 rounded-b-2xl p-5 transition-all duration-500 ${justPassedPolicy ? 'bg-green-500/[0.06]' : ''}`} style={justPassedPolicy ? { boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.35)' } : undefined}>
                      {[
                        ['Settlement asset', 'USDG (6 decimals)'],
                        ['Network', 'Robinhood Chain · 4663'],
                        ['Per-payment cap', '100 USDG'],
                        ['Daily limit', '1,000 USDG'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-white/40">{k}</span>
                          <span className="text-right font-mono text-white/75">{v}</span>
                        </div>
                      ))}
                      <div className="h-px bg-white/[0.08]" />
                      <div className="flex items-center gap-2 text-xs" style={{ color: justPassedPolicy ? '#86efac' : 'rgba(255,255,255,0.45)' }}>
                        <ShieldCheck className={`h-4 w-4 ${justPassedPolicy ? 'text-green-400 animate-pop-in' : 'text-green-400'}`} />
                        {justPassedPolicy ? 'Just checked — this request passed every rule above.' : 'Key stays in the agent runtime — the browser never signs.'}
                      </div>
                    </div>
                </Card>
              </div>

              {quote && (
                <section className="mt-5 overflow-hidden rounded-2xl animate-slide-fade-in" style={{ background: 'rgba(20,20,20,0.75)', border: '1px solid rgba(249,115,22,0.32)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-400 animate-pop-in" /><h2 className="font-bold text-white">Quote ready for your agent</h2></div>
                    <span className="rounded-full px-2.5 py-1 font-mono text-xs animate-pop-in" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac' }}>POLICY PASSED</span>
                  </div>
                  <div className="grid gap-6 p-6 lg:grid-cols-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs text-white/40">You pay</p><p className="mt-1 text-xl font-bold text-white">{quote.amount.toFixed(2)} USDG</p></div>
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs text-white/40">Network</p><p className="mt-1 text-sm font-bold text-white">Robinhood Chain</p><p className="text-xs text-white/35">Chain ID 4663</p></div>
                      <div className="col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs text-white/40">Merchant</p><p className="mt-1 break-all font-mono text-xs text-[#fed7aa]">{quote.merchant}</p></div>
                      <div className="col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs text-white/40">Persistent intent</p><p className="mt-1 break-all font-mono text-xs text-[#fed7aa]">{quote.id}</p></div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-white">Send this to PonsMCP</p>
                      <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <div className="absolute right-2 top-2"><CopyButton value={serverRequest} /></div>
                        <pre className="overflow-x-auto pr-8 font-mono text-xs" style={{ color: '#f97316' }}>{serverRequest}</pre>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-white/45">
                        Run this through your configured MCP client. The server owns signing and returns the transaction hash and verified receipt.
                      </p>
                    </div>
                  </div>

                  {/* What happens next — the missing piece: make the payoff explicit, not implied */}
                  <div className="border-t px-6 py-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(249,115,22,0.04)' }}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-[#fdba74]">What you get back</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-white/60">1</span>
                        <p className="text-xs leading-relaxed text-white/60"><span className="font-semibold text-white/85">A transaction hash</span> — proof the agent actually broadcast your payment to Robinhood Chain.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-white/60">2</span>
                        <p className="text-xs leading-relaxed text-white/60"><span className="font-semibold text-white/85">A verified receipt</span> — block number + gas used, read straight from the chain, not from a database.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-white/60">3</span>
                        <p className="text-xs leading-relaxed text-white/60"><span className="font-semibold text-white/85">An unlocked resource</span> — if the merchant gated something behind this payment, the link opens here.</p>
                      </div>
                    </div>
                    <button onClick={() => setTab('Receipts')} className="btn-secondary mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/80">
                      Paste the hash here once your agent pays <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {/* ============ TAB: RECEIPTS ============ */}
          {tab === 'Receipts' && (
            <Card title="Verify payment receipt" subtitle="Paste the hash returned by your PonsMCP agent. Reads Robinhood Chain directly." accent>
              <div className="grid items-start gap-3 p-6 lg:grid-cols-[1fr_auto]">
                <input
                  value={txHash}
                  onChange={(e) => { setTxHash(e.target.value); setReceipt(null); }}
                  placeholder="0x transaction hash…"
                  spellCheck={false}
                  className="w-full rounded-lg px-3.5 py-3 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.13)', color: '#fed7aa', fontFamily: "'DM Mono', monospace" }}
                />
                <button onClick={verifyReceipt} disabled={receiptBusy} className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold disabled:opacity-60">
                  {receiptBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Verify receipt
                </button>
              </div>

              {receiptBusy && (
                <div className="mx-6 mb-6 overflow-hidden rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" />
                  </div>
                  <p className="mt-3 font-mono text-xs text-white/45">Reading Robinhood Chain for a matching receipt…</p>
                </div>
              )}

              {receipt && !receiptBusy && (
                <div className="mx-6 mb-6 overflow-hidden rounded-xl animate-slide-fade-in" style={{ background: receipt.status === 'success' ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)', border: `1px solid ${receipt.status === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full animate-pop-in" style={{ background: receipt.status === 'success' ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)' }}>
                        {receipt.status === 'success' && <span className="absolute inset-0 rounded-full border border-green-400/60 animate-ring-grow" />}
                        <CheckCircle2 className="h-5 w-5" style={{ color: receipt.status === 'success' ? '#4ade80' : '#f87171' }} />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{receipt.status === 'success' ? 'Payment confirmed on-chain' : 'Transaction reverted'}</p>
                        <p className="mt-0.5 text-xs text-white/50">This is a live read from the chain — not a cached status.</p>
                      </div>
                    </div>
                    {receipt.status === 'success' && (
                      <span className="rounded-full px-3 py-1 font-mono text-[11px] font-bold" style={{ background: 'rgba(74,222,128,0.15)', color: '#86efac' }}>FINALIZED</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
                    <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.22)' }}>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">Block</p>
                      <p className="mt-1 truncate font-mono text-sm font-bold text-white">{receipt.block}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.22)' }}>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">Gas used</p>
                      <p className="mt-1 truncate font-mono text-sm font-bold text-white">{receipt.gas}</p>
                    </div>
                    <div className="col-span-2 rounded-lg p-3 sm:col-span-2" style={{ background: 'rgba(0,0,0,0.22)' }}>
                      <p className="text-[10px] uppercase tracking-wide text-white/35">Transaction hash</p>
                      <p className="mt-1 truncate font-mono text-xs font-bold text-[#fed7aa]">{receipt.hash}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <a href={`${RH_EXPLORER}/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-[#fed7aa]">
                      View on Blockscout <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {quote && receipt.status === 'success' && quote.protectedResource && (
                      <a href={quote.protectedResource} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold">
                        Open the resource this unlocked <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ============ TAB: ACTIVITY ============ */}
          {tab === 'Activity' && (
            <Card title="Recent payment intents" subtitle="Persisted settlement state — pending is expected until a matching receipt is verified.">
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <div className="flex gap-2">
                  <span className="rounded-full px-2.5 py-1 font-mono text-[10px]" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac' }}>{paidCount} PAID</span>
                  <span className="rounded-full px-2.5 py-1 font-mono text-[10px]" style={{ background: 'rgba(249,115,22,0.12)', color: '#fed7aa' }}>{pendingCount} PENDING</span>
                </div>
                <button onClick={() => void refreshHistory()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316]"><RefreshCw className="h-3 w-3" /> Refresh</button>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                {history.length === 0 ? <p className="px-6 py-5 text-sm text-white/40">No payment intents yet.</p> : history.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{Number(item.payment.amount_usdg).toFixed(2)} USDG <span className="font-normal text-white/40">→ {item.payment.pay_to.slice(0, 6)}…{item.payment.pay_to.slice(-4)}</span></p>
                      <p className="mt-1 font-mono text-xs text-white/35">{item.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: item.status === 'paid' ? 'rgba(74,222,128,0.12)' : 'rgba(249,115,22,0.12)', color: item.status === 'paid' ? '#86efac' : '#fed7aa' }}>{item.status.toUpperCase()}</span>
                      {item.tx_hash && <a href={`${RH_EXPLORER}/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#f97316]">Proof</a>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ============ TAB: CHAIN STATUS ============ */}
          {tab === 'Chain status' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Robinhood Chain" subtitle="Arbitrum Orbit L2 · settlement environment">
                <div className="flex flex-col gap-3 p-5">
                  {[
                    ['Chain ID', '4663'],
                    ['Latest block', live.block],
                    ['Gas price', live.gas],
                    ['Gas token', 'ETH'],
                    ['Explorer', 'robinhoodchain.blockscout.com'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-white/40">{k}</span><span className="font-mono text-white/75">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Settlement asset" subtitle="USDG — stablecoin, 6 decimals">
                <div className="flex flex-col gap-3 p-5">
                  {[
                    ['Symbol', 'USDG'],
                    ['Decimals', '6'],
                    ['Contract', `${USDG.slice(0, 10)}…${USDG.slice(-6)}`],
                    ['Per-payment policy', '≤ 100 USDG'],
                    ['Daily policy', '≤ 1,000 USDG (default)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-white/40">{k}</span><span className="font-mono text-white/75">{v}</span>
                    </div>
                  ))}
                  <a href={`${RH_EXPLORER}/token/${USDG}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316]">Open explorer <ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </Card>
            </div>
          )}

          {/* ============ TAB: SERVICES ============ */}
          {tab === 'Services' && (
            <div className="grid gap-5">
              <Card title="Paid services" subtitle="Real deliverables, priced in USDG. Each unlocks its payload only after your agent's payment verifies on-chain.">
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {services.map((service) => {
                    const meta: Record<string, { desc: string; features: string[]; icon: string }> = {
                      svc_sdkguide01: {
                        desc: 'Drop-in TypeScript quickstart for wiring an agent to PonsMCP: install, key handling, policy caps, first settlement — copy-paste ready.',
                        features: ['Install & config commands', 'Working pay() example', 'Policy defaults explained'],
                        icon: '⌨',
                      },
                      svc_launchintel01: {
                        desc: 'Live on-chain snapshot of the pons v2 launch factory computed at unlock time: config count, latest block, factory address. Fresh on every request.',
                        features: ['Real chain read at unlock', 'Factory config count', 'Block-height proof'],
                        icon: '◎',
                      },
                    };
                    const m = meta[service.id] ?? { desc: 'Unlocks after on-chain receipt verification.', features: [], icon: '◇' };
                    return (
                      <div key={service.id} className="flex flex-col rounded-2xl border border-[#f97316]/25 bg-gradient-to-b from-[#f97316]/[0.06] to-transparent p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-[#fdba74]" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}>{m.icon}</div>
                          <div className="text-right">
                            <p className="text-lg font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Number(service.price_usdg).toFixed(2)}</p>
                            <p className="font-mono text-[10px] text-white/35">USDG · one-time</p>
                          </div>
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-white">{service.name}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{m.desc}</p>
                        {m.features.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {m.features.map((f) => (
                              <li key={f} className="flex items-center gap-2 text-[11px] text-white/45"><Check className="h-3 w-3 text-green-400" /> {f}</li>
                            ))}
                          </ul>
                        )}
                        <button onClick={() => { setMerchant(service.merchant); setAmount(Number(service.price_usdg).toFixed(2)); setTab('New payment'); setQuote(null); }}
                          className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold">
                          Buy with agent payment <ArrowRight className="h-3 w-3" />
                        </button>
                        <p className="mt-2 text-center font-mono text-[9px] text-white/25">{service.id}</p>
                      </div>
                    );
                  })}
                </div>
                {services.length === 0 && (
                  <p className="p-5 text-sm text-white/45">No public services registered yet.</p>
                )}
              </Card>
              <Card title="How it works" subtitle="The merchant pattern behind every listing.">
                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  {[
                    ['1', 'Agent picks a service', 'The agent reads this catalog and picks what it needs — no human in the loop.'],
                    ['2', '402 quote returned', 'The resource answers PAYMENT-REQUIRED with exact price and recipient.'],
                    ['3', 'Pay → unlock', 'pons_pay settles USDG on-chain; the receipt unlocks the payload instantly.'],
                  ].map(([n, title, text]) => (
                    <div key={n} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <span className="font-mono text-xs text-[#f97316]">0{n}</span>
                      <h3 className="mt-1 text-sm font-bold text-white">{title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">{text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ============ TAB: MCP TOOLS ============ */}
          {tab === 'MCP tools' && (() => {
            const toolGroups: Array<{ group: string; note: string; tools: Array<[string, string, boolean]> }> = [
              { group: 'PAYMENT', note: 'Settlement in USDG with policy enforcement', tools: [
                ['pons_quote', 'Convert USD → USDG base units, nothing executed', false],
                ['pons_pay', 'Policy check → transfer → verified receipt', true],
                ['pons_pay_resource', 'Parse a 402 resource and settle its exact price', true],
                ['pons_tx_status', 'Receipt lookup with decoded transfers', false],
                ['pons_balance', 'Agent wallet balance for any token', true],
              ]},
              { group: 'STOCKS', note: '19 tokenized securities on Robinhood Chain', tools: [
                ['pons_stocks_list', 'All 19 verified stock tokens with addresses', false],
                ['pons_stock_price', 'Live DEX price by ticker (NVDA, AAPL…)', false],
                ['pons_stock_info', 'On-chain name, symbol, supply', false],
                ['pons_stocks_screen', 'Screen all 19, rank by liquidity, Grade A filter', false],
              ]},
              { group: 'LAUNCH INTELLIGENCE', note: 'Pons v1 + v2 launchpad research', tools: [
                ['pons_launch_feed', 'Recent launches from the official feed', false],
                ['pons_launch_ranking', 'Tier ranking: Graduated / Grade A / Early Watch', false],
                ['pons_graduated_launches', 'Launches that hit graduation', false],
                ['pons_launch_info', 'V1 token on-chain metadata', false],
                ['pons_launch_market', 'Live markets for a launch token', false],
                ['pons_v2_launch', 'V2 factory launch record', false],
                ['pons_v2_snipe_tax', 'Decaying opening tax per recipient', false],
                ['pons_v2_quote_buy', 'Pure curve buy quote', false],
                ['pons_v2_quote_sell', 'Pure curve sell quote', false],
                ['pons_escrow_balance', 'Claimable ETH on the v2 fee escrow', false],
                ['pons_escrow_token_balance', 'Claimable ERC-20 fees', false],
              ]},
              { group: 'CHAIN & TRANSFER', note: 'Low-level reads and token movement', tools: [
                ['pons_chain_info', 'Chain ID, block, gas, canonical addresses', false],
                ['pons_token_info', 'ERC-20 metadata for any token', false],
                ['pons_send_token', 'Send any ERC-20 by ticker or address', true],
                ['pons_send_eth', 'Send native ETH', true],
              ]},
            ];
            return (
              <div className="grid gap-5">
                <Card title="MCP tool surface" subtitle={`25 tools · ${toolGroups.length} categories · zero runtime dependencies`}>
                  <div className="grid gap-5 p-5">
                    {toolGroups.map((g) => (
                      <div key={g.group}>
                        <div className="mb-2 flex items-baseline justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#fdba74]">{g.group}</h3>
                          <span className="font-mono text-[10px] text-white/30">{g.note}</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-white/10">
                          {g.tools.map(([name, desc, needsKey], i) => (
                            <div key={name} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 ${i % 2 ? 'bg-white/[0.02]' : ''}`} style={{ borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              {needsKey && <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ background: 'rgba(74,222,128,0.14)', color: '#86efac' }}>KEY</span>}
                              <span className="font-mono text-xs font-semibold text-[#fed7aa]">{name}</span>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Connect any MCP client" subtitle="Stdio transport — Claude Desktop, Cursor, or any MCP host.">
                  <div className="p-5">
                    <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
                      <div className="absolute right-2 top-2"><CopyButton value={'npm install -g @ponsmcp/sdk\nponsmcp  # stdio MCP server'} /></div>
                      <pre className="overflow-x-auto pr-8 font-mono text-xs" style={{ color: '#f97316' }}>{'npm install -g @ponsmcp/sdk\nponsmcp  # stdio MCP server'}</pre>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-white/45">Wallet tools (marked KEY) activate when PONSMCP_PRIVATE_KEY is present in the server environment. Everything else works keyless.</p>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ============ TAB: LAUNCH INTEL ============ */}
          {tab === 'Launch intel' && (
            <LaunchIntelPanel />
          )}

          {/* ============ TAB: INTEGRATION ============ */}
          {tab === 'Integration' && (
            <Card title="Agent integration" subtitle="Three steps from install to verified settlement.">
              <div className="grid gap-3 p-5">
                {[
                  ['1', 'Install the server', 'npm install -g @ponsmcp/sdk, then run ponsmcp in your agent runtime.'],
                  ['2', 'Configure caps', 'Set PONSMCP_MAX_PER_TX and PONSMCP_DAILY_LIMIT (USDG base units, 6 decimals).'],
                  ['3', 'Execute from the agent', 'Call pons_quote to preview, pons_pay to settle. The tool returns the verified receipt.'],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <span className="font-mono text-xs text-[#f97316]">0{n}</span>
                    <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/55">{text}</p></div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link to="/docs" className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">Full documentation</Link>
                  <a href="https://github.com/ponsmcpai/ponsmcp-sdk" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">GitHub</a>
                </div>
              </div>
            </Card>
          )}

          {/* ============ TAB: POLICY ============ */}
          {tab === 'Policy' && (
            <Card title="Spending policy" subtitle="Local, enforced before any key material is used.">
              <div className="p-5 text-sm leading-7 text-white/55">
                <p>PonsMCP applies two hard limits inside the agent runtime, both configurable through environment variables and both checked <b className="text-white">before signing</b>:</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  {[
                    ['PONSMCP_MAX_PER_TX', '100000000', '100 USDG per transaction'],
                    ['PONSMCP_DAILY_LIMIT', '1000000000', '1,000 USDG per day (in-process counter)'],
                  ].map(([k, v, note]) => (
                    <div key={k} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs last:border-0">
                      <span className="font-mono text-white/70">{k}</span>
                      <span className="text-right"><span className="font-mono text-[#fdba74]">{v}</span><span className="ml-3 text-white/35">{note}</span></span>
                    </div>
                  ))}
                </div>
                <p className="mt-4">Balance is pre-checked: an underfunded wallet never reaches broadcast. A payment counts as complete only when the receipt is <span className="font-mono text-[#fdba74]">0x1</span> with the expected USDG Transfer event. The daily counter is in-process; operators who need durable budgets should run one server per agent and restart on schedule.</p>
              </div>
            </Card>
          )}

          {/* ============ TAB: SETTINGS ============ */}
          {tab === 'Settings' && (
            <Card title="Server settings" subtitle="Your PonsMCP server is the account — configure it once, key never leaves the runtime.">
              <div className="flex flex-col gap-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs text-white/40">RPC failover chain (agent → chain)</p>
                    <p className="mt-1 font-mono text-xs break-all text-white/80">Alchemy (primary) → nodeflare → routeme — 12s hard budget</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs text-white/40">Settlement console API (this origin)</p>
                    <p className="mt-1 font-mono text-xs break-all text-white/80">https://ponsmcp.com/api</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">Runtime configuration</p>
                <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div className="absolute right-2 top-2"><CopyButton value={settingsSnippet} /></div>
                  <pre className="overflow-x-auto pr-8 font-mono text-xs" style={{ color: '#f97316' }}>{settingsSnippet}</pre>
                </div>
                <p className="text-xs leading-relaxed text-white/45">
                  Paste into the environment of the process that runs <span className="font-mono text-white/70">ponsmcp</span>. The private key is generated by you — this browser never sees it, receives it, or signs with it. Generate a fresh key with: <span className="font-mono text-white/70">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</span> (run it offline, then fund only what the agent is allowed to spend).
                </p>
                <div className="flex items-center gap-2 text-xs text-white/45"><ShieldCheck className="h-4 w-4 text-green-400" /> No cookies, no sessions, no account database — possession of the key in your runtime is the whole access model.</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
