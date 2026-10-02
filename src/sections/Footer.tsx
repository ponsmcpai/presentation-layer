import { Github } from 'lucide-react';

const footerLinks = {
  product:   [{ label: 'Features', href: '#features' }, { label: 'Tools', href: '#tools' }, { label: 'Token', href: '#token-benefits' }, { label: 'Status', href: '/status' }],
  resources: [{ label: 'Documentation', href: '/docs' }, { label: 'Mission Control', href: '/app' }],
};

export function Footer() {
  return (
    <footer className="py-14" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8"><img src="/logo.png" alt="Pons MCP" className="w-full h-full object-contain" /></div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'white' }}>Pons MCP</span>
            </a>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '340px', marginBottom: '1.25rem' }}>
              Autonomous transaction infrastructure for AI agents on the Machine Payments Protocol.
            </p>
            <div className="flex gap-2">
              {[
                { href: 'https://github.com/ponsmcpai', label: 'GitHub', icon: Github },
                { href: 'https://x.com/Pons_MCP', label: 'X (Twitter)', icon: null },
              ].map(({ href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  {Icon ? <Icon className="w-4 h-4" /> : <span className="w-4 h-4 flex items-center justify-center text-[11px] font-bold">𝕏</span>}
                </a>
              ))}
            </div>
          </div>

          {(['product', 'resources'] as const).map((col) => (
            <div key={col}>
              <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'white', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {col.charAt(0).toUpperCase() + col.slice(1)}
              </h4>
              <ul className="space-y-2.5">
                {footerLinks[col].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={'external' in link && link.external ? '_blank' : undefined}
                      rel={'external' in link && link.external ? 'noopener noreferrer' : undefined}
                      style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.42)')}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.85rem' }}>
            &copy; {new Date().getFullYear()} Pons MCP. All rights reserved.
          </p>
          <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.85rem' }}>
            <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
