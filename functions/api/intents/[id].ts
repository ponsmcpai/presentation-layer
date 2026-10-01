import { json, publicIntent } from '../../_lib/payment';

// GET /api/intents/:id
export async function onRequestGet({ params, env }) {
  const row = await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(params.id).first();
  if (!row) return json({ error: 'Payment intent not found' }, 404);
  return json({ intent: publicIntent(row) });
}
