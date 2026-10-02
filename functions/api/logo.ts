// Pages Function: same-origin image proxy for pons launch logos (IPFS gateways).
// The site CSP restricts img-src to 'self', so logo images are fetched server-side
// and streamed through this endpoint. Only https URLs from known pinata/IPFS
// gateways are allowed — this is not an open proxy.
// @ts-nocheck — Pages runtime types are provided by Cloudflare at build time.

const ALLOWED_HOSTS = new Set([
  'flap.mypinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'gateway.pinata.cloud',
  'w3s.link',
  'cdn.dexscreener.com',
  'axiomtrading-v2.axiom-cdn.io',
  'axiomtrading.sfo3.cdn.digitaloceanspaces.com',
  'gateway.irys.xyz',
  'gmgn.ai',
]);

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url') ?? '';
  let parsed;
  try { parsed = new URL(target); } catch { return new Response('bad url', { status: 400 }); }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 });
  }
  const cache = caches.default;
  let res = await cache.match(request);
  if (res) return res;
  // Build candidate URLs: primary, then IPFS gateway fallbacks for ipfs content.
  const candidates = [parsed.toString()];
  const isIpfsPath = /ipfs\//.test(parsed.pathname);
  if (isIpfsPath) {
    const cidPath = parsed.pathname.replace(/^.*ipfs\//, '/ipfs/');
    candidates.push(`https://ipfs.io${cidPath}`, `https://w3s.link${cidPath}`, `https://cloudflare-ipfs.com${cidPath}`);
  }
  try {
    let upstream = null;
    for (const candidate of candidates) {
      try {
        const r = await fetch(candidate, {
          headers: { 'User-Agent': 'ponsmcp-web/1.0' },
          signal: AbortSignal.timeout(7_000),
        });
        if (r.ok && (r.headers.get('content-type') ?? '').startsWith('image/')) { upstream = r; break; }
      } catch { /* next candidate */ }
    }
    if (!upstream) return new Response('not an image', { status: 404 });
    res = new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
    await cache.put(request, res.clone());
    return res;
  } catch (e) {
    return new Response('fetch failed', { status: 502 });
  }
}
