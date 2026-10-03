import { useEffect, useRef, useState } from 'react';
import { Download, SlidersHorizontal, Bot, Copy, CheckCheck, ArrowRight } from 'lucide-react';

const sectionHeadingStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: 'white',
};

const steps = [
  {
    icon: Download,
    step: '01',
    title: 'Install the SDK',
    description:
      'One package, zero runtime dependencies. The MCP server speaks stdio, so any MCP host — Claude Desktop, Cursor, your own agent runtime — discovers the tools automatically.',
    code: `npm install -g @ponsmcp/sdk
ponsmcp   # stdio MCP server — add it to your MCP host`,
  },
  {
    icon: SlidersHorizontal,
    step: '02',
    title: 'Set policy caps',
    description:
      'Give the agent a funded wallet and hard spending limits. Caps are enforced in-process before anything is ever signed — a prompt injection or runaway loop cannot exceed them.',
    code: `export PONSMCP_PRIVATE_KEY=0x…         # agent key, server env only
export PONSMCP_MAX_PER_TX=100000000    # 100 USDG per transaction
export PONSMCP_DAILY_LIMIT=1000000000  # 1,000 USDG per day`,
  },
  {
    icon: Bot,
    step: '03',
    title: 'Agent pays',
    description:
      'The agent quotes, pays, and verifies in one tool call: policy check → USDG transfer on Robinhood Chain → on-chain receipt verified (status 0x1, exact amount) before the result is returned.',
    code: `pons_pay { "payTo": "0xMerchant…", "amountUsd": "2.50" }
→ { "ok": true, "stage": "confirmed", "txHash": "0x…", … }`,
  },
];

function StepCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="relative mt-5">
      <button
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2.5 top-2.5 rounded-md border border-white/10 bg-black/40 p-1.5 text-white/40 transition hover:text-white"
      >
        {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#101010] p-4 text-[12px] leading-6 text-[#ffce9f]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function HowItWorks() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-24 lg:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <h2 className="text-3xl sm:text-4xl mb-4" style={sectionHeadingStyle}>
            How it <span className="gradient-text">works</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65 }}>
            From zero to an agent's first on-chain payment in three steps — install, cap, pay.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.step}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="benefit-card opacity-0 translate-y-4 transition-all duration-500"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="card-clean p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-mono text-xs text-[#f97316]">{step.step}</span>
                </div>
                <h3 className="text-lg mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {step.description}
                </p>
                <div className="mt-auto">
                  <StepCode code={step.code} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="mt-10 flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span>Full manual, tool reference, and x402 guide in the docs.</span>
          <a href="/docs" className="inline-flex items-center gap-1.5 font-semibold text-[#f97316] transition hover:text-[#fdba74]">
            Read the docs <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
