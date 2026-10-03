import { Check } from 'lucide-react';
import { fmtPct, fmtPrice, fmtUsd, pctColor } from './shared';

// ── Unlocked paid content — what the user actually paid for ─────────────
export function UnlockedContent({ kind, data }: { kind: string; data: any }) {
  return (
    <div className="overflow-hidden rounded-xl animate-slide-fade-in" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.3)' }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.08)' }}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'rgba(74,222,128,0.25)' }}>
          <Check className="h-3 w-3 text-green-400" />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-400">Unlocked — paid content</p>
      </div>
      <div className="p-5">
        {kind === 'sandbox_receipt' && (
          <>
            <p className="text-sm font-bold text-white">{data.message ?? 'Payment rail verified.'}</p>
            <ul className="mt-3 space-y-2">
              {(data.what_this_proves ?? []).map((item: string) => (
                <li key={item} className="flex items-start gap-2 text-xs text-white/60"><Check className="mt-0.5 h-3 w-3 shrink-0 text-green-400" /> {item}</li>
              ))}
            </ul>
            {data.next_step && <p className="mt-3 rounded-lg px-3 py-2 text-xs text-white/55" style={{ background: 'rgba(255,255,255,0.04)' }}>{data.next_step}</p>}
          </>
        )}

        {kind === 'signal_digest' && (
          <>
            <p className="text-xs text-white/50">Latest {data.top_signals?.length ?? 0} Grade A signals, captured by the live notifier:</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              {(data.top_signals ?? []).map((s: any, i: number) => (
                <div key={s.address ?? i} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <span className="font-mono text-xs font-bold text-[#fdba74]">{s.symbol}</span>
                  <span className="font-mono text-[10px] text-white/50">{s.price_usd != null ? fmtPrice(s.price_usd) : '—'}</span>
                  <span className="font-mono text-[10px] text-white/40">{fmtUsd(s.market_cap_usd)}</span>
                  <span className="font-mono text-[10px] text-white/40">{s.holders ?? '—'} holders</span>
                  <span className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold" style={{ background: 'rgba(249,115,22,0.14)', color: '#fdba74' }}>{s.source}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {kind === 'stock_screener_report' && (
          <>
            <p className="text-xs text-white/50">All {data.universe} Robinhood Chain stocks, live-ranked by DEX liquidity:</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              {(data.ranked_by_liquidity ?? []).slice(0, 10).map((t: any, i: number) => (
                <div key={t.symbol} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <span className="font-mono text-xs font-bold text-white">{i + 1}. {t.symbol}</span>
                  <span className="font-mono text-[10px] text-white/60">{t.price_usd != null ? fmtPrice(t.price_usd) : '—'}</span>
                  <span className="font-mono text-[10px] text-white/40">{fmtUsd(t.liquidity_usd)} liq</span>
                  <span className="font-mono text-[10px]" style={{ color: pctColor(t.change_24h_pct) }}>{fmtPct(t.change_24h_pct)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-white/30">Showing top 10 of {data.ranked_by_liquidity?.length ?? 0}.</p>
          </>
        )}

        {kind === 'live_chain_snapshot' && (
          <>
            <p className="text-xs text-white/50">{data.note}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <p className="text-[10px] uppercase text-white/35">Factory config count</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#fdba74]">{data.launch_config_count ?? '—'}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <p className="text-[10px] uppercase text-white/35">Latest block at unlock</p>
                <p className="mt-1 font-mono text-lg font-bold text-white">{data.latest_block?.toLocaleString() ?? '—'}</p>
              </div>
            </div>
            <p className="mt-2 font-mono text-[9px] text-white/30">{data.factory}</p>
          </>
        )}

        {kind === 'integration_guide' && (
          <>
            <p className="text-xs text-white/50">Your copy-paste SDK quickstart:</p>
            <div className="mt-2 rounded-lg p-3 font-mono text-[11px] leading-5" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fdba74' }}>
              <div>{data.install}</div>
              {(data.quickstart ?? []).map((line: string) => <div key={line}>{line}</div>)}
            </div>
            <p className="mt-2 text-[10px] text-white/35">Policy defaults: {data.policy_defaults?.per_tx_cap_usdg} USDG/tx · {data.policy_defaults?.daily_cap_usdg} USDG/day. Docs: {data.docs}</p>
          </>
        )}

        {kind === 'generic' && <p className="text-sm text-white/70">{data.content}</p>}
      </div>
    </div>
  );
}
