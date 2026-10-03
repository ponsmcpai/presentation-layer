// Pages Function: resolve token logo from DexScreener (primary) or launch feed (secondary).
// This powers the signal token icons in Market Intelligence — notifier signals don't
// include logo URLs so we look them up on demand and cache for 24h.
export async function onRequestGet({ request, env }: { request: Request; env: any }) {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') ?? '').toLowerCase();

  if (!/^0x[0-9a-f]{40}$/.test(token)) {
    return new Response(null, { status: 400 });
  }

  // Rate limit: 60/min per IP
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const win = Math.floor(Date.now() / 60_000) * 60_000;
  const row = await env.ponsmcp_payments.prepare(
    'INSERT INTO api_rate_limits (bucket,client_ip,window_start,request_count) VALUES (?,?,?,1) ON CONFLICT(bucket,client_ip,window_start) DO UPDATE SET request_count=request_count+1 RETURNING request_count'
  ).bind('token_logo', ip, win).first();
  if (Number(row?.request_count ?? 1) > 60) return new Response(null, { status: 429 });

  // 1. Try DexScreener pairs API for imageUrl
  try {
    const dsRes = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${token}`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (dsRes.ok) {
      const ds = await dsRes.json();
      const pairs = ds.pairs ?? [];
      for (const p of pairs) {
        const img = p.info?.imageUrl ?? p.baseToken?.logo;
        if (img && img.startsWith('https://')) {
          return new Response(JSON.stringify({ logo: img, source: 'dexscreener' }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    }
  } catch { /* fall through */ }

  // 2. Try pons launch feed (our /api/launches cache)
  try {
    const launchRes = await fetch(
      `${new URL(request.url).origin}/api/launches`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (launchRes.ok) {
      const ld = await launchRes.json();
      const match = (ld.launches ?? []).find(
        (l: any) => l.token?.toLowerCase() === token
      );
      if (match?.logo) {
        return new Response(JSON.stringify({ logo: match.logo, source: 'pons' }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
  } catch { /* fall through */ }

  // Not found — caller should fall back to letter avatar
  return new Response(JSON.stringify({ logo: null }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
