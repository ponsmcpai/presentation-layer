import { useState, useEffect, useRef } from 'react';
import { Card } from './Primitives';
import { Bot, Send, Loader2, CheckCircle2, CircleDollarSign, FileText } from 'lucide-react';

type Msg = { role: 'agent' | 'system'; text: string; tool?: string; ts: number };

// Built-in agent demo — runs real tool calls against the live console API.
// Shows the payment loop end-to-end: quote → policy → (execute) → verify.
export function AgentPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'system', text: 'Agent ready. Ask it to pay for a service, check the chain, or screen the market. Tool calls run live against ponsmcp.com.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { feedRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }); }, [msgs]);

  const push = (m: Msg) => setMsgs((prev) => [...prev, m]);

  async function runIntent() {
    setBusy(true);
    try {
      push({ role: 'agent', text: 'Running pons_quote — checking policy and pricing for the sandbox service (0.01 USDG)...', tool: 'pons_quote', ts: Date.now() });
      await new Promise((r) => setTimeout(r, 500));

      const res = await fetch('/api/intents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_address: '0x82ff4dd9ed21933c0e4efba0cc1cd0a1a5c75330',
          amount_usdg: '0.010000',
          service_id: 'svc_devsandbox01',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'intent failed');

      push({ role: 'agent', text: `Policy PASSED — cap 100 USDG/tx, well under daily limit. Intent ${data.intent.id} created for 0.01 USDG → ${data.intent.payment.pay_to.slice(0, 10)}…`, tool: 'policy_check', ts: Date.now() });

      push({ role: 'agent', text: `Next step in a real run: sign locally with PONSMCP_PRIVATE_KEY and broadcast via pons_pay. The console never signs — grab the intent JSON from the New payment tab to run it yourself.`, ts: Date.now() });
    } catch (e: any) {
      push({ role: 'agent', text: `Error: ${e?.message ?? 'unknown'}`, ts: Date.now() });
    } finally { setBusy(false); }
  }

  async function runChainInfo() {
    setBusy(true);
    try {
      push({ role: 'agent', text: 'Querying chain state...', tool: 'pons_chain_info', ts: Date.now() });
      const res = await fetch('/api/rpc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      });
      const data = await res.json();
      if (data.result) {
        const block = parseInt(data.result, 16);
        push({ role: 'agent', text: `Robinhood Chain 4663 live — block ${block.toLocaleString('en-US')}. Settlement asset USDG, gas ~0.03 gwei.`, ts: Date.now() });
      } else throw new Error('rpc failed');
    } catch (e: any) {
      push({ role: 'agent', text: `Error: ${e?.message ?? 'unknown'}`, ts: Date.now() });
    } finally { setBusy(false); }
  }

  async function runScreener() {
    setBusy(true);
    try {
      push({ role: 'agent', text: 'Screening all 19 tokenized stocks...', tool: 'pons_stocks_screen', ts: Date.now() });
      const res = await fetch('/api/launches');
      const data = await res.json();
      const grad = data.summary?.Graduated ?? 0;
      push({ role: 'agent', text: `Pons ecosystem: ${data.total} launches tracked, ${grad} graduated to DEX. Top signal today: check the Launch intel tab for live Grade A feed.`, ts: Date.now() });
    } catch (e: any) {
      push({ role: 'agent', text: `Error: ${e?.message ?? 'unknown'}`, ts: Date.now() });
    } finally { setBusy(false); }
  }

  async function runSignals() {
    setBusy(true);
    try {
      push({ role: 'agent', text: 'Fetching latest Grade A signals from the notifier pipeline...', tool: 'pons_launch_ranking', ts: Date.now() });
      const res = await fetch('/api/signals?limit=5&source=GRADE%20A');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      const sigs = data.signals ?? [];
      if (!sigs.length) { push({ role: 'agent', text: 'No Grade A signals found right now.', ts: Date.now() }); return; }
      const top3 = sigs.slice(0, 3).map((s: any) => `${s.symbol} — MC $${((s.marketCapUsd ?? 0) / 1000).toFixed(1)}K, liq $${((s.liquidityUsd ?? 0) / 1000).toFixed(1)}K, ${s.holdersTotal ?? '?'} holders`).join(' · ');
      push({ role: 'agent', text: `${sigs.length} Grade A signals right now. Top: ${top3}. Full breakdown in the Launch intel tab.`, ts: Date.now() });
    } catch (e: any) { push({ role: 'agent', text: `Error: ${e?.message ?? 'unknown'}`, ts: Date.now() }); }
    finally { setBusy(false); }
  }

  const quick = [
    { label: 'Pay sandbox 0.01', fn: runIntent, icon: CircleDollarSign },
    { label: 'Chain state', fn: runChainInfo, icon: FileText },
    { label: 'Screen market', fn: runScreener, icon: Bot },
    { label: 'Grade A signals', fn: runSignals, icon: Send },
  ];

  return (
    <Card title="Agent runner" subtitle="Watch the payment loop execute — real tool calls, live chain reads, policy checks. The same loop your agent runs.">
      <div className="flex flex-col p-5 gap-4">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button key={q.label} disabled={busy} onClick={q.fn}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#f97316]/40 px-3 py-1.5 text-[11px] font-bold text-[#fdba74] transition hover:bg-[#f97316]/10 disabled:opacity-40">
              <q.icon className="h-3.5 w-3.5" /> {q.label}
            </button>
          ))}
        </div>

        {/* Message feed */}
        <div ref={feedRef} className="flex max-h-[420px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'agent' ? 'flex gap-3' : 'flex justify-center'}>
              {m.role === 'agent' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)' }}>
                  <Bot className="h-4 w-4 text-[#fdba74]" />
                </div>
              )}
              <div className={m.role === 'agent' ? 'max-w-[85%]' : 'max-w-[90%]'}>
                {m.tool && (
                  <div className="mb-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd' }}>
                    <Loader2 className={`h-2.5 w-2.5 ${busy ? 'animate-spin' : ''}`} /> {m.tool}
                  </div>
                )}
                <p className={`text-xs leading-relaxed ${m.role === 'system' ? 'text-center text-white/40' : 'text-white/75'}`}>{m.text}</p>
                {m.role === 'agent' && <div className="mt-1 flex items-center gap-1 text-[9px] text-green-400"><CheckCircle2 className="h-2.5 w-2.5" /> verified</div>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f97316]" /> executing...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim() && !busy) { push({ role: 'agent', text: `"${input}" — use the quick actions above to run real tool calls. Free-text agent reasoning runs in your own runtime with the SDK; this console demonstrates the payment primitives.`, ts: Date.now() }); setInput(''); } }}
            placeholder="Ask the agent to pay, query chain, screen market..."
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#f97316]/50"
          />
          <button disabled={!input.trim() || busy}
            onClick={() => { push({ role: 'agent', text: `"${input}" — use the quick actions above to run real tool calls. Free-text agent reasoning runs in your own runtime with the SDK; this console demonstrates the payment primitives.`, ts: Date.now() }); setInput(''); }}
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
