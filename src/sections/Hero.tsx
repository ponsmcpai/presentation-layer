import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Terminal, Zap, Wallet, Shield, Cpu } from 'lucide-react';

const codeSnippet = `// MPP Payment Request (HTTP 402)
{
  "amount": "5.00",
  "currency": "USD",
  "payment_methods": [
    {
      "type": "crypto",
      "blockchain": "robinhood",
      "chain_id": 4663,
      "token": "USDG"
    }
  ]
}

// Settlement Result
{
  "hash": "0x5Kx...9mQ",
  "status": "finalized",
  "latency_ms": 380
}`;

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [ponsPrice, setPonsPrice] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/price')
      .then((r) => r.json())
      .then((j) => {
        const pairs = (j.pairs ?? []).filter((p: any) => p.chainId === 'robinhood');
        if (pairs.length > 0 && alive) setPonsPrice(pairs[0].priceUsd);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left */}
          <div className={`space-y-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* CA + live price badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, fontSize: '0.8rem' }}>$MCP CA:</span>
                <span style={{ color: '#f97316', fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em' }}>Coming soon</span>
              </div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
                {ponsPrice ? (
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', fontWeight: 600 }}>
                    ${ponsPrice}
                  </span>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>…</span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>PONS live</span>
              </div>
            </div>

            {/* Headline - BIG like reference */}
            <div className="space-y-2">
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: 'white',
              }}>
                Autonomous<br />
                payments for<br />
                <span className="gradient-text">AI agents</span>
              </h1>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', lineHeight: 1.65, maxWidth: '480px' }}>
              MCP server + SDK for Stripe's Machine Payments Protocol. Transparent on-chain settlement on Robinhood Chain.
            </p>

            {/* CTAs - pill style */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/app">
                <button
                  className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                  style={{ borderRadius: '9999px' }}
                >
                  <Zap className="w-4 h-4" />
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <a href="/status">
                <button
                  className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  <Activity className="w-4 h-4 text-green-400" />
                  View live status
                </button>
              </a>
            </div>

            {/* Quick capability strip */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> 9 MCP tools</span>
              <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> stdio + HTTP</span>
              <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> USDG settlement</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> policy guard</span>
            </div>
          </div>

          {/* Right - Code Block */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div
              className="rounded-2xl overflow-hidden animate-float"
              style={{
                background: 'rgba(16, 10, 6, 0.75)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                  mpp_payment.json
                </span>
                <div className="w-16" />
              </div>

              <div className="p-5 overflow-x-auto">
                <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', lineHeight: 1.75 }}>
                  <code>
                    {codeSnippet.split('\n').map((line, i) => (
                      <div key={i} className="flex">
                        <span style={{ color: 'rgba(255,255,255,0.2)', userSelect: 'none', width: '1.8rem', textAlign: 'right', marginRight: '1rem', fontSize: '0.72rem' }}>{i + 1}</span>
                        <span>
                          {line.includes('//') ? (
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{line}</span>
                          ) : (
                            line.split(/(\".*?\"|:|,|\{|\}|\[|\])/).map((part, j) => {
                              if (part?.match(/^\".*\"$/)) return <span key={j} style={{ color: '#86efac' }}>{part}</span>;
                              if ([':',',','{','}','[',']'].includes(part)) return <span key={j} style={{ color: 'rgba(255,255,255,0.35)' }}>{part}</span>;
                              if (part?.match(/^\d+\.?\d*$/)) return <span key={j} style={{ color: '#fdba74' }}>{part}</span>;
                              return <span key={j} style={{ color: 'rgba(255,255,255,0.85)' }}>{part}</span>;
                            })
                          )}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
