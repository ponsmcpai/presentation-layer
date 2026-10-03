import { CheckCircle2, ExternalLink, FileCheck2, Loader2 } from 'lucide-react';
import { Card } from './Primitives';
import { UnlockedContent } from './UnlockedContent';
import { RH_EXPLORER, type Quote } from './shared';

export type Receipt = { status: 'success' | 'reverted'; block: string; gas: string; hash: string };
export type Unlocked = { kind: string; data: any } | null;

// ── TAB: Receipts — verify a tx hash and reveal unlocked paid content ───
export function ReceiptsPanel({
  txHash, setTxHash, verifyReceipt, receiptBusy, receipt, quote,
  unlocked, unlockedBusy, fetchUnlocked,
}: {
  txHash: string;
  setTxHash: (v: string) => void;
  verifyReceipt: () => void;
  receiptBusy: boolean;
  receipt: Receipt | null;
  quote: Quote | null;
  unlocked: Unlocked;
  unlockedBusy: boolean;
  fetchUnlocked: () => void;
}) {
  return (
    <Card title="Verify payment receipt" subtitle="Paste the hash returned by your PonsMCP agent. Reads Robinhood Chain directly." accent>
      <div className="grid items-start gap-3 p-6 lg:grid-cols-[1fr_auto]">
        <input
          value={txHash}
          onChange={(e) => { setTxHash(e.target.value); }}
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
              <button onClick={fetchUnlocked}
                className="btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold">
                {unlocked ? 'Refresh unlocked content' : 'View what you unlocked'} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* ===== UNLOCKED CONTENT — what you actually paid for ===== */}
          {quote?.protectedResource && receipt.status === 'success' && (
            <div className="mx-5 mb-5">
              {unlockedBusy && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" />
                  </div>
                  <p className="mt-3 font-mono text-xs text-white/45">Unlocking your content...</p>
                </div>
              )}
              {!unlockedBusy && unlocked && <UnlockedContent kind={unlocked.kind} data={unlocked.data} />}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
