import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Tools',      href: '#tools' },
  { label: '$MCP',       href: '#token-benefits' },
  { label: 'Docs',       href: '/docs' },
  { label: 'Status',     href: '/status' },
];

export function Navbar() {
  useTheme();
  const { pathname } = useLocation();
  if (pathname === '/app') return null; // console owns its own chrome
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={isScrolled ? {
        background: 'rgba(11, 11, 11, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      } : {
        background: 'transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-[64px]">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.png" alt="Pons MCP" className="w-full h-full object-cover rounded-lg" />
            </div>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: '1.05rem',
              color: 'white',
              letterSpacing: '-0.01em',
            }}>
              Pons MCP
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              link.href === '/docs' ? (
                <Link
                  key={link.label}
                  to="/docs"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.65)',
                    borderRadius: '9999px',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'white';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.65)',
                    borderRadius: '9999px',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'white';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <a
                href="https://x.com/Pons_MCP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full p-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
                aria-label="PonsMCP on X"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/ponsmcpai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full p-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
                aria-label="PonsMCP on GitHub"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
            <Link to="/app" className="hidden sm:block">
              <button
                className="btn-primary px-5 py-2.5 text-sm font-semibold"
                style={{ borderRadius: '9999px' }}
              >
                Open App
              </button>
            </Link>

            <button
              className="md:hidden p-2 rounded-full transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div style={{
          background: 'rgba(11, 11, 11, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link to="/app" className="block pt-2" onClick={() => setIsMobileMenuOpen(false)}>
              <button className="btn-primary w-full py-2.5 text-sm font-semibold rounded-full">
                Open App
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
