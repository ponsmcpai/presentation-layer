import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Percent, 
  Wallet, 
  Vote, 
  Coins, 
  Star, 
  Copy,
  CheckCheck,
  ExternalLink
} from 'lucide-react';

const CA = '0x15da2596F4C21227185466066Bf0f19d9D526B8a';

const benefits = [
  {
    icon: Percent,
    title: 'Fee utility',
    description: 'Fee-related utility for the $MCP token is tied to the PonsMCP agent-payment rail operations.',
  },
  {
    icon: Wallet,
    title: 'Verified contract',
    description: 'Contract address is live and verifiable on-chain. Distribution and liquidity details are published with the launch.',
  },
  {
    icon: Vote,
    title: 'Governance',
    description: 'Vote on protocol upgrades, fee structures, and feature priorities.',
  },
  {
    icon: Coins,
    title: 'Agent-payment aligned',
    description: '$MCP is the ecosystem asset of the PonsMCP agent-payment rail on Robinhood Chain.',
  },
  {
    icon: Star,
    title: 'On-chain verified',
    description: 'All supply, distribution, and liquidity data are readable directly from the contract.',
  },
  {
    icon: ExternalLink,
    title: 'Official channels only',
    description: 'Trust token information only from this site and the verified contract address above.',
  },
];

export function TokenBenefits() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
    <section id="token-benefits" className="py-24 lg:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl sm:text-4xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', color: 'white' }}>
            Token <span className="gradient-text">Benefits</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65 }}>
            $MCP is the ecosystem asset of the PonsMCP agent-payment rail on Robinhood Chain.
          </p>
        </div>

        {/* CA Box */}
        <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 border border-white/15 bg-white/[.035] rounded-xl p-4 sm:p-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-[#d8ff4f] mb-1">Contract Address</p>
            <p className="font-mono text-sm text-white/80 break-all">{CA}</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.07)', color: copied ? '#d8ff4f' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="benefit-card opacity-0 translate-y-4 transition-all duration-500"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="card-clean p-6 h-full">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{benefit.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.65 }}>
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="#developers">
            <Button className="rounded-lg btn-primary gap-2">
              Enter mission control
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      <style>{`
        .benefit-card.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
