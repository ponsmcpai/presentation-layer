import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Sparkline } from './Sparkline';
import { TokenIcon } from './TokenIcon';
import { Section, Grid, Cell } from './DetailBits';
import { fmtPct, fmtPrice, fmtUsd, pctColor, type SignalRow } from './shared';

// ── Analysis drawer for a signal token (GMGN-style breakdown) ───────────
export function SignalDrawer({ signal, onClose }: { signal: SignalRow; onClose: () => void }) {
  const [chart, setChart] = useState<[number, number][] | null>(null);
  const [chartErr, setChartErr] = useState(false);
  const [chartRange, setChartRange] = useState<'1' | '7' | '30'>('1');

  useEffect(() => {
    let alive = true;
    setChart(null); setChartErr(false);
    (async () => {
      try {
        const resMap = { '1': 'hour', '7': 'hour', '30': 'day' } as Record<string, string>;
        const limitMap = { '1': 24, '7': 48, '30': 30 };
        const res = await fetch(`/api/token-chart?token=${signal.tokenAddress}&res=${resMap[chartRange]}&limit=${limitMap[chartRange]}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'chart failed');
        // candles: [timestamp_sec, open, high, low, close, volume] → convert to [ms, close] for Sparkline
        const pts = (data.candles ?? []).map((c: number[]) => [c[0] * 1000, c[4]] as [number, number]);
        if (alive) setChart(pts.length > 1 ? pts : null);
      } catch { if (alive) setChartErr(true); }
    })();
    return () => { alive = false; };
  }, [chartRange, signal.tokenAddress]);

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
              <p className="text-xs font-bold text-white/70">{signal.symbol} · GeckoTerminal · Robinhood Chain</p>
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
