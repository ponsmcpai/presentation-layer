import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from './Primitives';
import { TokenIcon } from './TokenIcon';
import { SignalDrawer } from './SignalDrawer';
import { LaunchDrawer } from './LaunchDrawer';
import { TradePreview } from './TradePreview';
import { fmtPrice, fmtUsd, ipfsToHttp, pctColor, type LaunchRow, type SignalRow } from './shared';

// ── Main Market Intel panel ─────────────────────────────────────────────
export function LaunchIntelPanel() {
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
