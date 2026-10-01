import { hashOk, json, publicIntent, rateLimit, readJson, rpc, verifiedUsdGTransfer } from '../../../_lib/payment';

// POST /api/intents/:id/verify { tx_hash }
// Verifies the exact USDG transfer in a successful Robinhood Chain receipt.
// A hash is unique in D1, preventing reuse for multiple intents.
export async function onRequestPost({ request, params, env }) {
  try {
    if (!await rateLimit(request, env, 'verify_intent', 20)) return json({ error: 'Rate limit exceeded; retry in a minute' }, 429);
    const row = await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(params.id).first();
    if (!row) return json({ error: 'Payment intent not found' }, 404);
    const body = await readJson(request);
    const hash = String(body.tx_hash ?? '').toLowerCase();
    if (!hashOk(hash)) return json({ error: 'tx_hash must be 0x + 64 hex chars' }, 400);
    if (row.status === 'paid') {
      if (row.tx_hash === hash) return json({ intent: publicIntent(row), idempotent: true });
      return json({ error: 'Payment intent is already settled with a different transaction' }, 409);
    }
    const claimed = await env.ponsmcp_payments.prepare('SELECT id FROM payment_intents WHERE tx_hash = ?').bind(hash).first();
    if (claimed && claimed.id !== row.id) return json({ error: 'This transaction hash is already assigned to another payment intent' }, 409);
    const receipt = await rpc('eth_getTransactionReceipt', [hash]);
    if (!receipt) return json({ error: 'Transaction receipt not found yet', status: 'pending_chain' }, 409);
    if (!verifiedUsdGTransfer(receipt, row.merchant_address, row.amount_usdg_base)) {
      return json({ error: 'Receipt has no matching successful USDG transfer for this intent' }, 422);
    }
    const verifiedAt = new Date().toISOString();
    const update = await env.ponsmcp_payments.prepare(
      "UPDATE payment_intents SET status = 'paid', tx_hash = ?, verified_at = ? WHERE id = ? AND status = 'pending'"
    ).bind(hash, verifiedAt, row.id).run();
    if (update.meta.changes !== 1) return json({ error: 'Intent state changed; fetch it again' }, 409);
    const settled = await env.ponsmcp_payments.prepare('SELECT * FROM payment_intents WHERE id = ?').bind(row.id).first();
    return json({ intent: publicIntent(settled), receipt: { block_number: Number.parseInt(receipt.blockNumber, 16), gas_used: Number.parseInt(receipt.gasUsed, 16) } });
  } catch (error) {
    return json({ error: error?.message ?? 'Could not verify payment' }, 500);
  }
}
