// LaunchpadPanel — Launchpad tab for Mission Control
// Sections: recent launches, recent graduations, launch intelligence,
// launch-token CTA, scan-interesting scorer.
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Rocket, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { Card } from './Primitives';
import { TokenIcon } from './TokenIcon';
import { fmtUsd, fmtPrice, ipfsToHttp, type LaunchRow, type SignalRow } from './shared';

// ── helpers ────────────────────────────────────────────────────────────
const tierColor = (tier: string) =>
  tier === 'Graduated'  ? { bg: 'rgba(74,222,128,0.12)',  fg: '#86efac' }
  : tier === 'Grade A'  ? { bg: 'rgba(249,115,22,0.14)',  fg: '#fdba74' }
  : tier === 'Early Watch' ? { bg: 'rgba(96,165,250,0.12)', fg: '#93c5fd' }
  : { bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.4)' };

function fmtAge(ts: string | null | undefined): string {
  if (!ts) return '—';
  const ms = Date.now() - new Date(ts).getTime();
  if (isNaN(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const LAUNCH_CMD = `import { PonsMCPClient } from '@ponsmcp/sdk';

const client = new PonsMCPClient({ privateKey: process.env.PONSMCP_PRIVATE_KEY });

// Launch a new token on the Pons v2 factory
const result = await client.call('pons_launch_token', {
  name: 'My Token',
  symbol: 'MYT',
  description: 'A token launched via PonsMCP SDK',
  // Optional: initialBuyAmount: '1.0'  (ETH to buy at launch)
});

console.log(result); // { token, pool, tx, tier }`;

// ── Section A: Recent Launches ─────────────────────────────────────────
function RecentLaunches() {
  const [data, setData] = useState<{ launches: LaunchRow[] } | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/launches');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'failed');
      setData(d);
    } catch (e: any) { setErr(e?.message ?? 'Could not load launches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const launches = (data?.launches ?? []).slice(0, 12);

  return (
    <Card title="Recent launches" subtitle="Latest pons launches — price, MC, graduation progress, tier.">
      <div className="p-5">
        {loading && (
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10 mb-4">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" />
          </div>
        )}
        {err && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {err} <button onClick={() => void load()} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button>
          </div>
        )}
        {launches.length > 0 && (
          <>
            <div className="mb-3 flex justify-between items-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">{data?.launches.length ?? 0} total</span>
              <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="hidden grid-cols-[2fr_1fr_1fr_0.8fr_0.7fr_auto] gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-white/30 sm:grid"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
                <span>Token</span>
                <span className="text-right">Price</span>
                <span className="text-right">MC</span>
                <span className="text-right">Grad %</span>
                <span className="text-right">Age</span>
                <span>Tier</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {launches.map((l, i) => (
                  <div key={l.token ?? i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_0.8fr_0.7fr_auto] items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={30} tokenAddress={l.token} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{l.name ?? l.symbol ?? 'unnamed'}</p>
                        <p className="truncate font-mono text-[9px] text-white/30">{l.symbol ?? ''}</p>
                      </div>
                    </div>
                    <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtPrice(l.priceUsd)}</span>
                    <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(l.marketCapUsd)}</span>
                    <span className="hidden text-right font-mono text-[11px] text-white/50 sm:block">
                      {l.graduationProgressPct != null ? `${Math.round(l.graduationProgressPct)}%` : l.graduated ? '100%' : '—'}
                    </span>
                    <span className="hidden text-right font-mono text-[10px] text-white/40 sm:block">{fmtAge(l.launchedAt)}</span>
                    <span className="justify-self-end rounded-full px-2 py-0.5 font-mono text-[9px] font-bold whitespace-nowrap"
                      style={{ background: tierColor(l.tier).bg, color: tierColor(l.tier).fg }}>
                      {l.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {!loading && launches.length === 0 && !err && (
          <p className="py-6 text-center text-sm text-white/35">No launches found.</p>
        )}
      </div>
    </Card>
  );
}

// ── Section B: Recent Graduations ─────────────────────────────────────
function RecentGraduations() {
  const [grads, setGrads] = useState<LaunchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]   = useState('');
  const [source, setSource] = useState<'mcp' | 'fallback'>('fallback');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    // Try MCP call first (pons_recent_graduations via HTTP transport)
    try {
      const res = await fetch('/api/graduations', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const d = await res.json();
      const content = JSON.stringify({ content: [{ text: JSON.stringify({ graduations: d.graduations ?? [] }) }] }); d?.result?.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        const rows: LaunchRow[] = Array.isArray(parsed?.graduations ?? parsed) ? (parsed?.graduations ?? parsed) : [];
        if (rows.length > 0) { setGrads(rows); setSource('mcp'); setLoading(false); return; }
      }
    } catch { /* fall through to /api/launches fallback */ }

    // Fallback: filter tier=Graduated from /api/launches
    try {
      const res = await fetch('/api/launches');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'failed');
      const all: LaunchRow[] = d.launches ?? [];
      setGrads(all.filter(l => l.tier === 'Graduated' || l.graduated));
      setSource('fallback');
    } catch (e: any) { setErr(e?.message ?? 'Could not load graduations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card title="Recent graduations" subtitle="Tokens that hit the graduation threshold on the Pons v2 curve.">
      <div className="p-5">
        {loading && (
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10 mb-4">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" />
          </div>
        )}
        {err && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {err} <button onClick={() => void load()} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button>
          </div>
        )}
        {!loading && grads.length === 0 && !err && (
          <p className="py-4 text-sm text-white/35">No recent graduations found.</p>
        )}
        {grads.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac' }}>
                {grads.length} graduated
              </span>
              <span className="font-mono text-[9px] text-white/25">source: {source}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {grads.slice(0, 8).map((l, i) => (
                  <div key={l.token ?? i} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]">
                    <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={32} tokenAddress={l.token} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{l.name ?? l.symbol ?? 'unnamed'}</p>
                      <p className="truncate font-mono text-[9px] text-white/35">MC {fmtUsd(l.marketCapUsd)} · {fmtAge(l.launchedAt)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Check className="h-3 w-3 text-green-400" />
                      <span className="font-mono text-[10px] font-bold" style={{ color: '#86efac' }}>Graduated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ── Section C: Launch Intelligence ────────────────────────────────────
function LaunchIntelligence() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/signals?limit=60&source=GRADE+A');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'failed');
      const rows: SignalRow[] = (d.signals ?? []).filter((s: any) => (s.source ?? '').toUpperCase().includes('GRADE'));
      // Sort by MC descending, take top 5
      const top5 = rows
        .filter(s => s.source === 'GRADE A')
        .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
        .slice(0, 5);
      setSignals(top5);
    } catch (e: any) { setErr(e?.message ?? 'Could not load signals'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card title="Launch intelligence" subtitle="Top 5 Grade A signals — MC, liquidity, holders from the live notifier pipeline.">
      <div className="p-5">
        {loading && (
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10 mb-4">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" />
          </div>
        )}
        {err && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {err} <button onClick={() => void load()} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button>
          </div>
        )}
        {!loading && signals.length === 0 && !err && (
          <p className="py-4 text-sm text-white/35">No Grade A signals at this time.</p>
        )}
        {signals.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-white/30 sm:grid"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
              <span>Token</span>
              <span className="text-right">MC</span>
              <span className="text-right">Liq</span>
              <span className="text-right">Holders</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {signals.map((s) => (
                <div key={s.id} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TokenIcon symbol={s.symbol} size={30} tokenAddress={s.tokenAddress} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{s.symbol}</p>
                      <p className="font-mono text-[9px] text-white/30">{s.ageText ?? '—'}</p>
                    </div>
                  </div>
                  <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(s.marketCapUsd)}</span>
                  <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(s.liquidityUsd)}</span>
                  <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{s.holdersTotal?.toLocaleString() ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Section D: Launch Token CTA ────────────────────────────────────────
function LaunchTokenCta() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LAUNCH_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.10) 60%, rgba(0,0,0,0.18) 100%)', border: '1px solid rgba(249,115,22,0.35)' }}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)' }}>
          <Rocket className="h-5 w-5 text-[#fdba74]" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Launch a token via PonsMCP SDK
          </h3>
          <p className="mt-0.5 text-xs text-white/50">
            Use the <span className="font-mono text-[#fdba74]">pons_launch_token</span> tool from any MCP-compatible agent runtime.
            No browser execution — your key stays in the agent runtime.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="font-mono text-[10px] text-white/35">agent runtime · TypeScript</span>
          <button onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition"
            style={copied ? { background: 'rgba(74,222,128,0.15)', color: '#86efac' } : { background: 'rgba(249,115,22,0.12)', color: '#fdba74' }}>
            {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-white/70">{LAUNCH_CMD}</pre>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ['Install', 'npm i @ponsmcp/sdk'],
          ['Docs', 'mcp.ponsmcp.ai/mcp'],
          ['Factory', '0x7eD598…01EC7e'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/30">{label}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-white/60">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section E: Scan Interesting ────────────────────────────────────────
type ScoredLaunch = LaunchRow & { score: number };

function ScanInteresting() {
  const [results, setResults] = useState<ScoredLaunch[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ran, setRan] = useState(false);

  const scan = async () => {
    setLoading(true); setErr(''); setRan(true);
    try {
      const res = await fetch('/api/launches');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'failed');
      const all: LaunchRow[] = d.launches ?? [];

      // Score: liq * holders / MC  (higher = more interesting)
      const scored: ScoredLaunch[] = all
        .map(l => ({
          ...l,
          score: (l.liquidityUsd ?? 0) * ((l as any).holdersTotal ?? (l as any).holders ?? 1) / Math.max(l.marketCapUsd ?? 1, 1),
        }))
        .filter(l => l.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setResults(scored);
    } catch (e: any) { setErr(e?.message ?? 'Scan failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(16,16,16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#fdba74]" />
            <h3 className="text-sm font-bold text-white">Scan interesting</h3>
          </div>
          <p className="mt-1 text-xs text-white/45">
            Scores all launches by <span className="font-mono text-white/60">liq × holders / MC</span> — surfaces under-valued liquidity.
          </p>
        </div>
        <button onClick={scan} disabled={loading}
          className="btn-primary inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-60">
          {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</> : <><Zap className="h-3.5 w-3.5" /> Run scan</>}
        </button>
      </div>

      {err && (
        <div className="rounded-lg px-4 py-3 text-sm mb-3" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          {err}
        </div>
      )}

      {ran && !loading && results.length === 0 && !err && (
        <p className="py-3 text-sm text-white/35">No scorable launches found (missing liquidity / MC data).</p>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="hidden grid-cols-[auto_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-white/30 sm:grid"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
            <span>#</span>
            <span>Token</span>
            <span className="text-right">Liq</span>
            <span className="text-right">MC</span>
            <span className="text-right">Score</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {results.map((l, i) => (
              <div key={l.token ?? i} className="grid grid-cols-[auto_2fr_1fr] sm:grid-cols-[auto_2fr_1fr_1fr_1fr] items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]">
                <span className="font-mono text-xs text-[#f97316] font-bold">{i + 1}</span>
                <div className="flex min-w-0 items-center gap-2.5">
                  <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={28} tokenAddress={l.token} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">{l.name ?? l.symbol ?? 'unnamed'}</p>
                    <span className="rounded-full px-1.5 py-0 font-mono text-[9px] font-bold"
                      style={{ background: tierColor(l.tier).bg, color: tierColor(l.tier).fg }}>{l.tier}</span>
                  </div>
                </div>
                <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(l.liquidityUsd)}</span>
                <span className="hidden text-right font-mono text-[11px] text-white/70 sm:block">{fmtUsd(l.marketCapUsd)}</span>
                <span className="text-right font-mono text-[11px] font-bold text-[#fdba74]">{l.score.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────
export function LaunchpadPanel() {
  return (
    <div className="grid gap-5">
      <RecentLaunches />

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentGraduations />
        <LaunchIntelligence />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LaunchTokenCta />
        <ScanInteresting />
      </div>
    </div>
  );
}
