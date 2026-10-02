// Server-owned priced resource: /api/merchant/r/<serviceId>?intent=pi_...
// Registry-priced, registry-owned merchant resources. Payment verifies the exact
// USDG transfer on-chain before the resource unlocks.
// @ts-nocheck — Cloudflare Pages supplies D1 runtime bindings.
import { json, publicIntent } from '../../../_lib/payment';

const PONS_V2_FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';

async function chainCall(env, to, data) {
  const alchemyKey = env.PONSMCP_ALCHEMY_KEY;
  const url = alchemyKey
    ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://rpc.nodeflare.app/robinhood/public';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 ponsmcp-web/1.0' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(6000),
  });
  const payload = await res.json();
  if (payload.error) throw new Error(payload.error.message);
  return payload.result;
}

// Content generators keyed by service id — each pulls real data, computed at
// unlock time, instead of returning a static placeholder string.
async function buildUnlockedContent(service, env) {
  if (service.id === 'svc_launchintel01') {
    try {
      const configCountHex = await chainCall(env, PONS_V2_FACTORY, '0xae72d871'); // launchConfigCount()
      const blockHex = await (await fetch(
        env.PONSMCP_ALCHEMY_KEY ? `https://robinhood-mainnet.g.alchemy.com/v2/${env.PONSMCP_ALCHEMY_KEY}` : 'https://rpc.nodeflare.app/robinhood/public',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 ponsmcp-web/1.0' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] }) }
      )).json();
      return {
        kind: 'live_chain_snapshot',
        factory: PONS_V2_FACTORY,
        launch_config_count: parseInt(configCountHex, 16),
        latest_block: parseInt(blockHex.result, 16),
        note: 'Computed live from Robinhood Chain at unlock time — not cached, not fabricated.',
      };
    } catch (e) {
      return { kind: 'live_chain_snapshot', error: `chain read failed: ${e.message}` };
    }
  }
  if (service.id === 'svc_sdkguide01') {
    return {
      kind: 'integration_guide',
      install: 'npm install -g @ponsmcp/sdk',
      quickstart: [
        'const client = new PonsMCPClient({ privateKey: process.env.PONSMCP_PRIVATE_KEY })',
        'const quote = await client.quote("5.00")',
        'const result = await client.pay({ payTo: "0x...", amountUsd: "5.00" })',
      ],
      policy_defaults: { per_tx_cap_usdg: 100, daily_cap_usdg: 1000 },
      docs: 'https://ponsmcp.com/docs',
    };
  }
  return { kind: 'generic', content: `Receipt verified. Resource "${service.name}" is unlocked.` };
}

export async function onRequestGet({ request, params, env }) {
  const service = await env.ponsmcp_payments.prepare(
    'SELECT * FROM merchant_services WHERE id = ? AND active = 1'
  ).bind(params.serviceId).first();
  if (!service) return json({ error: 'Service not found' }, 404);
  const intentId = new URL(request.url).searchParams.get('intent');
  const row = intentId
    ? await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(intentId).first()
    : null;
  const matchesService = row && row.service_id === service.id;
  if (!matchesService || row.status !== 'paid') {
    return json({
      error: 'PAYMENT-REQUIRED',
      message: `This resource costs ${service.price_usdg_display} USDG to ${service.merchant_address}.`,
      service: { id: service.id, name: service.name, merchant: service.merchant_address, price_usdg: service.price_usdg_display },
      intent: row ? publicIntent(row) : null,
      create_intent: { amount_usdg: service.price_usdg_display, merchant_address: service.merchant_address, service_id: service.id },
      protocol: { name: 'PonsMCP Payment Intent', chain_id: 4663 },
    }, 402, { 'Payment-Required': 'true' });
  }
  const unlocked = await buildUnlockedContent(service, env);
  return json({
    data: {
      title: service.name,
      tx_hash: row.tx_hash,
      intent: publicIntent(row),
      ...unlocked,
    },
  });
}
