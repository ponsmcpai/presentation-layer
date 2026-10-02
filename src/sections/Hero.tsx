import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Terminal, Zap, Wallet, Shield, Cpu, Copy, CheckCheck } from 'lucide-react';

const MCP_CA = '0x15da2596F4C21227185466066Bf0f19d9D526B8a';

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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MCP_CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left */}
          <div className={`space-y-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* CA badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.3)', backdropFilter: 'blur(10px)' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500, fontSize: '0.78rem' }}>$MCP CA:</span>
                <span style={{ color: '#f97316', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem', fontWeight: 600 }}>{MCP_CA.slice(0, 6)}…{MCP_CA.slice(-4)}</span>
                <button onClick={handleCopy} className="ml-1 flex items-center" style={{ color: copied ? '#d8ff4f' : 'rgba(255,255,255,0.4)' }}>
                  {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Eyebrow badge */}
            <div className="pb-5">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fdba74' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                Open source · MIT · npm install -g @ponsmcp/sdk
              </span>
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

            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.1rem', lineHeight: 1.65, maxWidth: '480px' }}>
              MCP server + SDK for the Machine Payments Protocol. Settlement runs transparently on-chain, in USDG, on Robinhood Chain 4663.
            </p>

            {/* CTAs - pill style */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/app">
                <button
                  className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                  style={{ borderRadius: '9999px' }}
                >
                  <Zap className="w-4 h-4" />
                  Open App
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
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> 14 MCP tools</span>
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
