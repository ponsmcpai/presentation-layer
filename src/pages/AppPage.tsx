import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Boxes, Check, CheckCircle2, CircleDollarSign, Copy,
  ExternalLink, FileCheck2, Gauge, Loader2, Network, Radio, ShieldCheck, Wallet,
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
  protectedResource: string;
  verifyEndpoint: string;
};

type Live = { block: string; gas: string };
type IntentRow = { id: string; status: 'pending' | 'paid' | 'failed'; payment: { amount_usdg: string; pay_to: string }; tx_hash: string | null; created_at: string };
type Service = { id: string; merchant: string; name: string; resource_path: string; price_usdg: string; active: boolean };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-md p-1.5 transition-colors hover:bg-white/10"
      style={{ color: 'rgba(255,255,255,0.45)' }}
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
        {done ? <Check className="w-3.5 h-3.5" /> : number}
      </div>
      <span className="text-xs font-semibold" style={{ color: active || done ? 'white' : 'rgba(255,255,255,0.4)' }}>{title}</span>
    </div>
  );
}

export function AppPage() {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('5.00');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState<Live>({ block: '—', gas: '—' });
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ status: 'success' | 'reverted'; block: string; gas: string; hash: string } | null>(null);
  const [history, setHistory] = useState<IntentRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);

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
  }, []);

  useEffect(() => { void refreshLive(); }, [refreshLive]);
  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/intents?limit=6');
      const data = await response.json();
      if (response.ok) setHistory(data.intents ?? []);
    } catch { /* activity is non-critical; keep the console usable */ }
  }, []);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);
  const refreshServices = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/services');
      const data = await response.json();
      if (response.ok && Array.isArray(data.services)) setServices(data.services);
    } catch { /* empty/unavailable catalog must not block payment creation */ }
  }, []);
  useEffect(() => { void refreshServices(); }, [refreshServices]);

  const createQuote = async () => {
    setError('');
    const parsed = Number(amount);
    if (!addrOk(merchant)) { setError('Enter a valid merchant wallet address (0x + 40 hex characters).'); return; }
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) { setError('Amount must be greater than 0 and within the 100 USDG per-payment policy cap.'); return; }
    try {
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
      void refreshHistory();
    } catch (e: any) { setError(e?.message ?? 'Could not create payment intent.'); }
  };

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) { setError('No browser wallet detected. Install a wallet to view its address; payment signing remains in the PonsMCP server.'); return; }
    setWalletBusy(true);
    try {
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(accounts[0] ?? null);
    } catch (e: any) { setError(e?.message ?? 'Wallet connection declined.'); }
    finally { setWalletBusy(false); }
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

  return (
    <div className="min-h-screen" style={{ paddingTop: 96 }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex items-start justify-between gap-5 flex-wrap mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm mb-3" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.035em' }}>
              Mission <span className="gradient-text">Control</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Create a policy-safe MPP payment request. Your agent quotes in USDG, validates constraints, then executes from your own PonsMCP server with a verifiable on-chain receipt.
            </p>
          </div>
          <button
            onClick={connectWallet}
            disabled={walletBusy}
            className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-full inline-flex items-center gap-2 disabled:opacity-60"
          >
            {walletBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect wallet'}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            ['$MCP token', 'Contract unannounced', 'No market data until launch'],
            ['MCP tool surface', '9 tools', 'Reads · policy · proof'],
            ['Latest block', live.block, 'Robinhood Chain · 4663'],
            ['Network gas', live.gas, 'Gas token: ETH'],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>{label}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace" }}>{sub}</p>
            </div>
          ))}
        </div>

        <section className="mc-runtime mb-5">
          <div className="mc-runtime-head"><div><span className="mc-kicker"><Radio /> AGENT RUNTIME</span><h2>Ready for an agent, not a browser wallet.</h2></div><div className="mc-runtime-live"><span /> Robinhood Chain · 4663</div></div>
          <div className="mc-runtime-grid">
            <div><Gauge /><b>Policy-bounded</b><p>100 USDG per transaction · 1,000 USDG daily default.</p></div>
            <div><ShieldCheck /><b>Key boundary</b><p>Private signing stays inside your configured PonsMCP runtime.</p></div>
            <div><Boxes /><b>Merchant catalog</b><p>{services.length ? `${services.length} registered service${services.length === 1 ? '' : 's'} available.` : 'No public services registered yet.'}</p></div>
          </div>
          {services.length > 0 && <div className="mc-service-row">{services.slice(0, 3).map((service) => <button key={service.id} onClick={() => { setMerchant(service.merchant); setAmount(Number(service.price_usdg).toFixed(2)); setQuote(null); }}><span>{service.name}</span><b>{Number(service.price_usdg).toFixed(2)} USDG</b><small>{service.merchant.slice(0, 6)}…{service.merchant.slice(-4)}</small></button>)}</div>}
        </section>

        <div className="rounded-2xl p-4 mb-5 flex flex-wrap items-center gap-5" style={{ background: 'rgba(16, 16, 16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Step number={1} title="Create request" active={!quote} done={!!quote} />
          <div className="hidden sm:block h-px w-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <Step number={2} title="Review quote" active={!!quote} done={false} />
          <div className="hidden sm:block h-px w-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <Step number={3} title="Agent execution" active={false} />
          <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Payments never sign in this browser</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <section className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: 'rgba(16, 16, 16,0.62)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <CircleDollarSign className="w-5 h-5" style={{ color: '#f97316' }} />
              <div>
                <h2 className="text-base font-bold" style={{ color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>New MPP payment request</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>USDG settlement · Robinhood Chain · per-payment limit 100 USDG</p>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>Merchant wallet</span>
                <input
                  value={merchant}
                  onChange={(e) => { setMerchant(e.target.value); setQuote(null); }}
                  placeholder="0x…"
                  spellCheck={false}
                  className="w-full rounded-lg px-3.5 py-3 outline-none text-sm"
                  style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${merchant && !addrOk(merchant) ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.13)'}`, color: '#fff7ed', fontFamily: "'DM Mono', monospace" }}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>The recipient that receives USDG after the agent executes the payment.</span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>Amount</span>
                <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.13)' }}>
                  <input
                    type="number" min="0.01" max="100" step="0.01"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
                    className="min-w-0 flex-1 px-3.5 py-3 outline-none text-sm"
                    style={{ background: 'transparent', color: 'white', fontFamily: "'DM Mono', monospace" }}
                  />
                  <span className="flex items-center px-4 text-sm font-bold" style={{ background: 'rgba(249,115,22,0.15)', color: '#fed7aa', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>USDG</span>
                </div>
              </label>
              {error && <p className="text-sm rounded-lg px-3.5 py-3" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
              <button onClick={createQuote} className="btn-primary w-full py-3 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2">
                Create payment quote <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          <aside className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(16, 16, 16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: '#4ade80' }} />
              <h2 className="text-sm font-bold" style={{ color: 'white' }}>Policy guard</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[
                ['Settlement asset', 'USDG (6 decimals)'],
                ['Network', 'Robinhood Chain · 4663'],
                ['Per-payment cap', '100 USDG'],
                ['Daily limit', '1,000 USDG'],
              ].map(([k, v]) => <div key={k} className="flex items-center justify-between gap-3 text-xs"><span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span><span className="text-right" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Mono', monospace" }}>{v}</span></div>)}
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                The server checks policy and available balance before broadcast. A payment is complete only after a successful chain receipt.
              </p>
            </div>
          </aside>
        </div>

        {quote && (
          <section className="mt-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(20, 20, 20,0.75)', border: '1px solid rgba(249,115,22,0.32)' }}>
            <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400" /><h2 className="font-bold" style={{ color: 'white' }}>Quote ready for your agent</h2></div>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac', fontFamily: "'DM Mono', monospace" }}>POLICY PASSED</span>
            </div>
            <div className="p-6 grid lg:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>You pay</p><p className="mt-1 text-xl font-bold" style={{ color: 'white' }}>{quote.amount.toFixed(2)} USDG</p></div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Network</p><p className="mt-1 text-sm font-bold" style={{ color: 'white' }}>Robinhood Chain</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Chain ID 4663</p></div>
                <div className="col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Merchant</p><p className="mt-1 text-xs break-all" style={{ color: '#fed7aa', fontFamily: "'DM Mono', monospace" }}>{quote.merchant}</p></div>
                <div className="col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Persistent intent</p><p className="mt-1 text-xs break-all" style={{ color: '#fed7aa', fontFamily: "'DM Mono', monospace" }}>{quote.id}</p></div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'white' }}>Send this to PonsMCP</p>
                <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div className="absolute right-2 top-2"><CopyButton value={serverRequest} /></div>
                  <pre className="text-xs overflow-x-auto pr-8" style={{ color: '#f97316', fontFamily: "'DM Mono', monospace" }}>{serverRequest}</pre>
                </div>
                <p className="text-xs leading-relaxed mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Run this through your configured MCP client. The server owns signing; it returns the transaction hash and verified receipt. This web console never receives a private key.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(16, 16, 16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <FileCheck2 className="w-5 h-5" style={{ color: '#f97316' }} />
            <div><h2 className="font-bold" style={{ color: 'white' }}>Verify payment receipt</h2><p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Paste the hash returned by your PonsMCP agent. This reads Robinhood Chain directly.</p></div>
          </div>
          <div className="p-6 grid lg:grid-cols-[1fr_auto] gap-3 items-start">
            <div className="flex flex-col gap-2">
              <input
                value={txHash}
                onChange={(e) => { setTxHash(e.target.value); setReceipt(null); }}
                placeholder="0x transaction hash…"
                spellCheck={false}
                className="w-full rounded-lg px-3.5 py-3 outline-none text-sm"
                style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.13)', color: '#fed7aa', fontFamily: "'DM Mono', monospace" }}
              />
            </div>
            <button onClick={verifyReceipt} disabled={receiptBusy} className="btn-primary px-5 py-3 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {receiptBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />} Verify receipt
            </button>
          </div>
          {receipt && (
            <div className="mx-6 mb-6 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4" style={{ background: receipt.status === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${receipt.status === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
              <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5" style={{ color: receipt.status === 'success' ? '#4ade80' : '#f87171' }} /><div><p className="text-sm font-bold" style={{ color: 'white' }}>{receipt.status === 'success' ? 'Payment confirmed on-chain' : 'Transaction reverted'}</p><p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Block {receipt.block} · {receipt.gas} gas used</p></div></div>
              <div className="flex flex-wrap items-center gap-4"><a href={`${RH_EXPLORER}/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f97316' }}>View proof <ExternalLink className="w-3.5 h-3.5" /></a>{quote && receipt.status === 'success' && <a href={quote.protectedResource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#86efac' }}>Open unlocked resource <ExternalLink className="w-3.5 h-3.5" /></a>}</div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(16, 16, 16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div><h2 className="font-bold" style={{ color: 'white' }}>Recent payment intents</h2><p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Persisted settlement state — pending is expected until a matching receipt is verified.</p></div>
            <button onClick={() => void refreshHistory()} className="text-xs font-semibold" style={{ color: '#f97316' }}>Refresh</button>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {history.length === 0 ? <p className="px-6 py-5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No payment intents yet.</p> : history.map((item) => (
              <div key={item.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-semibold" style={{ color: 'white' }}>{Number(item.payment.amount_usdg).toFixed(2)} USDG <span className="font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>→ {item.payment.pay_to.slice(0, 6)}…{item.payment.pay_to.slice(-4)}</span></p><p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace" }}>{item.id}</p></div>
                <div className="flex items-center gap-3"><span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: item.status === 'paid' ? 'rgba(74,222,128,0.12)' : 'rgba(249,115,22,0.12)', color: item.status === 'paid' ? '#86efac' : '#fed7aa' }}>{item.status.toUpperCase()}</span>{item.tx_hash && <a href={`${RH_EXPLORER}/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: '#f97316' }}>Proof</a>}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid md:grid-cols-3 gap-3">
          {[
            ['1', 'Quote', 'Enter a merchant address and USD amount. The client converts it to USDG base units.'],
            ['2', 'Authorize agent', 'Your configured PonsMCP server applies its transaction and daily policy limits.'],
            ['3', 'Verify receipt', 'The agent returns a transaction hash; inspect it in the Robinhood Chain explorer.'],
          ].map(([n, title, text]) => (
            <div key={n} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs font-bold" style={{ color: '#f97316', fontFamily: "'DM Mono', monospace" }}>0{n}</span>
              <h3 className="mt-2 text-sm font-bold" style={{ color: 'white' }}>{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{text}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Network className="w-3.5 h-3.5" />
          <span>Settlement token: <code style={{ color: '#f97316' }}>{USDG}</code></span>
          <a href={RH_EXPLORER} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: '#f97316' }}>Open explorer <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
      </div>
    </div>
  );
}
