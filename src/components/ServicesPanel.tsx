import { ArrowRight, Check } from 'lucide-react';
import { Card } from './Primitives';
import type { Service } from './shared';

const SERVICE_META: Record<string, { desc: string; features: string[]; icon: string }> = {
  svc_devsandbox01: {
    desc: 'One-click end-to-end test of your payment rail at micro scale. Settles for a fraction of a cent and returns a full verification breakdown.',
    features: ['Cheapest live settlement', 'Full receipt verification', 'Proves the whole rail works'],
    icon: '⚡',
  },
  svc_signalfeed01: {
    desc: 'The 10 latest notifier-captured Grade A signals as structured data: price, market cap, ATH drawdown, liquidity, holders — delivered at unlock.',
    features: ['Latest 10 Grade A signals', 'Structured JSON payload', 'Same data as Live Signals tab'],
    icon: '📡',
  },
  svc_stockscreen01: {
    desc: 'All 19 Robinhood Chain tokenized stocks live-ranked by DEX liquidity at unlock time: price, 24h change, venue — a complete market snapshot.',
    features: ['All 19 stock tokens ranked', 'Live liquidity ordering', '24h change per ticker'],
    icon: '📈',
  },
  svc_sdkguide01: {
    desc: 'Drop-in TypeScript quickstart for wiring an agent to PonsMCP: install, key handling, policy caps, first settlement — copy-paste ready.',
    features: ['Install & config commands', 'Working pay() example', 'Policy defaults explained'],
    icon: '⌨',
  },
  svc_launchintel01: {
    desc: 'Live on-chain snapshot of the pons v2 launch factory computed at unlock time: config count, latest block, factory address. Fresh on every request.',
    features: ['Real chain read at unlock', 'Factory config count', 'Block-height proof'],
    icon: '◎',
  },
};

// ── TAB: Services — paid catalog + how-it-works ─────────────────────────
export function ServicesPanel({ services, onBuy }: { services: Service[]; onBuy: (service: Service) => void }) {
  return (
    <div className="grid gap-5">
      <Card title="Paid services" subtitle="Real deliverables, priced in USDG. Each unlocks its payload only after your agent's payment verifies on-chain.">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {services.map((service) => {
            const m = SERVICE_META[service.id] ?? { desc: 'Unlocks after on-chain receipt verification.', features: [], icon: '◇' };
            return (
              <div key={service.id} className="flex flex-col rounded-2xl border border-[#f97316]/25 bg-gradient-to-b from-[#f97316]/[0.06] to-transparent p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-[#fdba74]" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}>{m.icon}</div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Number(service.price_usdg).toFixed(2)}</p>
                    <p className="font-mono text-[10px] text-white/35">USDG · one-time</p>
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-bold text-white">{service.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">{m.desc}</p>
                {m.features.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-white/45"><Check className="h-3 w-3 text-green-400" /> {f}</li>
                    ))}
                  </ul>
                )}
                <button onClick={() => onBuy(service)}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold">
                  Buy with agent payment <ArrowRight className="h-3 w-3" />
                </button>
                <p className="mt-2 text-center font-mono text-[9px] text-white/25">{service.id}</p>
              </div>
            );
          })}
        </div>
        {services.length === 0 && (
          <p className="p-5 text-sm text-white/45">No public services registered yet.</p>
        )}
      </Card>
      <Card title="How it works" subtitle="The merchant pattern behind every listing.">
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {[
            ['1', 'Agent picks a service', 'The agent reads this catalog and picks what it needs — no human in the loop.'],
            ['2', '402 quote returned', 'The resource answers PAYMENT-REQUIRED with exact price and recipient.'],
            ['3', 'Pay → unlock', 'pons_pay settles USDG on-chain; the receipt unlocks the payload instantly.'],
          ].map(([n, title, text]) => (
            <div key={n} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="font-mono text-xs text-[#f97316]">0{n}</span>
              <h3 className="mt-1 text-sm font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── TAB: MCP tools — the 25-tool surface ────────────────────────────────
const TOOL_GROUPS: Array<{ group: string; note: string; tools: Array<[string, string, boolean]> }> = [
  { group: 'PAYMENT', note: 'Settlement in USDG with policy enforcement', tools: [
    ['pons_quote', 'Convert USD → USDG base units, nothing executed', false],
    ['pons_pay', 'Policy check → transfer → verified receipt', true],
    ['pons_pay_resource', 'Parse a 402 resource and settle its exact price', true],
    ['pons_tx_status', 'Receipt lookup with decoded transfers', false],
    ['pons_balance', 'Agent wallet balance for any token', true],
  ]},
  { group: 'STOCKS', note: '19 tokenized securities on Robinhood Chain', tools: [
    ['pons_stocks_list', 'All 19 verified stock tokens with addresses', false],
    ['pons_stock_price', 'Live DEX price by ticker (NVDA, AAPL…)', false],
    ['pons_stock_info', 'On-chain name, symbol, supply', false],
    ['pons_stocks_screen', 'Screen all 19, rank by liquidity, Grade A filter', false],
  ]},
  { group: 'LAUNCH INTELLIGENCE', note: 'Pons v1 + v2 launchpad research', tools: [
    ['pons_launch_feed', 'Recent launches from the official feed', false],
    ['pons_launch_ranking', 'Tier ranking: Graduated / Grade A / Early Watch', false],
    ['pons_graduated_launches', 'Launches that hit graduation', false],
    ['pons_launch_info', 'V1 token on-chain metadata', false],
    ['pons_launch_market', 'Live markets for a launch token', false],
    ['pons_v2_launch', 'V2 factory launch record', false],
    ['pons_v2_snipe_tax', 'Decaying opening tax per recipient', false],
    ['pons_v2_quote_buy', 'Pure curve buy quote', false],
    ['pons_v2_quote_sell', 'Pure curve sell quote', false],
    ['pons_escrow_balance', 'Claimable ETH on the v2 fee escrow', false],
    ['pons_escrow_token_balance', 'Claimable ERC-20 fees', false],
  ]},
  { group: 'CHAIN & TRANSFER', note: 'Low-level reads and token movement', tools: [
    ['pons_chain_info', 'Chain ID, block, gas, canonical addresses', false],
    ['pons_price', 'Live PONS price, liquidity, top DEX pairs', false],
    ['pons_token_info', 'ERC-20 metadata for any token', false],
    ['pons_send_token', 'Send any ERC-20 by ticker or address', true],
    ['pons_send_eth', 'Send native ETH', true],
  ]},
];

export function McpToolsPanel() {
  return (
    <div className="grid gap-5">
      <Card title="MCP tool surface" subtitle={`25 tools · ${TOOL_GROUPS.length} categories · zero runtime dependencies`}>
        <div className="grid gap-5 p-5">
          {TOOL_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#fdba74]">{g.group}</h3>
                <span className="font-mono text-[10px] text-white/30">{g.note}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10">
                {g.tools.map(([name, desc, needsKey], i) => (
                  <div key={name} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 ${i % 2 ? 'bg-white/[0.02]' : ''}`} style={{ borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    {needsKey && <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ background: 'rgba(74,222,128,0.14)', color: '#86efac' }}>KEY</span>}
                    <span className="font-mono text-xs font-semibold text-[#fed7aa]">{name}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
