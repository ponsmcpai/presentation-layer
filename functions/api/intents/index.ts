import { addressOk, amountToMicro, json, publicIntent, rateLimit, readJson } from '../../_lib/payment';

// POST /api/intents
// Creates a persistent MPP payment intent. The merchant wallet is explicit so
// this endpoint can support any merchant without holding a platform wallet.
export async function onRequestPost({ request, env }) {
  try {
    if (!await rateLimit(request, env, 'create_intent', 12)) return json({ error: 'Rate limit exceeded; retry in a minute' }, 429);
    const body = await readJson(request);
    const merchant = String(body.merchant_address ?? '');
    if (!addressOk(merchant)) return json({ error: 'merchant_address must be an EVM address' }, 400);
    const { micro, display } = amountToMicro(body.amount_usdg);
    const serviceId = body.service_id ? String(body.service_id) : null;
    let service = null;
    if (serviceId) {
      service = await env.ponsmcp_payments.prepare('SELECT * FROM merchant_services WHERE id = ? AND active = 1').bind(serviceId).first();
      if (!service) return json({ error: 'Unknown service_id' }, 400);
      if (service.merchant_address !== merchant.toLowerCase()) return json({ error: 'service_id does not belong to this merchant_address' }, 400);
      if (service.price_usdg_base !== micro.toString()) return json({ error: `amount_usdg must equal the service price ${service.price_usdg_display}` }, 400);
    }
    const id = `pi_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const createdAt = new Date().toISOString();
    await env.ponsmcp_payments.prepare(
      'INSERT INTO payment_intents (id, merchant_address, amount_usdg_base, amount_usdg_display, status, created_at, service_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, merchant.toLowerCase(), micro.toString(), display, 'pending', createdAt, serviceId).run();
    const row = await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(id).first();
    const resource = row.service_id ? `/api/merchant/r/${row.service_id}?intent=${id}` : `/api/merchant/premium?intent=${id}`;
    return json({ intent: publicIntent(row), next: { verify: `/api/intents/${id}/verify`, protected_resource: resource } }, 201);
  } catch (error) {
    return json({ error: error?.message ?? 'Could not create payment intent' }, 400);
  }
}

// GET /api/intents?limit=20 — most recent intents, public demo control plane.
export async function onRequestGet({ request, env }) {
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') ?? 20), 1), 100);
  const result = await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents ORDER BY created_at DESC LIMIT ?').bind(limit).all();
  return json({ intents: (result.results ?? []).map(publicIntent) });
}
