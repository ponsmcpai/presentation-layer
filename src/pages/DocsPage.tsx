import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Terminal,
} from 'lucide-react';
import { DOC_SECTIONS, type DocSection } from './docsContent';

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-4">
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
        className="absolute right-2.5 top-2.5 rounded-md border border-white/10 bg-black/40 p-1.5 text-white/40 transition hover:text-white"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#101010] p-4 text-[12.5px] leading-6 text-[#ffce9f]"><code>{children}</code></pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="scroll-mt-24 border-t border-white/10 pt-9 font-display text-[26px] font-semibold tracking-[-0.03em] text-white md:text-[30px]">{children}</h2>;
}

const ROWS: Record<DocSection, Array<[string, string, string]>> = {
  overview: [],
  install: [
    ['Node.js', '20 or later', 'required'],
    ['RPC endpoint', 'public Robinhood Chain + fallback', 'built in'],
    ['Agent wallet', 'ETH gas + USDG', 'only for payments'],
  ],
  config: [
    ['PONSMCP_PRIVATE_KEY', 'agent signing key (64 hex)', 'optional — only wallet reads/pay'],
    ['PONSMCP_MAX_PER_TX', '100000000', '100 USDG default'],
    ['PONSMCP_DAILY_LIMIT', '1000000000', '1,000 USDG default'],
    ['PONSMCP_RPC_URL', 'custom chain-4663 endpoint', 'optional override'],
  ],
  tools: [
    ['pons_chain_info', '—', 'network, block, gas, canonical addresses'],
    ['pons_price', '—', 'PONS market snapshot'],
    ['pons_launch_info', 'token', 'pons v1 metadata, pool, socials'],
    ['pons_launch_market', 'token', 'live pairs, price, liquidity'],
    ['pons_token_info', 'token', 'ERC-20 name/symbol/supply'],
    ['pons_balance', 'token?', 'agent wallet balance (needs key)'],
    ['pons_quote', 'amountUsd', 'USD → USDG base units, no execution'],
    ['pons_pay', 'payTo, amountUsd', 'policy → sign → broadcast → receipt'],
    ['pons_tx_status', 'txHash', 'receipt + decoded transfers'],
  ],
  flow: [],
  security: [],
};

