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
              <img src="/logo.png" alt="Pons MCP" className="w-full h-full object-contain" />
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
