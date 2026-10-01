import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const generateServices = () => [
  { name: 'MPP Gateway',         description: 'Stripe Machine Payments Protocol endpoint', status: 'operational', latency: `${30 + Math.floor(Math.random() * 20)}ms` },
  { name: 'Robinhood Chain RPC',  description: 'On-chain settlement via Robinhood Chain (4663)', status: 'operational', latency: `${55 + Math.floor(Math.random() * 20)}ms` },
  { name: 'Escrow Contract',      description: 'On-chain escrow & proof of delivery',        status: 'operational', latency: `${10 + Math.floor(Math.random() * 8)}ms`  },
  { name: 'Service Discovery',    description: 'Directory API & MCP manifest resolution',    status: 'operational', latency: `${20 + Math.floor(Math.random() * 10)}ms` },
  { name: 'Policy Engine',        description: 'Spending limits & approval workflow',         status: 'operational', latency: `${7  + Math.floor(Math.random() * 6)}ms`  },
  { name: 'Audit Log Service',    description: 'Transaction receipts & dispute resolution',  status: 'operational', latency: `${15 + Math.floor(Math.random() * 8)}ms`  },
];

const incidents = [
  { date: 'Apr 7, 2026', title: 'No incidents', description: 'All systems operational', type: 'ok' },
  { date: 'Apr 6, 2026', title: 'No incidents', description: 'All systems operational', type: 'ok' },
  { date: 'Apr 5, 2026', title: 'No incidents', description: 'All systems operational', type: 'ok' },
];

const uptimeDays = Array.from({ length: 90 }, (_, i) => ({
  day: i,
  status: Math.random() > 0.02 ? 'operational' : 'degraded',
}));

function StatusBadge({ status }: { status: string }) {
  if (status === 'operational') {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#4ade80' }}>
        <CheckCircle className="w-4 h-4" />
        Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#fbbf24' }}>
        <AlertCircle className="w-4 h-4" />
        Degraded
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#f87171' }}>
      <AlertCircle className="w-4 h-4" />
      Down
    </span>
  );
}

export function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState(generateServices());
  const allOperational = services.every(s => s.status === 'operational');

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(generateServices());
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setServices(generateServices());
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 800);
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pons MCP
        </a>

        {/* Overall status */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: allOperational ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
            border: `1px solid ${allOperational ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.25)'}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: allOperational ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)' }}
              >
                <CheckCircle className="w-7 h-7" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em' }}>
                  {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Last updated {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* 90-day uptime bar */}
        <div className="card-clean p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
              90-Day Uptime
            </h2>
            <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>99.98%</span>
          </div>
          <div className="flex gap-0.5">
            {uptimeDays.map((d) => (
              <div
                key={d.day}
                className="flex-1 h-8 rounded-sm transition-all hover:opacity-80"
                title={d.status}
                style={{ background: d.status === 'operational' ? 'rgba(74,222,128,0.55)' : 'rgba(251,191,36,0.55)' }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Services list */}
        <div className="card-clean mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
              Services
            </h2>
          </div>
          {services.map((service, i) => (
            <div
              key={service.name}
              className="px-6 py-4 flex items-center justify-between gap-4"
              style={{
                borderBottom: i < services.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{service.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '2px' }}>{service.description}</p>
              </div>
              <div className="flex items-center gap-6 flex-shrink-0">
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                  {service.latency}
                </span>
                <StatusBadge status={service.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Incident history */}
        <div className="card-clean overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
              Incident History
            </h2>
          </div>
          {incidents.map((inc, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-start gap-4"
              style={{ borderBottom: i < incidents.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
            >
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
              <div>
                <p style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>{inc.date} — {inc.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '2px' }}>{inc.description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}