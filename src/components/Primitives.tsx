import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-md p-1.5 transition-colors hover:bg-white/10"
      style={{ color: 'rgba(255,255,255,0.45)' }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Step({ number, title, active, done }: { number: number; title: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex size-6 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: done ? 'rgba(74,222,128,0.2)' : active ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${done ? 'rgba(74,222,128,0.45)' : active ? 'rgba(254,215,170,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: done ? '#4ade80' : active ? '#fed7aa' : 'rgba(255,255,255,0.4)',
        }}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span className="text-xs font-semibold" style={{ color: active || done ? 'white' : 'rgba(255,255,255,0.4)' }}>{title}</span>
    </div>
  );
}

export function Card({ title, subtitle, children, accent, className = '' }: { title: string; subtitle?: string; children: ReactNode; accent?: boolean; className?: string }) {
  return (
    <section className={`h-full overflow-hidden rounded-2xl ${className}`} style={{ background: 'rgba(16,16,16,0.62)', border: `1px solid ${accent ? 'rgba(249,115,22,0.32)' : 'rgba(255,255,255,0.1)'}` }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
