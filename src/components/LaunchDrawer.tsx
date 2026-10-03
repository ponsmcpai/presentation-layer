import { ExternalLink } from 'lucide-react';
import { TokenIcon } from './TokenIcon';
import { Section, Grid, Cell } from './DetailBits';
import { fmtPrice, fmtUsd, type LaunchRow } from './shared';

// ── Launch analysis drawer (feed tokens: MC, grad, deployer, tx) ────────
export function LaunchDrawer({ launch, onClose }: { launch: LaunchRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl" style={{ background: '#141414', border: '1px solid rgba(249,115,22,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <TokenIcon src={launch.logo ? `/api/logo?url=${encodeURIComponent(launch.logo.startsWith('ipfs://') ? 'https://flap.mypinata.cloud/ipfs/' + launch.logo.slice(7) : launch.logo)}` : null} symbol={launch.symbol ?? '?'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-white">{launch.name ?? launch.symbol ?? 'unnamed'}</p>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold" style={{ background: launch.tier === 'Graduated' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', color: launch.tier === 'Graduated' ? '#86efac' : 'rgba(255,255,255,0.4)' }}>{launch.tier}</span>
            </div>
            <p className="font-mono text-[10px] text-white/35">{launch.token?.slice(0, 12)}…</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-white/40 hover:text-white">✕</button>
        </div>
        <div className="space-y-4 p-5">
          <Section title="MARKET">
            <Grid>
              <Cell k="Price" v={fmtPrice(launch.priceUsd)} accent />
              <Cell k="Market cap" v={fmtUsd(launch.marketCapUsd)} />
              <Cell k="Liquidity" v={fmtUsd(launch.liquidityUsd)} />
              <Cell k="Graduation" v={launch.graduationProgressPct != null ? `${Math.round(launch.graduationProgressPct)}%` : launch.graduated ? '100%' : '—'} />
            </Grid>
          </Section>
          {launch.description && (
            <Section title="ABOUT">
              <p className="text-xs leading-relaxed text-white/55">{launch.description}</p>
            </Section>
          )}
          <Section title="ON-CHAIN">
            <Grid>
              <Cell k="Deployer" v={launch.deployer ? `${launch.deployer.slice(0, 8)}…${launch.deployer.slice(-4)}` : '—'} />
              <Cell k="Pool" v={launch.pool ? `${launch.pool.slice(0, 8)}…` : '—'} />
              <Cell k="Launched" v={launch.launchedAt ? new Date(launch.launchedAt).toLocaleDateString() : '—'} />
            </Grid>
          </Section>
          <div className="flex flex-wrap gap-2 pt-1">
            {launch.token && (
              <>
                <a href={`https://robinhoodchain.blockscout.com/token/${launch.token}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">Blockscout <ExternalLink className="h-3 w-3" /></a>
                <a href={`https://dexscreener.com/robinhood/${launch.token}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">DexScreener <ExternalLink className="h-3 w-3" /></a>
                <button onClick={() => navigator.clipboard?.writeText(launch.token!)} className="btn-secondary rounded-full px-3.5 py-2 text-xs font-bold text-[#fed7aa]">Copy CA</button>
              </>
            )}
          </div>
          <p className="font-mono text-[9px] text-white/25">Read-only intelligence. Execution stays in your PonsMCP server.</p>
        </div>
      </div>
    </div>
  );
}
