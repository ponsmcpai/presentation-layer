import { CheckCircle2 } from 'lucide-react';
import { CopyButton } from './Primitives';
import type { Quote } from './shared';

// ── Quote-ready panel — shown after POST /api/intents succeeds ──────────
export function QuoteReady({ quote, serverRequest, onGoReceipts }: { quote: Quote; serverRequest: string; onGoReceipts: () => void }) {
  return (
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

      {/* What happens next — make the payoff explicit, not implied */}
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
        <button onClick={onGoReceipts} className="btn-secondary mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white/80">
          Paste the hash here once your agent pays →
        </button>
      </div>
    </section>
  );
}
