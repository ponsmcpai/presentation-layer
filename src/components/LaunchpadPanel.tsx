import { useCallback, useEffect, useState } from 'react';
import { Rocket, Copy, Check, RefreshCw, TrendingUp } from 'lucide-react';
import { Card } from './Primitives';
import { TokenIcon } from './TokenIcon';
import { fmtPrice, fmtUsd, ipfsToHttp, type LaunchRow } from './shared';

const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const SELS: Record<string, string> = {
  launchFee: 'cf3cf573',
  launchEnabled: '236a4afb',
  maxCreatorTaxBps: 'f325a5fb',
  snipeTaxStartBps: '50e25ac2',
  snipeTaxSeconds: '6783774b',
  launchConfigCount: 'ae72d871',
};

// ── Factory params (live read) ───────────────────────────────────────────
type FactoryParams = {
  launchFeeEth: string | null;
  enabled: boolean | null;
  maxCreatorTaxBps: number | null;
  snipeTaxStartBps: number | null;
  snipeTaxSeconds: number | null;
  configCount: number | null;
  gasPriceGwei: string | null;
};

function FactoryParamsCard({ params, err, loading, onRetry }: {
  params: FactoryParams | null; err: string; loading: boolean; onRetry: () => void;
}) {
  return (
    <Card title="Launch parameters" subtitle="Live read from the pons v2 factory — what launching costs right now.">
      <div className="p-5">
        {loading && <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10"><div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-scan-sweep" /></div>}
        {err && <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)' }}>{err} <button onClick={onRetry} className="ml-2 text-xs font-bold text-[#f97316] underline">Retry</button></div>}
        {params && !err && (
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['Launch fee', `${params.launchFeeEth} ETH`, 'flat fee per launch'],
              ['Status', params.enabled ? 'OPEN' : 'PAUSED', params.enabled ? 'factory accepting launches' : 'launches paused by owner'],
              ['Max creator tax', `${((params.maxCreatorTaxBps ?? 0) / 100).toFixed(1)}%`, 'your cut of curve trades'],
              ['Opening snipe tax', `${((params.snipeTaxStartBps ?? 0) / 100).toFixed(1)}%`, 'decays over time'],
              ['Snipe window', `${params.snipeTaxSeconds ?? 0}s`, 'until tax reaches floor'],
              ['Launches so far', `${params.configCount}`, 'configs in the factory'],
            ] as [string, string, string][]).map(([k, v, note]) => (
              <div key={k} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wide text-white/35">{k}</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#fdba74]">{v}</p>
                <p className="mt-1 text-[10px] text-white/30">{note}</p>
              </div>
            ))}
          </div>
        )}
        {params?.gasPriceGwei && <p className="mt-3 font-mono text-[10px] text-white/30">live gas: {params.gasPriceGwei} gwei · est. launch+buy gas ~3.85M units</p>}
      </div>
    </Card>
  );
}

