import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { TokenIcon } from './TokenIcon';
import { Row } from './DetailBits';
import type { LaunchRow } from './shared';

// ── Buy/sell preview (pure math via curve inputs) ───────────────────────
export function TradePreview({ launch, onClose }: { launch: LaunchRow; onClose: () => void }) {
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
          <TokenIcon src={launch.logo ? `/api/logo?url=${encodeURIComponent(launch.logo.startsWith('ipfs://') ? 'https://flap.mypinata.cloud/ipfs/' + launch.logo.slice(7) : launch.logo)}` : null} symbol={launch.symbol ?? '?'} size={40} />
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
