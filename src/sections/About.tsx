import { BadgeCheck, LockKeyhole, ScanSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

const facts = [
  [ScanSearch, 'Read what is real', 'Launch metadata and market information are read from public chain and market sources.'],
  [LockKeyhole, 'Keep signing local', 'The browser never needs an agent private key. Signing belongs in the configured runtime.'],
  [BadgeCheck, 'Treat receipts as proof', 'A successful action is only complete after the chain receipt can be checked.'],
];

export function About() {
  return <section id="about" className="py-24 lg:py-32" style={{ borderTop:'1px solid rgba(255,255,255,.12)' }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6"><p className="eyebrow">THE STANDARD</p><h2 className="max-w-3xl text-4xl sm:text-6xl leading-[.95] tracking-[-.065em]">A louder interface<br />for a <span className="gradient-text">quieter trust model.</span></h2>
      <div className="mt-12 grid md:grid-cols-3 gap-3">{facts.map(([Icon,title,text]) => <div className="card-clean p-6" key={String(title)}><Icon className="w-6 h-6 text-[#ff6742]"/><h3 className="mt-12 text-xl font-bold tracking-[-.04em]">{title as string}</h3><p className="mt-3 text-sm leading-6 text-white/55">{text as string}</p></div>)}</div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border border-white/15 bg-white/[.035] p-6"><div><p className="text-xs font-mono uppercase tracking-widest text-[#d8ff4f]">RELEASE CHANNELS</p><p className="mt-2 text-sm text-white/55">Official npm package and GitHub repository are pending. This site will link them after they are supplied.</p></div><Link className="action-primary" to="/app">Enter mission control</Link></div>
    </div>
  </section>;
}