export function DocsPage() {
  const [active, setActive] = useState<DocSection>('overview');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as DocSection;
    if (hash in ROWS) setActive(hash);
  }, []);

  const go = (section: DocSection) => {
    setActive(section);
    window.history.replaceState(null, '', `/docs#${section}`);
  };

  return (
    <main className="min-h-screen pt-24 pb-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[240px_1fr] lg:px-8">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">PonsMCP manual</div>
            <nav className="space-y-1">
              {DOC_SECTIONS.map(([section, label]) => (
                <button
                  key={section}
                  onClick={() => go(section)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${active === section ? 'bg-[#f97316]/12 text-[#fdba74]' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/50">
              Settlement runs in USDG on Robinhood Chain 4663. $MCP contract details are announced only at official launch.
            </div>
          </div>
        </aside>

        {/* Content */}
        <article className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to PonsMCP</Link>
            <a href="https://github.com/ponsmcpai/ponsmcp-sdk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316]">GitHub <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>

          <span className="inline-flex rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#fdba74]">docs · complete guide</span>
          <h1 className="mt-5 text-[38px] font-bold leading-[1.04] tracking-[-0.04em] text-white md:text-[56px]">The PonsMCP operating manual.</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-white/60 md:text-[17px]">
            PonsMCP gives autonomous agents a small, inspectable tool surface: pons launch intelligence, USDG payment quotes, local policy checks, Robinhood Chain execution, and on-chain receipt verification.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/app" className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">Open Mission Control <ArrowRight className="h-4 w-4" /></Link>
            <a href="#tools" onClick={() => go('tools')} className="btn-secondary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">Jump to tool reference</a>
          </div>

          {/* Mobile section pills */}
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {DOC_SECTIONS.map(([section, label]) => (
              <button key={section} onClick={() => go(section)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${active === section ? 'bg-[#f97316]/15 text-[#fdba74]' : 'border border-white/10 text-white/55'}`}>{label}</button>
            ))}
          </div>

          {/* OVERVIEW */}
          {active === 'overview' && (
            <div className="mt-10 space-y-4">
              {[
                ['What is PonsMCP?', 'A Model Context Protocol server and TypeScript SDK. Agents call tools to read pons launch data, quote payments, and settle in USDG with verifiable receipts.'],
                ['Who holds keys?', 'Your agent runtime does. The browser console never receives a private key and never signs.'],
                ['What makes a payment "done"?', 'A successful on-chain receipt with the exact USDG transfer — not a UI confirmation.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/55">{text}</p>
                </div>
              ))}
            </div>
          )}

          {/* INSTALL */}
          {active === 'install' && (
            <div className="mt-10">
              <H2 id="install">Installation</H2>
              <p className="mt-4 text-sm leading-7 text-white/60">Install the published package and start the stdio MCP server:</p>
              <Code>{`npm install -g @ponsmcp/sdk

# read-only tools work without any key:
ponsmcp`}</Code>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                {ROWS.install.map(([k, v, note]) => (
                  <div key={k} className="flex items-center justify-between gap-4 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 last:border-0">
                    <span className="text-sm text-white/70">{k}</span>
                    <span className="text-right"><span className="font-mono text-xs text-[#fdba74]">{v}</span><span className="ml-3 text-[11px] text-white/35">{note}</span></span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">Wallet keys belong in the MCP server environment only — never in a browser, repo, or chat message.</p>
            </div>
          )}

          {/* CONFIG */}
          {active === 'config' && (
            <div className="mt-10">
              <H2 id="configuration">MCP configuration</H2>
              <Code>{`{
  "mcpServers": {
    "ponsmcp": {
      "command": "ponsmcp",
      "env": {
        "PONSMCP_MAX_PER_TX": "100000000",
        "PONSMCP_DAILY_LIMIT": "1000000000"
      }
    }
  }
}`}</Code>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                {ROWS.config.map(([k, v, note]) => (
                  <div key={k} className="flex items-center justify-between gap-4 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3 last:border-0">
                    <span className="font-mono text-xs text-white/70">{k}</span>
                    <span className="text-right"><span className="font-mono text-xs text-[#fdba74]">{v}</span><span className="ml-3 text-[11px] text-white/35">{note}</span></span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">USDG uses 6 decimals: 1000000 base units = 1 USDG.</p>
            </div>
          )}

          {/* TOOLS */}
          {active === 'tools' && (
            <div className="mt-10">
              <H2 id="tools">Tool reference — all 9</H2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[1.1fr_0.9fr_1.6fr] gap-2 border-b border-white/10 bg-white/[0.05] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                  <span>Tool</span><span>Input</span><span>Returns</span>
                </div>
                {ROWS.tools.map(([tool, input, desc]) => (
                  <div key={tool} className="grid grid-cols-[1.1fr_0.9fr_1.6fr] gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs last:border-0">
                    <span className="font-mono text-[#fdba74]">{tool}</span>
                    <span className="font-mono text-white/45">{input}</span>
                    <span className="text-white/60">{desc}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">Only <span className="font-mono text-[#fdba74]">pons_pay</span> moves funds. Everything else is read-only and needs no wallet.</p>
            </div>
          )}

          {/* PAYMENT FLOW */}
          {active === 'flow' && (
            <div className="mt-10">
              <H2 id="payment-flow">Payment lifecycle</H2>
              <div className="mt-5 grid gap-3">
                {[
                  ['01', 'Quote', 'pons_quote converts a USD amount to 6-decimal USDG base units. No approval, no broadcast.'],
                  ['02', 'Policy', 'pons_pay checks the per-transaction cap and daily budget before touching a key.'],
                  ['03', 'Balance', 'The configured wallet must hold enough USDG — otherwise nothing broadcasts.'],
                  ['04', 'Sign + broadcast', 'An EIP-155 legacy transaction for chain 4663, signed locally.'],
                  ['05', 'Receipt', 'Success means status 0x1 with the exact USDG Transfer event — returned with hash, block, gas, decoded transfers.'],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <span className="font-mono text-xs text-[#f97316]">{n}</span>
                    <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/55">{text}</p></div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">Merchants must independently verify the receipt's token, recipient, amount, and uniqueness against their own payment intent.</p>
            </div>
          )}

          {/* SECURITY */}
          {active === 'security' && (
            <div className="mt-10">
              <H2 id="security">Security model</H2>
              <div className="mt-5 grid gap-3">
                {[
                  ['Key boundary', 'Private keys live only in the configured MCP server process. The web console creates and inspects intents — it never signs.'],
                  ['Policy boundary', 'Configurable per-tx and daily caps are checked before broadcast. Lower blast radius for autonomous agents.'],
                  ['Proof boundary', 'A hash alone is not proof. Receipts must carry the exact USDG transfer, and merchants must prevent hash reuse across intents.'],
                  ['Identity boundary', 'Token names and symbols are not identity. Always verify the contract address; $MCP details ship only at official launch.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-white/55">{text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-white/50"><Terminal className="h-4 w-4 text-[#f97316]" /> Security source: <a className="text-[#f97316]" href="https://github.com/ponsmcpai/ponsmcp-sdk" target="_blank" rel="noopener noreferrer">ponsmcpai/ponsmcp-sdk</a></p>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
