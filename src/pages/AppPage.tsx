// Mission Control orchestrator — state + data flow only.
// Presentation lives in src/components/* (Sparkline, TokenIcon, SignalDrawer,
// LaunchDrawer, TradePreview, UnlockedContent, Step, Card, panels).
import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Bot, Boxes, CircleDollarSign, FileCheck2, Gauge, Loader2,
  Menu, Network, Receipt, Settings, ShieldCheck, X,
} from 'lucide-react';
import { Step, Card } from '@/components/Primitives';
import { StatStrip, ActivityPanel, ChainStatusPanel, McpConnectCard } from '@/components/StatusPanels';
import { QuoteReady } from '@/components/QuoteReady';
import { ReceiptsPanel } from '@/components/ReceiptsPanel';
import { AgentPanel } from '@/components/AgentPanel';
import { ServicesPanel, McpToolsPanel } from '@/components/ServicesPanel';
import { LaunchIntelPanel } from '@/components/LaunchIntelPanel';
import { IntegrationPanel, PolicyPanel, SettingsPanel, Sidebar } from '@/components/MiscPanels';
import { rpc, hexToBig, addrOk, type Quote, type Live, type IntentRow, type Service } from '@/components/shared';

const NAV = [
  { group: 'AGENT', items: [
    { key: 'Agent runner', icon: Bot },
  ] },
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

export function AppPage() {
  const [tab, setTab] = useState<Tab>('Agent runner');
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [justPassedPolicy, setJustPassedPolicy] = useState(false);
  const [unlocked, setUnlocked] = useState<{ kind: string; data: any } | null>(null);
  const [unlockedBusy, setUnlockedBusy] = useState(false);
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

  useEffect(() => {
    const saved = localStorage.getItem('ponsmcp_default_recipient');
    if (saved && /^0x[0-9a-fA-F]{40}$/.test(saved)) setMerchant(saved);
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
    setQuoteBusy(true); setUnlocked(null);
    setQuote(null);
    setJustPassedPolicy(false);
    try {
      // Give the policy check a visible beat — this is a real server round trip,
      // not a canned animation, but we don't want it to feel instantaneous either.
      await new Promise((r) => setTimeout(r, 380));
      const response = await fetch('/api/intents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_address: merchant, amount_usdg: parsed.toFixed(6), ...(selectedServiceId ? { service_id: selectedServiceId } : {}) }),
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

  const fetchUnlocked = useCallback(async (resource?: string) => {
    const url = resource ?? quote?.protectedResource;
    if (!url) return;
    setUnlockedBusy(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data) setUnlocked({ kind: data.data.kind ?? 'generic', data: data.data });
    } catch { /* unlocked content fetch is best-effort; receipt is still shown */ }
    finally { setUnlockedBusy(false); }
  }, [quote]);

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
        // Fetch the unlocked resource — the actual thing the user paid for.
        if (quote.protectedResource) await fetchUnlocked(quote.protectedResource);
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

  const navForSidebar = NAV.map((g) => ({ group: g.group, items: g.items.map((i) => ({ key: i.key, icon: i.icon })) }));
  const pendingCount = history.filter((i) => i.status === 'pending').length;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar nav={navForSidebar} tab={tab} onSelect={(k) => setTab(k as Tab)} pendingCount={pendingCount} />
      </div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar nav={navForSidebar} tab={tab} onSelect={(k) => { setTab(k as Tab); setNavOpen(false); }} pendingCount={pendingCount} />
          </div>
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

          <StatStrip mcpPrice={mcpPrice} live={live} liveTick={liveTick} />

          {/* ============ TAB: NEW PAYMENT ============ */}
          {tab === 'Agent runner' && <AgentPanel />}

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
                          <button key={service.id} onClick={() => { setMerchant(service.merchant); setAmount(Number(service.price_usdg).toFixed(2)); setSelectedServiceId(service.id); setQuote(null); }}
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

              {quote && <QuoteReady quote={quote} serverRequest={serverRequest} onGoReceipts={() => setTab('Receipts')} />}
            </>
          )}

          {/* ============ TAB: RECEIPTS ============ */}
          {tab === 'Receipts' && (
            <ReceiptsPanel
              txHash={txHash} setTxHash={setTxHash} verifyReceipt={verifyReceipt}
              receiptBusy={receiptBusy} receipt={receipt} quote={quote}
              unlocked={unlocked} unlockedBusy={unlockedBusy} fetchUnlocked={() => void fetchUnlocked()}
            />
          )}

          {/* ============ TAB: ACTIVITY ============ */}
          {tab === 'Activity' && <ActivityPanel history={history} refreshHistory={() => void refreshHistory()} />}

          {/* ============ TAB: CHAIN STATUS ============ */}
          {tab === 'Chain status' && <ChainStatusPanel live={live} />}

          {/* ============ TAB: SERVICES ============ */}
          {tab === 'Services' && (
            <ServicesPanel
              services={services}
              onBuy={(service) => { setMerchant(service.merchant); setAmount(Number(service.price_usdg).toFixed(2)); setSelectedServiceId(service.id); setTab('New payment'); setQuote(null); }}
            />
          )}

          {/* ============ TAB: MCP TOOLS ============ */}
          {tab === 'MCP tools' && (
            <div className="grid gap-5">
              <McpToolsPanel />
              <McpConnectCard />
            </div>
          )}

          {/* ============ TAB: LAUNCH INTEL ============ */}
          {tab === 'Launch intel' && <LaunchIntelPanel />}

          {/* ============ TAB: INTEGRATION / POLICY / SETTINGS ============ */}
          {tab === 'Integration' && <IntegrationPanel />}
          {tab === 'Policy' && <PolicyPanel />}
          {tab === 'Settings' && <SettingsPanel settingsSnippet={settingsSnippet} />}
        </div>
      </div>
    </div>
  );
}
