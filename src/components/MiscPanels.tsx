import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Primitives';
import { USDG, RH_EXPLORER } from './shared';
import { ExternalLink, Network, ShieldCheck } from 'lucide-react';

// ── Static developer tabs: Integration / Policy / Settings ──────────────

export function IntegrationPanel() {
  return (
    <Card title="Agent integration" subtitle="Three steps from install to verified settlement.">
      <div className="grid gap-3 p-5">
        {[
          ['1', 'Install the server', 'npm install -g @ponsmcp/sdk, then run ponsmcp in your agent runtime.'],
          ['2', 'Configure caps', 'Set PONSMCP_MAX_PER_TX and PONSMCP_DAILY_LIMIT (USDG base units, 6 decimals).'],
          ['3', 'Execute from the agent', 'Call pons_quote to preview, pons_pay to settle. The tool returns the verified receipt.'],
        ].map(([n, title, text]) => (
          <div key={n} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="font-mono text-xs text-[#f97316]">0{n}</span>
            <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/55">{text}</p></div>
          </div>
        ))}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/docs" className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">Full documentation</Link>
          <a href="https://github.com/ponsmcpai/ponsmcp-sdk" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">GitHub</a>
        </div>
      </div>
    </Card>
  );
}

export function PolicyPanel() {
  return (
    <Card title="Spending policy" subtitle="Local, enforced before any key material is used.">
      <div className="p-5 text-sm leading-7 text-white/55">
        <p>PonsMCP applies two hard limits inside the agent runtime, both configurable through environment variables and both checked <b className="text-white">before signing</b>:</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          {[
            ['PONSMCP_MAX_PER_TX', '100000000', '100 USDG per transaction'],
            ['PONSMCP_DAILY_LIMIT', '1000000000', '1,000 USDG per day (in-process counter)'],
          ].map(([k, v, note]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs last:border-0">
              <span className="font-mono text-white/70">{k}</span>
              <span className="text-right"><span className="font-mono text-[#fdba74]">{v}</span><span className="ml-3 text-white/35">{note}</span></span>
            </div>
          ))}
        </div>
        <p className="mt-4">Balance is pre-checked: an underfunded wallet never reaches broadcast. A payment counts as complete only when the receipt is <span className="font-mono text-[#fdba74]">0x1</span> with the expected USDG Transfer event. The daily counter is in-process; operators who need durable budgets should run one server per agent and restart on schedule.</p>
      </div>
    </Card>
  );
}

