import { useEffect, useRef } from 'react';
import { Zap, Shield, Lock, Settings, Search, CheckCircle } from 'lucide-react';

const features = [
  { icon: Zap,         title: 'MPP Integration',    description: "Native support for Stripe's Machine Payments Protocol. Agents discover services, interpret 402 responses, and authorize payments." },
  { icon: Shield,      title: 'Base Settlement',     description: 'Sub-400ms finality with <$0.001 transaction fees. Stablecoin payments settled transparently on-chain.' },
  { icon: Lock,        title: 'Escrow Protection',   description: 'On-chain escrow with proof of delivery verification. Funds released only after cryptographic confirmation.' },
  { icon: Settings,    title: 'Policy Enforcement',  description: 'Configurable spending limits, merchant allowlists, and approval workflows for secure transactions.' },
  { icon: Search,      title: 'Service Discovery',   description: 'Agents autonomously discover MPP-enabled services through directory APIs and MCP manifests.' },
  { icon: CheckCircle, title: 'Production Ready',    description: 'Built for real-world deployments with transaction receipts, audit trails, and dispute resolution.' },
];

const sectionHeadingStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: 'white',
};

export function Features() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('fin'); observer.unobserve(entry.target); }
      }),
      { threshold: 0.1, rootMargin: '-40px' }
    );
    cardsRef.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl sm:text-4xl mb-4" style={sectionHeadingStyle}>
            Built for <span className="gradient-text">autonomous agents</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: 1.65 }}>
            Pons MCP bridges OpenClaw AI agents with Stripe's Machine Payments Protocol, enabling autonomous service payments with transparent Base settlement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="fcard opacity-0 translate-y-5 transition-all duration-500"
              style={{ transitionDelay: `${index * 65}ms` }}
            >
              <div className="card-clean p-6 h-full group">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: '#c4b5fd' }} />
                </div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.65 }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`.fcard.fin { opacity: 1; transform: translateY(0); }`}</style>
    </section>
  );
}
