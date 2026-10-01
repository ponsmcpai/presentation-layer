import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileCode, Terminal, Settings, Copy, Check, ExternalLink } from 'lucide-react';

const tabs = [
  { id: 'python', label: 'research_agent.py', icon: FileCode },
  { id: 'json',   label: 'mpp_payment.json',  icon: Settings },
  { id: 'bash',   label: 'setup.sh',           icon: Terminal },
];

const codeExamples: Record<string, string> = {
  python: `# PonsMCP is TypeScript — use the SDK from Node or Bun:\n\n// pay-for-402-resource.ts\nimport { PonsMCPClient, payForResource } from '@ponsmcp/sdk'\n\nconst client = new PonsMCPClient({\n  privateKey: process.env.PONSMCP_PRIVATE_KEY,\n  policy: { maxPerTx: 100_000_000n, dailyLimit: 1_000_000_000n }, // 100 / 1000 USDG\n})\n\nconst result = await payForResource(\n  client,\n  'https://api.example.com/premium/forecast?location=SF&days=7',\n)\n\nif (result.ok) console.log('paid', result.priceUsdg, '→', result.payment?.txHash)\nelse console.log(result.stage, result.error)`,

  json: `{\n  "amount": "5.00",\n  "currency": "USD",\n  "payment_methods": [\n    {\n      "type": "crypto",\n      "blockchain": "robinhood",\n      "chain_id": 4663,\n      "token": "USDG"\n    }\n  ],\n  "settlement": {\n    "hash": "0x5Kx...9mQ",\n    "status": "finalized",\n    "latency_ms": 380\n  }\n}`,

  bash: `#!/bin/bash\n\n# Install Pons MCP SDK\nnpm install @ponsmcp/sdk\n\n# Set up environment\necho "RPC_URL=https://rpc.mainnet.chain.robinhood.com" > .env\necho "CHAIN_ID=4663" >> .env\necho "PONSMCP_PRIVATE_KEY=your_agent_wallet_key" >> .env\n\necho "Pons MCP SDK installed"`,
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
    <section id="developers" ref={sectionRef} className="py-24 lg:py-32" style={{ borderTop: '1px solid rgba(249,115,22,0.12)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}
          >
            Integrate in <span className="gradient-text">minutes</span>
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'hsl(30 12% 62%)' }}>
            Drop-in integration for autonomous agents. A few lines of code to enable MPP payments with Robinhood Chain settlement.
          </p>
        </div>

        <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(7, 8, 16, 0.95)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              boxShadow: '0 0 0 1px rgba(249,115,22,0.07), 0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center justify-between px-2 py-2 border-b"
              style={{ background: 'rgba(12, 13, 26, 0.8)', borderColor: 'rgba(249, 115, 22, 0.12)' }}
            >
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                    style={{
                      background: activeTab === tab.id ? 'rgba(249,115,22,0.15)' : 'transparent',
                      color: activeTab === tab.id ? '#fdba74' : 'hsl(30 10% 48%)',
                      border: activeTab === tab.id ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
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
                style={{ color: 'hsl(30 10% 48%)' }}
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
                      <span className="select-none w-6 text-right mr-4 text-xs" style={{ color: 'rgba(249,115,22,0.35)' }}>{i + 1}</span>
                      <span style={{ color: '#fdba74' }}>{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-8">
            <a href="/docs">
              <Button
                variant="outline"
                className="rounded-lg gap-2"
                style={{ borderColor: 'rgba(249,115,22,0.22)', backgroundColor: 'rgba(249,115,22,0.06)', color: 'hsl(36 45% 92%)' }}
              >
                Read the documentation
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
