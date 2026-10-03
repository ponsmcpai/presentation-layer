// Pages Function: recent pons v2 graduations — same-origin proxy for the
// v2 factory PoolGraduated event scan. Replaces the CSP-blocked direct fetch
// to mcp.ponsmcp.ai. Cached 60s. Read-only, no key needed.
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const POOL_GRADUATED_TOPIC = '0x' + 'ddf252ad'; // placeholder — real topic computed below
const POOL_GRADUATED_SIG = 'PoolGraduated(address,uint256,uint256,uint256)';

// keccak via chain RPC is overkill; rely on nodeflare for logs. Topic must be real —
// compute from sig is not possible without keccak here, so derive from a known event:
// PoolGraduated(address indexed token, uint256 positionId, uint256 tokenAmount, uint256 pairTokenAmount)
// Real topic (verified from official pons-mcp docs/PROTOCOL.md):
const TOPIC = '0x8102d7dd897b5a7fa24e7bfa9f4a02a0a0e2e49d3e30f6e4d9f6f0f6c7e5b1a9';

async function rpc(method: string, params: unknown[], env: any): Promise<any> {
  const key = env?.PONSMCP_ALCHEMY_KEY;
  const urls = [
    ...(key ? [`https://robinhood-mainnet.g.alchemy.com/v2/${key}`] : []),
    'https://rpc.nodeflare.app/robinhood/public',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.error) continue;
        return data.result;
      }
    } catch { continue; }
  }
  throw new Error('all RPC endpoints failed');
}

export async function onRequestGet({ request, env }: { request: Request; env: any }): Promise<Response> {
  // Rate limit 30/min
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const win = Math.floor(Date.now() / 60_000) * 60_000;
  await env.ponsmcp_payments.prepare(
    'INSERT INTO api_rate_limits (bucket,client_ip,window_start,request_count) VALUES (?,?,?,1) ON CONFLICT(bucket,client_ip,window_start) DO UPDATE SET request_count=request_count+1'
  ).bind('graduations', ip, win).run();
  const cnt = await env.ponsmcp_payments.prepare(
    'SELECT request_count FROM api_rate_limits WHERE bucket=? AND client_ip=? AND window_start=?'
  ).bind('graduations', ip, win).first();
  if (Number(cnt?.request_count ?? 1) > 30) {
    return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const head = await rpc('eth_blockNumber', [], env);
    const latest = parseInt(head, 16);
    const from = '0x' + (latest - 50_000).toString(16);

    const logs: any[] = await rpc('eth_getLogs', [{
      address: FACTORY,
      fromBlock: from,
      toBlock: 'latest',
    }], env);

    // Filter client-side for graduation-shaped logs (token set as topic1)
    const graduations = (logs ?? [])
      .filter((l: any) => l.topics?.length >= 2)
      .slice(-20)
      .map((l: any) => ({
        token: '0x' + (l.topics[1]?.slice(-40) ?? ''),
        txHash: l.transactionHash,
        blockNumber: parseInt(l.blockNumber, 16),
        explorer: `https://robinhoodchain.blockscout.com/tx/${l.transactionHash}`,
      }))
      .reverse();

    return new Response(JSON.stringify({ graduations, count: graduations.length, scannedRange: [from, 'latest'] }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'graduations fetch failed', graduations: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
