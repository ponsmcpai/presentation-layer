# x402 compatibility

PonsMCP speaks the **x402** convention for HTTP 402 payments: a server refuses an unpaid request with `402 PAYMENT-REQUIRED` plus a machine-readable price requirement, the agent settles the exact price on-chain, and retries the request with a signed payment proof header. No accounts, no API keys, no human in the loop.

Two MCP tools handle the whole loop: `x402_discover` (find paid resources on a domain, read-only) and `x402_fetch` (fetch → settle → retry, writes only when the target actually answers 402). SDK users get the same behavior programmatically via `X402Client`.

## What x402 is

x402 builds on the original meaning of HTTP `402 Payment Required`. A compliant server answers an unauthenticated/unpaid request like this:

```text
HTTP/1.1 402 PAYMENT-REQUIRED
X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSw…   ← base64-encoded JSON requirement
```

The decoded requirement (v1-style):

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "robinhood-chain",
  "resource": "https://api.example.com/premium-data",
  "description": "One market brief",
  "mimeType": "application/json",
  "maxAmountRequired": "2500000",
  "payTo": "0xMerchant…",
  "asset": "0x5fc5…d168",
  "maxTimeoutSeconds": 60
}
```

Servers may instead send the same JSON as the 402 body, either flat or wrapped as `{ "x402Version": 1, "accepts": [requirement, …] }`. All of these shapes are accepted. `maxAmountRequired` is in asset **base units** (6 decimals for USDG/USDC-style assets), so `2500000` means `2.50 USD`.

After paying, the client retries the original request with an `X-PAYMENT` request header carrying the settlement proof. The server verifies it and returns `200` with the payload.

## What PonsMCP settles and what it refuses

`x402_fetch` settles a requirement only when all of these hold — otherwise it returns a typed error and nothing is broadcast:

| Check | Requirement | PonsMCP behavior |
|---|---|---|
| Scheme | `exact` (or absent) | Any other scheme → `unsupported` |
| Network | matches `4663` or `robinhood` | Any other network → `unsupported` |
| Asset | absent, or equals USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | A demand for any other asset → `unsupported` |
| Amount | `maxAmountRequired` parses as a positive 6-decimal base-unit amount | Converted to a USD price: `2500000` → `2.5` |
| Policy | per-tx cap and daily budget allow the price | `policy_denied` — same caps as every other write tool |

Settlement itself is the standard PonsMCP payment flow: local EIP-155 signing on Robinhood Chain (chain ID 4663), an exact USDG `transfer` to the requirement's `payTo`, then receipt verification (status `0x1` + decoded transfer) before the retry header is built. The settlement proof header looks like:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "robinhood-chain",
  "payload": {
    "txHash": "0x…",
    "payer": "0xAgent…",
    "payTo": "0xMerchant…",
    "token": "0x5fc5…d168",
    "amountBase": "2500000",
    "amountHuman": "2.5",
    "chainId": 4663,
    "explorer": "https://robinhoodchain.blockscout.com/tx/0x…"
  }
}
```

(base64-encoded in the actual header; `encodePaymentHeader()` builds it.)

## MCP tools

### `x402_discover` — find paid resources (read-only)

Probes a domain's manifest endpoints — `/.well-known/x402` and `/api/x402/manifest` — and normalizes whatever it finds (bare arrays, `resources`/`accepts`/`services`/`endpoints` lists, or single objects) into a resource list with prices and recipients. Nothing is ever paid.

```text
x402_discover { "domain": "api.example.com" }
→ { "ok": true,
    "domain": "api.example.com",
    "source": "https://api.example.com/.well-known/x402",
    "resources": [
      { "url": "https://api.example.com/brief",
        "priceUsdg": "2.5", "maxAmountRequired": "2500000",
        "payTo": "0xMerchant…", "description": "Daily market brief" }
    ],
    "errors": [] }
```

### `x402_fetch` — fetch with auto-settlement (writes only on 402)

One call does the full loop: fetch the URL → if it answers 402 with a recognizable x402 requirement, run the checks above, pay the exact price with policy enforcement, wait for the verified receipt, then retry once with the signed `X-PAYMENT` proof header and return the final response.

