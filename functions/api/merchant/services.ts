// Merchant registry + services for PonsMCP — server-owned pricing/merchant.
// @ts-nocheck — Cloudflare Pages supplies D1 runtime bindings.
import { addressOk, json, readJson, rateLimit } from '../../_lib/payment';

function serviceRow(row) {
  return {
    id: row.id,
    merchant: row.merchant_address,
    name: row.name,
    resource_path: row.resource_path,
    price_usdg: row.price_usdg_display,
    price_base: row.price_usdg_base,
    active: !!row.active,
  };
}

// GET /api/merchant/services — the public, honest service catalog.
export async function onRequestGet({ env }) {
  const result = await env.ponsmcp_payments.prepare(
    'SELECT * FROM merchant_services WHERE active = 1 ORDER BY created_at DESC LIMIT 50'
  ).all();
  return json({ services: (result.results ?? []).map(serviceRow) });
}

// POST /api/merchant/services { merchant_address, name, resource_path, price_usdg }
// The caller must prove merchant_address ownership by signing the challenge
// stored in the intents-based auth: we accept an eth-signed message via `auth`
// { address, signature, message } and recover it in D1-free JS is not possible
// without crypto libs — so instead we require a registration secret shared at
// merchant onboarding time (env MERCHANT_REGISTRATION_SECRET).
export async function onRequestPost({ request, env }) {
  try {
    if (!await rateLimit(request, env, 'merchant_register', 6)) return json({ error: 'Rate limit exceeded; retry in a minute' }, 429);
    const expectedSecret = env.MERCHANT_REGISTRATION_SECRET;
    if (!expectedSecret) return json({ error: 'Merchant registration is not open yet' }, 503);
    const body = await readJson(request);
    if (String(body.registration_secret ?? '') !== expectedSecret) return json({ error: 'Invalid registration secret' }, 401);
    const merchant = String(body.merchant_address ?? '').toLowerCase();
    if (!addressOk(merchant)) return json({ error: 'merchant_address must be an EVM address' }, 400);
    const name = String(body.name ?? '').slice(0, 60).trim();
    const resourcePath = String(body.resource_path ?? '').slice(0, 120).trim();
    if (!name || !resourcePath) return json({ error: 'name and resource_path are required' }, 400);
    if (!/^[a-z0-9/:-]+$/i.test(resourcePath)) return json({ error: 'resource_path must be a URL path fragment' }, 400);
    const rawPrice = String(body.price_usdg ?? '');
    if (!/^\d+(\.\d{1,6})?$/.test(rawPrice)) return json({ error: 'price_usdg must be a decimal string' }, 400);
    const [whole, fraction = ''] = rawPrice.split('.');
    const base = BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
    if (base <= 0n || base > 100_000_000n) return json({ error: 'price_usdg must be > 0 and <= 100' }, 400);
    const display = `${whole}.${(fraction + '000000').slice(0, 6)}`;
    const id = `svc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    await env.ponsmcp_payments.prepare(
      'INSERT INTO merchants (address, name, active, created_at) VALUES (?, ?, 1, ?) ON CONFLICT(address) DO NOTHING'
    ).bind(merchant, name, now).run();
    await env.ponsmcp_payments.prepare(
      'INSERT INTO merchant_services (id, merchant_address, name, resource_path, price_usdg_base, price_usdg_display, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    ).bind(id, merchant, name, resourcePath, base.toString(), display, now).run();
    return json({ service: serviceRow({ id, merchant_address: merchant, name, resource_path: resourcePath, price_usdg_base: base.toString(), price_usdg_display: display, active: 1 }) }, 201);
  } catch (error) {
    return json({ error: error?.message ?? 'Could not register service' }, 400);
  }
}
