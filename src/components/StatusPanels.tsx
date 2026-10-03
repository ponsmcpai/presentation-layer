import { ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CopyButton } from './Primitives';
import { USDG, RH_EXPLORER, type IntentRow } from './shared';

// ── Top stat strip ($MCP price, block, gas, tool count) ─────────────────
export function StatStrip({
  mcpPrice, live, liveTick,
}: {
  mcpPrice: { priceUsd: string; change24h: number | null } | null;
  live: { block: string; gas: string };
  liveTick: boolean;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([
        {
          label: '$MCP token',
          value: mcpPrice ? `$${mcpPrice.priceUsd}` : '—',
          sub: mcpPrice?.change24h != null ? `MCP · 24h ${mcpPrice.change24h >= 0 ? '+' : ''}${mcpPrice.change24h.toFixed(1)}%` : 'MCP · live on Uniswap V4 (RH)',
          live: true,
          href: 'https://dexscreener.com/robinhood/0x50a505074173d50d7d21d45e19d3a94202dfce860273100d1c19008051e9475f',
          changeColor: mcpPrice?.change24h != null ? (mcpPrice.change24h >= 0 ? '#86efac' : '#fca5a5') : undefined,
        },
        { label: 'Latest block', value: live.block, sub: 'Robinhood Chain · 4663', live: true },
        { label: 'Network gas', value: live.gas, sub: 'Gas token: ETH', live: true },
        { label: 'MCP tools', value: '33 tools', sub: 'Pay · batch · x402 · stocks', live: false },
      ]).map(({ label, value, sub, live: isLive, href, changeColor }) => {
        const content = (
          <>
            <p className="text-[11px] text-white/40">{label}</p>
            <p className={`mt-1 truncate text-base font-bold ${isLive && liveTick ? 'animate-count-flicker' : ''}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: changeColor ?? 'white' }}>{value}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-white/30">{sub}</p>
          </>
        );
        const cls = `relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 ${href ? 'transition hover:border-[#f97316]/40 hover:bg-white/[0.05]' : ''}`;
        return href ? (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {isLive && <span className="absolute right-3 top-3 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" /></span>}
            {content}
          </a>
        ) : (
          <div key={label} className={cls}>
            {isLive && <span className="absolute right-3 top-3 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" /></span>}
            {content}
          </div>
        );
      })}
    </div>
  );
}

// ── TAB: Activity — recent intents ──────────────────────────────────────
export function ActivityPanel({ history, refreshHistory }: { history: IntentRow[]; refreshHistory: () => void }) {
  const paidCount = history.filter((i) => i.status === 'paid').length;
  const pendingCount = history.filter((i) => i.status === 'pending').length;
  return (
    <Card title="Recent payment intents" subtitle="Persisted settlement state — pending is expected until a matching receipt is verified.">
      <div className="flex items-center justify-between px-5 pb-2 pt-3">
        <div className="flex gap-2">
          <span className="rounded-full px-2.5 py-1 font-mono text-[10px]" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac' }}>{paidCount} PAID</span>
          <span className="rounded-full px-2.5 py-1 font-mono text-[10px]" style={{ background: 'rgba(249,115,22,0.12)', color: '#fed7aa' }}>{pendingCount} PENDING</span>
        </div>
        <button onClick={refreshHistory} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316]"><RefreshCw className="h-3 w-3" /> Refresh</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {history.length === 0 ? <p className="px-6 py-5 text-sm text-white/40">No payment intents yet.</p> : history.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{Number(item.payment.amount_usdg).toFixed(2)} USDG <span className="font-normal text-white/40">→ {item.payment.pay_to.slice(0, 6)}…{item.payment.pay_to.slice(-4)}</span></p>
              <p className="mt-1 font-mono text-xs text-white/35">{item.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: item.status === 'paid' ? 'rgba(74,222,128,0.12)' : 'rgba(249,115,22,0.12)', color: item.status === 'paid' ? '#86efac' : '#fed7aa' }}>{item.status.toUpperCase()}</span>
              {item.tx_hash && <a href={`${RH_EXPLORER}/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#f97316]">Proof</a>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── TAB: Chain status ───────────────────────────────────────────────────
export function ChainStatusPanel({ live }: { live: { block: string; gas: string } }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Robinhood Chain" subtitle="Arbitrum Orbit L2 · settlement environment">
        <div className="flex flex-col gap-3 p-5">
          {[
            ['Chain ID', '4663'],
            ['Latest block', live.block],
            ['Gas price', live.gas],
            ['Gas token', 'ETH'],
            ['Explorer', 'robinhoodchain.blockscout.com'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-white/40">{k}</span><span className="font-mono text-white/75">{v}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Settlement asset" subtitle="USDG — stablecoin, 6 decimals">
        <div className="flex flex-col gap-3 p-5">
          {[
            ['Symbol', 'USDG'],
            ['Decimals', '6'],
            ['Contract', `${USDG.slice(0, 10)}…${USDG.slice(-6)}`],
            ['Per-payment policy', '≤ 100 USDG'],
            ['Daily policy', '≤ 1,000 USDG (default)'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-white/40">{k}</span><span className="font-mono text-white/75">{v}</span>
            </div>
          ))}
          <a href={`${RH_EXPLORER}/token/${USDG}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316]">Open explorer <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </Card>
    </div>
  );
}

// ── SDK help card under MCP tools (client config snippet) ───────────────
export function McpConnectCard() {
  const snippet = 'npm install -g @ponsmcp/sdk\nponsmcp  # stdio MCP server';
  return (
    <Card title="Connect any MCP client" subtitle="Stdio transport — Claude Desktop, Cursor, or any MCP host.">
      <div className="p-5">
        <div className="relative rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="absolute right-2 top-2"><CopyButton value={snippet} /></div>
          <pre className="overflow-x-auto pr-8 font-mono text-xs" style={{ color: '#f97316' }}>{snippet}</pre>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">Wallet tools (marked KEY) activate when PONSMCP_PRIVATE_KEY is present in the server environment. Everything else works keyless.</p>
      </div>
    </Card>
  );
}
