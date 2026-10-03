import { useState, useEffect } from 'react';
import { ipfsToHttp } from './shared';

const logoCache = new Map<string, string | null>(); // token addr → logo URL or null

// ── Token icon: IPFS logo → gradient letter avatar (GMGN style) ────────
export function TokenIcon({ src, symbol, size = 36, tokenAddress }: {
  src?: string | null;
  symbol: string;
  size?: number;
  tokenAddress?: string | null;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(src ?? null);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const letter = (symbol || '?').slice(0, 1).toUpperCase();
  const hue = [...(symbol || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const fallback = (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))` }}
    >
      {letter}
    </div>
  );

  // If no direct logo src, try to resolve from /api/token-logo
  useEffect(() => {
    if (src) { setImgSrc(src); return; }
    if (!tokenAddress) return;
    const addr = tokenAddress.toLowerCase();
    if (logoCache.has(addr)) {
      setImgSrc(logoCache.get(addr) ?? null);
      return;
    }
    // Fetch and cache
    fetch(`/api/token-logo?token=${addr}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const url = d?.logo ?? null;
        logoCache.set(addr, url);
        if (url) setImgSrc(url);
      })
      .catch(() => logoCache.set(addr, null));
  }, [src, tokenAddress]);

  const displaySrc = imgSrc ? ipfsToHttp(imgSrc) : null;

  if (!displaySrc || err) return fallback;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {!loaded && <div className="absolute inset-0">{fallback}</div>}
      <img
        src={displaySrc}
        alt={symbol}
        width={size}
        height={size}
        onLoad={() => { setLoaded(true); }}
        onError={() => { setErr(true); }}
        className="rounded-full object-cover"
        style={{ width: size, height: size, opacity: loaded ? 1 : 0, transition: 'opacity 0.25s' }}
      />
    </div>
  );
}

// Convenience wrapper for launch records
export function LaunchTokenIcon({ launch, size = 36 }: { launch: { logo?: string | null; symbol?: string; token?: string }; size?: number }) {
  return <TokenIcon src={ipfsToHttp(launch.logo)} symbol={launch.symbol ?? '?'} size={size} tokenAddress={launch.token} />;
}
