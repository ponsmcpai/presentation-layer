import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features',   href: '#features' },
  { label: 'Developers', href: '#developers' },
  { label: 'Docs',       href: 'https://github.com/jackyixuan/pons-mcp', external: true },
  { label: 'Team',       href: '#team' },
  { label: 'GitHub',     href: 'https://github.com/jackyixuan/pons-mcp', external: true },
];

export function Navbar() {
  useTheme();
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
        background: 'rgba(18, 8, 48, 0.72)',
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
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
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
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <a href="https://github.com/jackyixuan/pons-mcp" target="_blank" rel="noopener noreferrer" className="hidden sm:block">
              <button
                className="btn-primary px-5 py-2.5 text-sm font-semibold"
                style={{ borderRadius: '9999px' }}
              >
                Get Started
              </button>
            </a>

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
          background: 'rgba(18, 8, 48, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="block px-4 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href="https://github.com/jackyixuan/pons-mcp" target="_blank" rel="noopener noreferrer" className="block pt-2">
              <button className="btn-primary w-full py-2.5 text-sm font-semibold rounded-full">
                Get Started
              </button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
