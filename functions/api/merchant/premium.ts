import { CHAIN_ID, json, publicIntent } from '../../_lib/payment';

// GET /api/merchant/premium?intent=pi_...
// A real protected resource: unpaid/unknown intent gets a machine-readable
// HTTP 402; only a receipt-verified intent unlocks the response.
export async function onRequestGet({ request, env }) {
  const intentId = new URL(request.url).searchParams.get('intent');
  const row = intentId
    ? await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(intentId).first()
    : null;
  if (!row || row.status !== 'paid') {
    const requirement = row ? publicIntent(row) : null;
    return json({
      error: 'PAYMENT-REQUIRED',
      message: 'This merchant resource requires a receipt-verified USDG payment.',
      intent: requirement,
      protocol: { name: 'PonsMCP Payment Intent', chain_id: CHAIN_ID },
    }, 402, { 'Payment-Required': 'true' });
  }
  return json({
    data: {
      title: 'PonsMCP Premium Merchant Brief',
      content: 'Receipt verified. This protected response is now unlocked for the settled payment intent.',
      intent: publicIntent(row),
    },
  });
}
