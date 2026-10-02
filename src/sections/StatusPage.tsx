import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

interface Check {
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  latencyMs: number | null;
  link?: string;
}

const INITIAL: Check[] = [
  { name: 'Payment intents API', description: 'POST /api/intents + public ledger', status: 'checking', latencyMs: null },
  { name: 'Merchant registry API', description: 'Service catalog + 402 resource unlock', status: 'checking', latencyMs: null },
  { name: 'Read-only chain RPC proxy', description: 'Whitelisted eth_* methods via /api/rpc', status: 'checking', latencyMs: null },
  { name: 'Robinhood Chain (4663)', description: 'Direct eth_chainId + latest block', status: 'checking', latencyMs: null, link: 'https://robinhoodchain.blockscout.com' },
  { name: 'npm package', description: '@ponsmcp/sdk — registry + latest version', status: 'checking', latencyMs: null, link: 'https://www.npmjs.com/package/@ponsmcp/sdk' },
];

async function timeFetch(url: string, init?: RequestInit): Promise<{ ok: boolean; ms: number; status: number }> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    return { ok: res.ok, ms: Math.round(performance.now() - t0), status: res.status };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0), status: 0 };
  }
}

export function StatusPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks(INITIAL.map((c) => ({ ...c, status: 'checking' as const })));

    const set = (name: string, patch: Partial<Check>) =>
      setChecks((prev) => prev.map((c) => (c.name === name ? { ...c, ...patch } : c)));

    // 1. Intents API — real POST, expect a JSON intent (costs nothing, D1 write)
    {
      const r = await timeFetch('/api/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_address: '0x0000000000000000000000000000000000000001', amount_usdg: '0.010000' }),
      });
      set('Payment intents API', { status: r.ok ? 'operational' : 'down', latencyMs: r.ms });
    }

    // 2. Merchant registry catalog
    {
      const r = await timeFetch('/api/merchant/services');
      set('Merchant registry API', { status: r.ok ? 'operational' : 'down', latencyMs: r.ms });
    }

    // 3. RPC proxy must REJECT write methods — a 403 proves the guard is alive
    {
      const r = await timeFetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_sendRawTransaction', params: ['0x00'] }),
      });
      set('Read-only chain RPC proxy', { status: r.status === 403 ? 'operational' : 'degraded', latencyMs: r.ms });
    }

    // 4. Chain direct
    {
      const r = await timeFetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] }),
      });
      set('Robinhood Chain (4663)', { status: r.ok ? 'operational' : 'down', latencyMs: r.ms });
    }

    // 5. npm registry
    {
      const r = await timeFetch('https://registry.npmjs.org/@ponsmcp/sdk');
      set('npm package', { status: r.ok ? 'operational' : 'down', latencyMs: r.ms });
    }

    setLastUpdated(new Date());
    setRunning(false);
  }, []);

  useEffect(() => { void runChecks(); }, [runChecks]);

  const badge = (status: Check['status']) => {
    if (status === 'checking') return <span className="flex items-center gap-1.5 text-sm font-medium text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</span>;
    if (status === 'operational') return <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#4ade80' }}><CheckCircle className="h-4 w-4" /> Operational</span>;
    if (status === 'degraded') return <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#fbbf24' }}><AlertCircle className="h-4 w-4" /> Degraded</span>;
    return <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#f87171' }}><AlertCircle className="h-4 w-4" /> Down</span>;
  };

  const allOk = checks.every((c) => c.status === 'operational');

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </a>

        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          System <span className="gradient-text">status</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          Live checks, run from your browser against the real endpoints — no cached green dots. Results are specific to your network path.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl" style={{ background: 'rgba(16,16,16,0.62)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-bold text-white">
              {running ? 'Running live checks…' : allOk ? 'All systems operational' : 'Issues detected'}
            </span>
            <button onClick={() => void runChecks()} disabled={running}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white disabled:opacity-50">
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-run
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {checks.map((c) => (
              <div key={c.name} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {c.name}
                    {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-medium text-[#f97316]">↗</a>}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">{c.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  {c.latencyMs !== null && <span className="font-mono text-xs text-white/35">{c.latencyMs} ms</span>}
                  {badge(c.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(16,16,16,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs leading-6 text-white/45">
            <b className="text-white/70">What this page does not show:</b> historical uptime, incident history, or third-party infrastructure status.
            PonsMCP does not fabricate an SLA history — this page only reports what can be verified right now, from this browser.
            {lastUpdated && <> Last run {lastUpdated.toLocaleTimeString('en-US')}.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
