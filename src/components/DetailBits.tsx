import type { ReactNode } from 'react';

// Small label/value primitives used by the analysis drawers.
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fdba74]">{title}</p>
      {children}
    </div>
  );
}
export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>{children}</div>;
}
export function Cell({ k, v, color, accent }: { k: string; v: string; color?: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11px] text-white/40">{k}</span>
      <span className="font-mono text-xs font-bold" style={{ color: color ?? (accent ? '#fdba74' : 'rgba(255,255,255,0.85)') }}>{v}</span>
    </div>
  );
}
export function Row({ k, v, accent, color }: { k: string; v: string; accent?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-white/40">{k}</span>
      <span className="font-mono font-bold" style={{ color: color ?? (accent ? '#fdba74' : 'rgba(255,255,255,0.85)') }}>{v}</span>
    </div>
  );
}
