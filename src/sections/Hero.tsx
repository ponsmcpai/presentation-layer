import { useEffect, useState } from 'react';
import { ArrowRight, Copy, Check, Activity } from 'lucide-react';

const CA_ADDRESS = '0xcabAc42B34C82955d4BF95cD5e81AeE0be3CCE1B';

const codeSnippet = `// MPP Payment Request (HTTP 402)
{
  "amount": "5.00",
  "currency": "USD",
  "payment_methods": [
    {
      "type": "crypto",
      "blockchain": "base",
      "token": "USDC"
    }
  ]
}

// Settlement Result
{
  "signature": "5Kx...9mQ",
  "status": "finalized",
  "latency_ms": 380
}`;

export function Hero() {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const copyCA = () => {
    navigator.clipboard.writeText(CA_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left */}
          <div className={`space-y-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* CA Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, fontSize: '0.8rem' }}>$PONS CA:</span>
              <code style={{ color: '#c4b5fd', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>{CA_ADDRESS}</code>
              <button onClick={copyCA} className="ml-0.5 p-1 rounded-full hover:bg-white/10 transition-colors">
                {copied
                  ? <Check className="w-3 h-3 text-green-400" />
                  : <Copy className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
                }
              </button>
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
                <span className="gradient-text">OpenClaw agents</span>
              </h1>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', lineHeight: 1.65, maxWidth: '480px' }}>
              OpenClaw integration for Stripe's Machine Payments Protocol. Transparent on-chain settlement via Base.
            </p>

            {/* CTAs - pill style */}
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="https://github.com/jackyixuan/pons-mcp" target="_blank" rel="noopener noreferrer">
                <button
                  className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                  style={{ borderRadius: '9999px' }}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </a>
              <a href="/status">
                <button
                  className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  <Activity className="w-4 h-4 text-green-400" />
                  View live status
                </button>
              </a>
            </div>
          </div>

          {/* Right - Code Block */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div
              className="rounded-2xl overflow-hidden animate-float"
              style={{
                background: 'rgba(10, 8, 30, 0.75)',
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