// ── Launch cost calculator ───────────────────────────────
function CostCalculator({ params }: { params: FactoryParams | null }) {
  const [creatorTax, setCreatorTax] = useState(100); // bps
  const [initialBuy, setInitialBuy] = useState(0.05); // ETH
  const fee = Number(params?.launchFeeEth ?? 0);
  const gasUnits = 3_850_000;
  const gasGwei = Number(params?.gasPriceGwei ?? 0.03);
  const gasEth = gasUnits * gasGwei / 1e9;
  const snipeTaxPct = ((params?.snipeTaxStartBps ?? 0) / 100);
  const openingBuyCost = initialBuy * (1 + snipeTaxPct / 100);
  const total = fee + openingBuyCost + gasEth;
  const [copied, setCopied] = useState(false);

  const snippet = `pons_launch_token({
  name: "My Token", symbol: "MTK",
  creatorTaxBps: ${creatorTax},        // your trade cut
  initialBuyEth: "${initialBuy}",     // opening buy
});
// est. total cost: ~${total.toFixed(4)} ETH`;

  return (
    <Card title="Launch cost calculator" subtitle="Estimate what your launch costs — fee + opening buy (with snipe tax) + gas.">
      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center justify-between text-xs">
              <span className="text-white/60">Creator tax</span>
              <span className="font-mono text-[#fdba74]">{(creatorTax / 100).toFixed(1)}%</span>
            </label>
            <input type="range" min={0} max={Math.floor((params?.maxCreatorTaxBps ?? 500))} value={creatorTax}
              onChange={(e) => setCreatorTax(Number(e.target.value))} className="mt-2 w-full accent-[#f97316]" />
            <p className="mt-1 text-[10px] text-white/30">your cut of every curve trade (max {((params?.maxCreatorTaxBps ?? 500) / 100).toFixed(1)}%)</p>
          </div>
          <div>
            <label className="flex items-center justify-between text-xs">
              <span className="text-white/60">Opening buy</span>
              <span className="font-mono text-[#fdba74]">{initialBuy} ETH</span>
            </label>
            <input type="range" min={0.01} max={0.5} step={0.01} value={initialBuy}
              onChange={(e) => setInitialBuy(Number(e.target.value))} className="mt-2 w-full accent-[#f97316]" />
            <p className="mt-1 text-[10px] text-white/30">your first buy at launch (snipe tax {snipeTaxPct.toFixed(1)}% applies)</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          {([
            ['Launch fee', fee.toFixed(4), 'ETH'],
            ['Opening buy (incl. snipe tax)', openingBuyCost.toFixed(4), 'ETH'],
            ['Gas (launch + buy)', gasEth.toFixed(5), 'ETH'],
          ] as [string, string, string][]).map(([k, v, u], i) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <span className="text-white/50">{k}</span>
              <span className="font-mono text-white/80">{v} {u}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(249,115,22,0.1)', borderTop: '1px solid rgba(249,115,22,0.3)' }}>
            <span className="text-xs font-bold text-white">ESTIMATED TOTAL</span>
            <span className="font-mono text-base font-bold text-[#fdba74]">~{total.toFixed(4)} ETH</span>
          </div>
        </div>

        <div className="relative mt-4 rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <button onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="absolute right-2 top-2 rounded-md border border-white/10 p-1.5 text-white/50 hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <pre className="overflow-x-auto pr-8 font-mono text-[11px] leading-5" style={{ color: '#fdba74' }}>{snippet}</pre>
        </div>
        <p className="mt-2 text-[10px] text-white/30">Execute from your PonsMCP server — dryRun first, then dryRun:false to broadcast.</p>
      </div>
    </Card>
  );
}

// ── Launch guide ─────────────────────────────────────────
function LaunchGuide() {
  const steps = [
    ['1', 'Fund your agent wallet', 'ETH for gas + the launch fee. Use ponsmcp setup to generate a dedicated key.'],
    ['2', 'Preview the launch', 'pons_preview_launch — read-only, shows exact costs and params before anything broadcasts.'],
    ['3', 'Launch (dry run first)', 'pons_launch_token with dryRun:true — inspect the signed plan. Then dryRun:false.'],
    ['4', 'Watch it curve', 'pons_get_token shows phase & curve state. pons_scan_interesting tells you if traders notice.'],
  ];
  return (
    <Card title="How to launch" subtitle="Four steps from funded wallet to live curve.">
      <div className="grid gap-3 p-5">
        {steps.map(([n, title, body]) => (
          <div key={n} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="font-mono text-xs text-[#f97316]">0{n}</span>
            <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/55">{body}</p></div>
          </div>
        ))}
        <div className="rounded-xl px-4 py-3 text-xs text-white/45" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
          Write tools are dry-run by default — nothing broadcasts until you pass dryRun:false AND your policy caps allow it.
        </div>
      </div>
    </Card>
  );
}

// ── Scan interesting (market research) ───────────────────
function ScanInteresting({ launches }: { launches: LaunchRow[] | null }) {
  const [scanning, setScanning] = useState(false);
  const [ranked, setRanked] = useState<Array<LaunchRow & { score: number }> | null>(null);

  const scan = () => {
    if (!launches?.length) return;
    setScanning(true);
    setTimeout(() => {
      const rows = launches
        .map((l) => ({ ...l, score: (l.liquidityUsd ?? 0) / Math.max(l.marketCapUsd ?? 0, 1) }))
        .filter((l) => l.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setRanked(rows);
      setScanning(false);
    }, 600);
  };

  return (
    <Card title="Scan interesting" subtitle="Market research before you launch — which curves have the best liquidity-to-MC ratio right now.">
      <div className="p-5">
        <button onClick={scan} disabled={scanning || !launches?.length}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40">
          {scanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {scanning ? 'Scanning...' : 'Run scan'}
        </button>
        {ranked && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            {ranked.map((l, i) => (
              <div key={l.token ?? i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <span className="font-mono text-xs text-white/40">#{i + 1}</span>
                <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={26} tokenAddress={l.token} />
                <span className="font-mono text-xs font-bold text-white">{l.symbol}</span>
                <span className="ml-auto font-mono text-[11px] text-white/60">{fmtUsd(l.liquidityUsd)} liq</span>
                <span className="font-mono text-[11px] text-white/40">MC {fmtUsd(l.marketCapUsd)}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ background: 'rgba(74,222,128,0.12)', color: '#86efac' }}>{l.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Recent launches strip (compact) ──────────────────────
function RecentStrip({ launches }: { launches: LaunchRow[] | null }) {
  return (
    <Card title="Recent launches" subtitle="What others are launching right now — full analysis in Launch intel.">
      <div className="p-5">
        {!launches && <p className="text-xs text-white/35">loading...</p>}
        {launches && (
          <div className="flex flex-wrap gap-2">
            {launches.slice(0, 12).map((l, i) => (
              <div key={l.token ?? i} className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <TokenIcon src={ipfsToHttp(l.logo)} symbol={l.symbol ?? '?'} size={22} tokenAddress={l.token} />
                <span className="font-mono text-[11px] text-white/75">{l.symbol}</span>
                <span className="font-mono text-[10px] text-white/35">{fmtPrice(l.priceUsd)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[10px] text-white/30">Click any launch in <span className="text-[#f97316]">Launch intel</span> for the full analysis drawer + trade preview.</p>
      </div>
    </Card>
  );
}

// ── Main Launchpad panel ─────────────────────────────────
export function LaunchpadPanel() {
  const [launches, setLaunches] = useState<LaunchRow[] | null>(null);
  const [err, setErr] = useState('');
  const [params, setParams] = useState<FactoryParams | null>(null);
  const [paramsErr, setParamsErr] = useState('');
  const [paramsLoading, setParamsLoading] = useState(true);

  const loadParams = useCallback(async () => {
    setParamsLoading(true); setParamsErr('');
    try {
      const rpcCall = async (sel: string) => {
        const res = await fetch('/api/rpc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_call', params: [{ to: FACTORY, data: '0x' + sel }, 'latest'] }),
        });
        const d = await res.json();
        if (d.error) throw new Error(d.error?.message ?? 'rpc');
        return d.result as string;
      };
      const hexToBig = (h: string) => { try { return BigInt(h); } catch { return 0n; } };
      const [fee, enabled, maxTax, snipeStart, snipeSecs, cfgCount, gasP] = await Promise.all([
        rpcCall(SELS.launchFee), rpcCall(SELS.launchEnabled), rpcCall(SELS.maxCreatorTaxBps),
        rpcCall(SELS.snipeTaxStartBps), rpcCall(SELS.snipeTaxSeconds), rpcCall(SELS.launchConfigCount),
        (async () => {
          const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }) });
          const d = await res.json(); return d.result as string;
        })(),
      ]);
      setParams({
        launchFeeEth: (Number(hexToBig(fee)) / 1e18).toFixed(4),
        enabled: hexToBig(enabled) === 1n,
        maxCreatorTaxBps: Number(hexToBig(maxTax)),
        snipeTaxStartBps: Number(hexToBig(snipeStart)),
        snipeTaxSeconds: Number(hexToBig(snipeSecs)),
        configCount: Number(hexToBig(cfgCount)),
        gasPriceGwei: (Number(hexToBig(gasP)) / 1e9).toFixed(3),
      });
    } catch (e: any) { setParamsErr(e?.message ?? 'factory read failed'); }
    finally { setParamsLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await fetch('/api/launches');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setLaunches(data.launches);
    } catch (e: any) { setErr(e?.message ?? 'Could not load launches'); }
  }, []);

  useEffect(() => { void load(); void loadParams(); }, [load, loadParams]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.03))', border: '1px solid rgba(249,115,22,0.35)' }}>
        <div>
          <h2 className="hj text-2xl font-extrabold text-white">Launch your own token</h2>
          <p className="mt-1 text-sm text-white/50">Everything you need to go from idea to live bonding curve on pons v2 — costs, params, and the exact commands.</p>
        </div>
        <Rocket className="h-10 w-10 shrink-0 text-[#f97316]" />
      </div>

      <FactoryParamsCard params={params} err={paramsErr} loading={paramsLoading} onRetry={() => void loadParams()} />
      <CostCalculator params={params} />
      <div className="grid gap-5 lg:grid-cols-2">
        <LaunchGuide />
        <ScanInteresting launches={launches} />
      </div>
      <RecentStrip launches={launches} />
      {err && <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#fca5a5', background: 'rgba(248,113,113,0.08)' }}>{err}</div>}
    </div>
  );
}