export function SettingsPanel({ settingsSnippet }: { settingsSnippet: string }) {
  const [maxPerTx, setMaxPerTx] = useState(100);
  const [dailyLimit, setDailyLimit] = useState(1000);
  const [recipient, setRecipient] = useState('');
  const [envSnippet, setEnvSnippet] = useState(settingsSnippet);
  const [saved, setSaved] = useState(false);

  // Live regenerate env snippet when inputs change
  useEffect(() => {
    const lines = [
      '# PonsMCP agent runtime — required environment',
      'PONSMCP_PRIVATE_KEY=<your 32-byte hex key, generated offline>',
      '',
      `# Spending policy (your config)`,
      `PONSMCP_MAX_PER_TX=${Math.round(maxPerTx * 1_000_000)}     # ${maxPerTx} USDG per transaction (base units)`,
      `PONSMCP_DAILY_LIMIT=${Math.round(dailyLimit * 1_000_000)}   # ${dailyLimit.toLocaleString()} USDG per day (base units)`,
      '',
      '# Optional: pons launch intel via Alchemy',
      '# PONSMCP_ALCHEMY_KEY=<key>',
    ];
    setEnvSnippet(lines.join('\n'));
  }, [maxPerTx, dailyLimit]);

  const validRecipient = /^0x[0-9a-fA-F]{40}$/.test(recipient);

  return (
    <Card title="Server settings" subtitle="Configure your agent policy — live preview of the env config, then copy to your runtime.">
      <div className="flex flex-col gap-4 p-5">
        {/* Interactive policy config */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <label className="flex items-center justify-between text-xs">
              <span className="text-white/60">Max per transaction</span>
              <span className="font-mono text-[#fdba74]">{maxPerTx} USDG</span>
            </label>
            <input
              type="range" min={1} max={100} step={1} value={maxPerTx}
              onChange={(e) => { setMaxPerTx(Number(e.target.value)); setSaved(false); }}
              className="mt-2 w-full accent-[#f97316]"
            />
            <p className="mt-1 text-[10px] text-white/30">PONSMCP_MAX_PER_TX · 1-100 USDG (protocol hard cap)</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <label className="flex items-center justify-between text-xs">
              <span className="text-white/60">Daily spending limit</span>
              <span className="font-mono text-[#fdba74]">{dailyLimit.toLocaleString()} USDG</span>
            </label>
            <input
              type="range" min={100} max={10000} step={100} value={dailyLimit}
              onChange={(e) => { setDailyLimit(Number(e.target.value)); setSaved(false); }}
              className="mt-2 w-full accent-[#f97316]"
            />
            <p className="mt-1 text-[10px] text-white/30">PONSMCP_DAILY_LIMIT · 100-10,000 USDG</p>
          </div>
        </div>

        {/* Quick test recipient */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <label className="text-xs text-white/60">Default test recipient (optional)</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x…  (paste a wallet address)"
            spellCheck={false}
            className="mt-2 w-full rounded-lg px-3 py-2.5 text-xs outline-none"
            style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${recipient && !validRecipient ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.13)'}`, color: '#fff7ed', fontFamily: "'DM Mono', monospace" }}
          />
          <p className="mt-1 text-[10px] text-white/30">
            {recipient && !validRecipient ? '⚠️ Invalid address format' : 'Prefill the New payment form with this wallet (stored locally, never sent)'}
          </p>
          {validRecipient && (
            <button
              onClick={() => { localStorage.setItem('ponsmcp_default_recipient', recipient); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
              className="btn-primary mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold"
            >
              Save to this browser
            </button>
          )}
          {saved && <span className="ml-2 text-[11px] text-green-400">✓ Saved</span>}
        </div>

        {/* RPC chain info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/40">RPC failover chain (agent → chain)</p>
            <p className="mt-1 font-mono text-xs break-all text-white/80">Alchemy (primary) → nodeflare → routeme — 12s hard budget</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/40">Settlement console API (this origin)</p>
            <p className="mt-1 font-mono text-xs break-all text-white/80">https://ponsmcp.com/api</p>
          </div>
        </div>

        {/* Live env snippet */}
        <p className="text-sm font-semibold text-white">Runtime configuration (live preview)</p>
        <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="absolute right-2 top-2"><CopyButtonBox value={envSnippet} /></div>
          <pre className="overflow-x-auto pr-8 font-mono text-xs" style={{ color: '#f97316' }}>{envSnippet}</pre>
        </div>

        <p className="text-xs leading-relaxed text-white/45">
          Paste into the environment of the process that runs <span className="font-mono text-white/70">ponsmcp</span>. The private key is generated by you — this browser never sees it, receives it, or signs with it. Generate a fresh key with: <span className="font-mono text-white/70">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</span> (run it offline, then fund only what the agent is allowed to spend).
        </p>
        <div className="flex items-center gap-2 text-xs text-white/45"><ShieldCheck className="h-4 w-4 text-green-400" /> No cookies, no sessions, no account database — possession of the key in your runtime is the whole access model.</div>
      </div>
    </Card>
  );
}

// Late import kept at bottom for readability of the panels above.
import { CopyButton } from './Primitives';
function CopyButtonBox({ value }: { value: string }) {
  return <CopyButton value={value} />;
}

// ── Desktop + mobile navigation shell ───────────────────────────────────
export type NavGroup = { group: string; items: Array<{ key: string; icon: typeof Network }> };

export function Sidebar({ nav, tab, onSelect, pendingCount }: {
  nav: NavGroup[];
  tab: string;
  onSelect: (key: string) => void;
  pendingCount: number;
}) {
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0c0b09]">
      <div className="px-4 pb-3 pt-5">
        <Link to="/" className="group flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="size-[32px] rounded-lg object-cover" />
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.2em] text-white">PONSMCP</span>
            <span className="text-[9.5px] tracking-[0.14em] text-white/30">MISSION CONTROL</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {nav.map((group) => (
          <div key={group.group} className="mb-3">
            <div className="px-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.18em] text-white/40">{group.group}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const selected = tab === item.key;
                return (
                  <button key={item.key} onClick={() => onSelect(item.key)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition ${selected ? 'bg-[#f97316]/12 font-medium text-[#fdba74]' : 'text-white/60 hover:bg-white/[0.04] hover:text-white'}`}>
                    <item.icon className="h-4 w-4" />
                    {item.key}
                    {item.key === 'Activity' && pendingCount > 0 && (
                      <span className="ml-auto rounded-full bg-[#f97316]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#fdba74]">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] px-4 py-3.5">
        <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/35">Settlement</div>
        <a href={`${RH_EXPLORER}/token/${USDG}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 font-mono text-[11px] text-[#f97316]">USDG {USDG.slice(0, 8)}… <ExternalLink className="h-3 w-3" /></a>
      </div>
    </aside>
  );
}