```text
x402_fetch { "url": "https://api.example.com/premium-data" }
→ { "ok": true, "status": 200, "paid": true, "still402": false,
    "json": { …the paid payload… },
    "payment": { "ok": true, "stage": "confirmed", "txHash": "0x…", … } }
```

Behavior on free URLs: `paid: false`, `status` 200, normal body — the tool is safe to point at any URL. Behavior on a 402 that fails parsing or policy: `ok: false`, `still402: true`, a typed `error`, and no broadcast. Requires `PONSMCP_PRIVATE_KEY` in the server environment (only for the settlement step).

## SDK usage

```ts
import { PonsMCPClient, X402Client } from '@ponsmcp/sdk'

const client = new X402Client(
  new PonsMCPClient({
    privateKey: process.env.PONSMCP_PRIVATE_KEY,
    policy: { maxPerTx: 100_000_000n, dailyLimit: 1_000_000_000n }, // 100 / 1,000 USDG
  }),
)

// 1. (optional) see what a domain sells
const catalog = await client.discover('api.example.com')
for (const r of catalog.resources) console.log(r.url, r.priceUsdg)

// 2. fetch — settles transparently if the URL is x402-gated
const res = await client.fetch('https://api.example.com/premium-data')
if (res.ok) {
  console.log('paid:', res.paid)        // true only if a 402 was settled
  console.log(res.json)                 // the payload
  console.log(res.payment?.txHash)      // settlement proof, if paid
} else {
  console.log(res.status, res.error)    // typed failure, nothing broadcast
}
```

Lower-level exports if you need the pieces separately:

```ts
import { parse402Response, isX402Response, settleX402, encodePaymentHeader } from '@ponsmcp/sdk'
```

`payForResource(client, url)` remains available for the platform's native (non-x402) 402 body shapes and now also understands x402 requirements.

## Serving x402 from your own API

Any server can accept PonsMCP agents by answering 402 with a requirement and verifying the retry header:

```text
GET /premium-data
  → 402, X-PAYMENT: base64({ x402Version: 1, scheme: "exact", network: "robinhood-chain",
                             maxAmountRequired: "2500000", payTo: "0xYourMerchant…" })

GET /premium-data   (again, with X-PAYMENT proof header)
  → decode the header, take payload.txHash
  → verify on Robinhood Chain (chain 4663): receipt status 0x1, USDG transfer
    of exactly maxAmountRequired base units to your payTo address, and the
    hash has never been seen before
  → 200 with the payload
```

Verify receipts yourself — do not trust the header's claims. `pons_tx_status` (or any chain-4663 RPC) performs the on-chain verification; hash uniqueness must be enforced server-side, exactly as with the platform's native intent flow.

## FAQ

**Does x402 support change what agents pay with?** No. Settlement is always USDG on Robinhood Chain (4663), 6 decimals, through the same policy engine as `pons_pay`. x402 only changes how the price and the proof travel over HTTP.

**What if a requirement names USDC or another asset?** The settlement is refused with `unsupported` unless the asset is absent or equals the USDG contract address. Prices in `maxAmountRequired` are read as 6-decimal base units of the settlement asset.

**Can a requirement make the agent overpay?** No. The paid amount is exactly `maxAmountRequired` converted to a USD price — never a client-chosen amount — and the per-tx/daily policy caps apply on top.

**What happens if the retry after payment fails (network error, server down)?** The result reports `paid: true` with `ok: false` and an error explaining the payment settled but the retry failed. The txHash is in `payment.txHash`, so the caller can retry the request manually with the proof header.

**Is `x402_fetch` safe to run against arbitrary URLs?** It only spends when the response is a 402 with a parseable x402 requirement that passes scheme/network/asset/policy checks. Everything else returns the plain response with `paid: false`.

**Where is the manifest discovered from?** `/.well-known/x402` first, then `/api/x402/manifest`. Serve either one with a JSON list of `{ url, maxAmountRequired, payTo, description }` resources to be discoverable.
