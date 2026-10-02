// Server-owned priced resource: /api/merchant/r/<serviceId>?intent=pi_...
// Replaces the self-asserted premium demo with registry-priced, registry-owned
// merchant resources. Payment still verifies the exact USDG transfer on-chain.
// @ts-nocheck — Cloudflare Pages supplies D1 runtime bindings.
import { json, publicIntent } from '../../../_lib/payment';

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
    const { amount_usdg_display, price_usdg_display } = { ...row, ...service };
    const amount = row ? row.amount_usdg_display : service.price_usdg_display;
    return json({
      error: 'PAYMENT-REQUIRED',
      message: `This resource costs ${service.price_usdg_display} USDG to ${service.merchant_address}.`,
      service: { id: service.id, name: service.name, merchant: service.merchant_address, price_usdg: service.price_usdg_display },
      intent: row ? publicIntent(row) : null,
      create_intent: { amount_usdg: service.price_usdg_display, merchant_address: service.merchant_address, service_id: service.id },
      protocol: { name: 'PonsMCP Payment Intent', chain_id: 4663 },
    }, 402, { 'Payment-Required': 'true' });
  }
  return json({
    data: {
      title: service.name,
      content: `Receipt verified for intent ${row.id}. This response is unlocked.`,
      tx_hash: row.tx_hash,
      intent: publicIntent(row),
    },
  });
}
