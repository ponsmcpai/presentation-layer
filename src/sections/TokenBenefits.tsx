import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Percent, 
  Wallet, 
  Vote, 
  Coins, 
  Star, 
  Droplets,
  ExternalLink
} from 'lucide-react';

const benefits = [
  {
    icon: Percent,
    title: 'Announced at launch',
    description: 'Any fee-related utility for the $MCP token will be published with the official token announcement.',
  },
  {
    icon: Wallet,
    title: 'Verified contract first',
    description: 'The contract address, distribution, and liquidity plan ship together — never as rumors.',
  },
  {
    icon: Vote,
    title: 'Governance',
    description: 'Vote on protocol upgrades, fee structures, and feature priorities.',
  },
  {
    icon: Coins,
    title: 'Agent-payment aligned',
    description: '$MCP is the ecosystem asset of the PonsMCP agent-payment rail; details follow the launch plan.',
  },
  {
    icon: Star,
    title: 'No fake numbers',
    description: 'No invented APY, supply, or market-cap claims before the token exists on-chain.',
  },
  {
    icon: Droplets,
    title: 'Official channels only',
    description: 'Trust token information only from this site and the official announcement once published.',
  },
];

export function TokenBenefits() {
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
    <section id="token-benefits" className="py-24 lg:py-32 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl sm:text-4xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: '-0.03em', color: 'white' }}>
            Token <span className="gradient-text">Benefits</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65 }}>
            $MCP is the upcoming ecosystem asset of the PonsMCP agent-payment rail. The contract address and launch details are not announced yet — this page will carry only verified information.
          </p>
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
              Follow the launch plan
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
