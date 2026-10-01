import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileCode, Terminal, Settings, Copy, Check, ExternalLink } from 'lucide-react';

const tabs = [
  { id: 'python', label: 'research_agent.py', icon: FileCode },
  { id: 'json',   label: 'mpp_payment.json',  icon: Settings },
  { id: 'bash',   label: 'setup.sh',           icon: Terminal },
];

const codeExamples: Record<string, string> = {
  python: `from ponsmcp import PonsMCPClient\n\n# Initialize the client\nclient = Pons MCPClient(\n    base_rpc='https://mainnet.base.org',\n    wallet=agent_wallet,\n    policies={\n        'max_per_transaction': 100_000,\n        'daily_limit': 1_000_000\n    }\n)\n\n# Pay for a resource\nresult = await client.pay_for_resource(\n    url='https://api.weather.com/premium/forecast',\n    parameters={'location': 'SF', 'days': 7}\n)\n\nprint(f"Payment finalized: {result.signature}")`,

  json: `{\n  "amount": "5.00",\n  "currency": "USD",\n  "payment_methods": [\n    {\n      "type": "crypto",\n      "blockchain": "base",\n      "token": "USDC"\n    }\n  ],\n  "settlement": {\n    "signature": "5Kx...9mQ",\n    "status": "finalized",\n    "latency_ms": 380\n  }\n}`,

  bash: `#!/bin/bash\n\n# Install Pons MCP SDK\nnpm install @ponsmcp/sdk\n\n# Set up environment\necho "BASE_RPC_URL=https://mainnet.base.org" > .env\necho "PONSMCP_API_KEY=your_api_key" >> .env\n\necho "Pons MCP SDK installed"`,
};

export function Developers() {
  const [activeTab, setActiveTab] = useState('python');
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developers" ref={sectionRef} className="py-24 lg:py-32" style={{ borderTop: '1px solid rgba(139,92,246,0.12)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}
          >
            Integrate in <span className="gradient-text">minutes</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'hsl(215 18% 52%)' }}>
            Drop-in integration for OpenClaw agents. Three lines of code to enable autonomous MPP payments with Base settlement.
          </p>
        </div>

        <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(7, 8, 16, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.07), 0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center justify-between px-2 py-2 border-b"
              style={{ background: 'rgba(12, 13, 26, 0.8)', borderColor: 'rgba(139, 92, 246, 0.12)' }}
            >
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                    style={{
                      background: activeTab === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                      color: activeTab === tab.id ? '#c4b5fd' : 'hsl(215 18% 42%)',
                      border: activeTab === tab.id ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors"
                style={{ color: 'hsl(215 18% 42%)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="p-5 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed">
                <code>
                  {codeExamples[activeTab].split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="select-none w-6 text-right mr-4 text-xs" style={{ color: 'rgba(139,92,246,0.35)' }}>{i + 1}</span>
                      <span style={{ color: '#c4b5fd' }}>{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-8">
            <a href="https://github.com/jackyixuan/pons-mcp" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="rounded-lg gap-2"
                style={{ borderColor: 'rgba(139,92,246,0.22)', backgroundColor: 'rgba(139,92,246,0.06)', color: 'hsl(214 30% 94%)' }}
              >
                View Documentation
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
