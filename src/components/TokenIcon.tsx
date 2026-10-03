import { useState } from 'react';
import { ipfsToHttp } from './shared';

const logoCache = new Map<string, boolean>();

// ── Token icon: IPFS logo → gradient letter avatar (GMGN style) ────────
export function TokenIcon({ src, symbol, size = 36 }: { src?: string | null; symbol: string; size?: number }) {
  const [err, setErr] = useState(() => (src ? logoCache.get(src) === false : false));
  const [loaded, setLoaded] = useState(() => (src ? logoCache.get(src) === true : false));
  const letter = (symbol || '?').slice(0, 1).toUpperCase();
  const hue = [...(symbol || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const fallback = (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))` }}>
      {letter}
    </div>
  );
  if (!src || err) return fallback;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {!loaded && <div className="absolute inset-0">{fallback}</div>}
      <img
        src={src}
        alt={symbol}
        width={size}
        height={size}
        onLoad={() => { logoCache.set(src, true); setLoaded(true); }}
        onError={() => { logoCache.set(src, false); setErr(true); }}
        className="rounded-full object-cover"
        style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

// Convenience wrapper for launch records: resolves logo URI through the proxy.
export function LaunchTokenIcon({ launch, size = 36 }: { launch: { logo?: string | null; symbol?: string }; size?: number }) {
  return <TokenIcon src={ipfsToHttp(launch.logo)} symbol={launch.symbol ?? '?'} size={size} />;
}
