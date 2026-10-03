# SDK API reference

## `PonsMCPClient`

Constructor options:

| Option | Type | Meaning |
|---|---|---|
| `privateKey` | `string` | 64-hex agent key; omit for read-only use |
| `rpcUrl` | `string` | override default chain-4663 endpoint |
| `policy.maxPerTx` | `bigint` | USDG base units per transaction |
| `policy.dailyLimit` | `bigint` | USDG base units per day |

### Methods

| Method | Returns | Notes |
|---|---|---|
| `quote(amountUsd)` | `{ token, symbol, amountBase, amountHuman, usd }` | pure conversion, 6 decimals |
| `pay({ payTo, amountUsd, waitMs? })` | `PayResult` | full policy → sign → broadcast → verify |
| `txStatus(hash)` | receipt state + transfers | independent re-verification |
| `getBalance(token?)` | `{ raw, human, decimals }` | needs private key |
| `tokenInfo(token)` | `{ name, symbol, decimals }` | read-only |
| `price()` | PONS market snapshot | DexScreener-backed |

### `PayResult`

```ts
{
  ok: boolean
  stage: 'policy_denied' | 'confirmed' | 'failed' | 'timeout'
  quote: { token, symbol, amountBase, amountHuman, usd }
  txHash?: string
  explorer?: string
  blockNumber?: bigint
  gasUsed?: bigint
  transfers?: Array<{ token, from, to, amountHuman }>
  error?: string
}
```

`ok: true` always means `stage: 'confirmed'` — a successful receipt with the exact USDG transfer verified. `policy_denied` (cap exceeded or insufficient balance), `failed` (reverted or RPC error), and `timeout` (no receipt in the wait window) all return `ok: false`.

## MCP tools (27)

The MCP server exposes 27 tools — 25 `pons_*` tools plus 2 x402 compatibility tools:

- **Chain & market reads:** `pons_chain_info`, `pons_price`, `pons_token_info`, `pons_launch_market`
- **pons v1:** `pons_launch_info`, `pons_launch_feed`, `pons_graduated_launches`, `pons_launch_ranking`
- **pons v2:** `pons_v2_launch`, `pons_v2_snipe_tax`, `pons_v2_quote_buy`, `pons_v2_quote_sell`, `pons_escrow_balance`, `pons_escrow_token_balance`
- **Payments:** `pons_balance`, `pons_quote`, `pons_pay`, `pons_pay_resource`, `pons_tx_status`
- **x402:** `x402_fetch`, `x402_discover`
- **Stock tokens:** `pons_stocks_list`, `pons_stock_price`, `pons_stock_info`, `pons_stocks_screen`
- **Transfers:** `pons_send_token`, `pons_send_eth`

See [tools.md](../tools.md) for the full per-tool inputs and examples, and [x402-compatibility.md](../x402-compatibility.md) for the x402 tools.


### `payForResource`

```ts
import { payForResource } from '@ponsmcp/sdk'

const result = await payForResource(client, 'https://service.example/endpoint')
// { ok, stage: 'parsed' | 'policy_denied' | 'paid' | 'failed' | 'unsupported',
//   priceUsdg, payTo, payment: PayResult }
```

Fetches the URL; on HTTP 402 it parses the requirement (x402 header/body shapes first, then native shapes: `amount_usdg/pay_to`, `price_usdg/merchant`, nested `intent.payment`, `service`, `create_intent`), then settles the exact price via `client.pay` with all policy checks. Nothing broadcasts unless the 402 parses and policy allows it. A `ResourcePayment` with `x402: true` means the requirement was x402-formatted.

### `X402Client`

```ts
import { PonsMCPClient, X402Client } from '@ponsmcp/sdk'

const client = new X402Client(new PonsMCPClient({ privateKey: process.env.PONSMCP_PRIVATE_KEY }))

// Fetch with transparent x402 settlement
const res = await client.fetch('https://api.example.com/premium-data')
// { ok, status, paid, json, body, still402, payment?, requirement? }

// Probe a domain for paid resources (read-only)
const found = await client.discover('api.example.com')
// { ok, domain, source, resources: [{ url, priceUsdg, payTo, description }], errors }

// Settle a requirement you already parsed
const settled = await client.settle(requirement)
// { ok, stage: 'parsed' | 'policy_denied' | 'paid' | 'failed' | 'unsupported', priceUsdg, payTo, payment }
```

Lower-level exports: `parse402Response(response, body?)` normalizes an x402 402 into requirements, `isX402Response(response, body?)` is a boolean check, `settleX402(client, requirement)` settles one requirement, and `encodePaymentHeader(requirement, payment, payer?)` builds the base64 `X-PAYMENT` proof header. Full protocol documentation: [x402-compatibility.md](../x402-compatibility.md).
