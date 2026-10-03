# Tool reference

PonsMCP exposes **27 MCP tools**: 25 pons tools plus 2 x402 compatibility tools. Only `pons_pay`, `pons_pay_resource`, `pons_send_token`, `pons_send_eth`, and `x402_fetch` move funds — every other tool is read-only and needs no wallet.

## Reference table

| # | Tool | Input | Result |
|---|---|---|---|
| 1 | `pons_chain_info` | none | Robinhood Chain network info: chain ID, latest block, gas price, explorer, canonical PONS / USDG / WETH addresses |
| 2 | `pons_price` | none | PONS market snapshot: best pair price, liquidity, 24h change, plus top 5 pairs (DexScreener) |
| 3 | `pons_launch_info` | `token` (0x addr) | pons v1 launch metadata read from the token contract: canonical pool, fixed supply, logo, description, socials |
| 4 | `pons_launch_market` | `token` (0x addr) | live DEX pairs for a pons launch token: best pair, price, liquidity, 24h change, top 5 |
| 5 | `pons_v2_launch` | `token` (0x addr) | pons v2 factory launch record: deployer, paired token, pool fee, supply, restrictions end block |
| 6 | `pons_v2_snipe_tax` | `curve`, `recipient` | decaying opening snipe tax (bps) a v2 curve would charge a specific recipient right now |
| 7 | `pons_v2_quote_buy` | `quoteIn`, `quoteReserve`, `tokenReserve`, `sellable`, `feeBps`, `creatorTaxBps`, `rawSnipeBps` | pure curve buy quote: tokens out, fee, tax, snipe tax, refund — no chain reads |
| 8 | `pons_v2_quote_sell` | `tokensIn`, `quoteReserve`, `tokenReserve`, `feeBps`, `creatorTaxBps` | pure curve sell quote: quote out, fee, tax, net proceeds — no chain reads |
| 9 | `pons_escrow_balance` | `recipient` | claimable native ETH balance on the v2 fee escrow |
| 10 | `pons_escrow_token_balance` | `recipient`, `token` | claimable ERC-20 balance on the v2 fee escrow (quote asset / launch-token buyback vest) |
| 11 | `pons_launch_feed` | optional `limit` (1–50, default 10) | recent pons launches from the official v1 feed: name, symbol, address, creator, timing |
| 12 | `pons_token_info` | `token` (0x addr) | ERC-20 name, symbol, decimals, and total supply for any token |
| 13 | `pons_balance` | optional `token` (addr or ticker) | configured agent wallet balance; requires `PONSMCP_PRIVATE_KEY` |
| 14 | `pons_quote` | `amountUsd` | USD amount converted to six-decimal USDG settlement units; no transaction |
| 15 | `pons_pay` | `payTo`, `amountUsd`, optional `waitMs` | policy decision → broadcast → verified receipt; requires private key |
| 16 | `pons_pay_resource` | `url`, optional `waitMs` | fetch a 402 resource, parse the price, settle exactly that price; requires private key |
| 17 | `pons_tx_status` | `txHash` | receipt state: status, block, gas used, decoded ERC-20 transfers |
| 18 | `x402_fetch` | `url`, optional `waitMs` | fetch any URL; on x402 402, settle the exact price and retry with the signed X-PAYMENT proof header; requires private key |
| 19 | `x402_discover` | `domain` | probe `/.well-known/x402` and `/api/x402/manifest` for paid resources; read-only |
| 20 | `pons_stocks_list` | none | all 19 tokenized stock tokens on Robinhood Chain with contract addresses |
| 21 | `pons_stock_price` | `ticker` (e.g. `NVDA`) or 0x addr | live DEX price, liquidity, 24h change for a stock token |
| 22 | `pons_stock_info` | `ticker` or 0x addr | on-chain metadata (name, symbol, supply) for a stock token |
| 23 | `pons_stocks_screen` | optional `minLiquidityUsd`, `gradeA` | screen all 19 stock tokens with live DEX data; rank and filter by liquidity / Grade A tier |
| 24 | `pons_graduated_launches` | optional `limit` (default 20) | pons v1 launches that have graduated (reached liquidity threshold) |
| 25 | `pons_launch_ranking` | optional `limit` (default 20, max 50), `sortBy` (`graduation` \| `liquidity` \| `change24h`) | ranked launches with signal tiers: Graduated / Grade A / Early Watch / Watch / Low Signal |
| 26 | `pons_send_token` | `to`, `token`, `amount`, optional `waitMs` | send any ERC-20 on Robinhood Chain; policy caps apply; requires private key |
| 27 | `pons_send_eth` | `to`, `amountEth`, optional `waitMs` | send native ETH on Robinhood Chain; requires private key |

Tool discovery is dynamic: call `tools/list` after MCP initialization instead of hard-coding this inventory. See [x402-compatibility.md](x402-compatibility.md) for how tools 18–19 interact with x402 services.

## Input validation

Token and recipient addresses must be a `0x` prefixed 40-hex-character EVM address. Transaction hashes must be `0x` plus 64 hex characters. Token arguments accept a contract address or a known ticker (`USDG`, `PONS`, `WETH`, `NVDA`, `TSLA`, …). Calls with invalid identifiers fail before chain work begins.

## Read tools versus write tools

Five tools move funds: `pons_pay`, `pons_pay_resource`, `pons_send_token`, `pons_send_eth`, and `x402_fetch` (only when the target answers 402). All enforce the same policy caps before signing (`PONSMCP_MAX_PER_TX`, `PONSMCP_DAILY_LIMIT`; `pons_send_eth` additionally caps at 0.01 ETH per tx / 0.1 ETH per day). A quote does not reserve funds or approve anything. A receipt lookup does not prove a transaction matches a particular merchant invoice unless the caller compares token, recipient, and amount against that invoice.

## Examples

### Read: chain info

```text
pons_chain_info {}
→ { "chain": "Robinhood Chain", "chainId": 4663, "latestBlock": 12345678,
    "gasPriceGwei": 0.02, "tokens": { "pons": "0x39db…4571", "usdg": "0x5fc5…d168", … } }
```

### Read: PONS market

```text
pons_price {}
→ { "best": { "priceUsd": 0.021, "liquidityUsd": 812000, "pair": "0x…", "dex": "…", "change24h": 3.4 },
    "pairsCount": 12, "top5": [ … ] }
```

### Read: launch feed

```text
pons_launch_feed { "limit": 5 }
→ { "source": "…", "count": 5, "launches": [ { "name": "…", "symbol": "…", "address": "0x…", … } ] }
```

### Quote (no execution)

```text
pons_quote { "amountUsd": "5.00" }
→ { "usd": "5.00", "token": "0x5fc5…d168", "symbol": "USDG",
    "amountBase": "5000000", "amountHuman": "5",
    "note": "quote only — nothing executed" }
```

### Pay (writes)

```text
pons_pay { "payTo": "0xMerchant…", "amountUsd": "2.50" }
→ { "ok": true, "stage": "confirmed", "txHash": "0x…", "explorer": "https://robinhoodchain.blockscout.com/tx/0x…",
    "blockNumber": 12345789, "gasUsed": 52735,
    "transfers": [ { "token": "0x5fc5…d168", "from": "0xAgent…", "to": "0xMerchant…", "amountHuman": "2.5" } ] }
```

Failure stages: `policy_denied` (cap or balance), `failed` (reverted or RPC error), `timeout` (no receipt in the wait window).

### Pay for a 402 resource (writes)

```text
pons_pay_resource { "url": "https://api.example.com/market-brief" }
→ { "ok": true, "stage": "paid", "priceUsdg": "2.50", "payTo": "0xMerchant…", "chainId": 4663,
    "payment": { "ok": true, "stage": "confirmed", "txHash": "0x…", … } }
```

Nothing broadcasts unless the 402 body parses to a price and recipient and policy allows the amount.

### x402: fetch with auto-settlement (writes only on 402)

```text
x402_fetch { "url": "https://api.example.com/premium-data" }
→ { "ok": true, "status": 200, "paid": true, "still402": false,
    "json": { …the paid payload… },
    "payment": { "ok": true, "stage": "confirmed", "txHash": "0x…", … } }
```

Free URLs return `paid: false` with the normal response. See [x402-compatibility.md](x402-compatibility.md) for the full protocol flow.

### x402: discover paid resources (read-only)

```text
x402_discover { "domain": "api.example.com" }
→ { "ok": true, "domain": "api.example.com", "source": "https://api.example.com/.well-known/x402",
    "resources": [ { "url": "https://api.example.com/brief", "priceUsdg": "2.5", "payTo": "0x…", "description": "…" } ] }
```

### Send a token (writes)

```text
pons_send_token { "to": "0xRecipient…", "token": "USDG", "amount": "5.00" }
→ { "ok": true, "txHash": "0x…", "explorer": "…", "token": "0x5fc5…d168",
    "amountHuman": "5.00", "decimals": 6, "block": 12345790, "gasUsed": 51421 }
```

### Send ETH (writes)

```text
pons_send_eth { "to": "0xRecipient…", "amountEth": "0.001" }
→ { "ok": true, "txHash": "0x…", "explorer": "…", "valueWei": "1000000000000000", "block": 12345791 }
```

### Screen stock tokens

```text
pons_stocks_screen { "gradeA": true }
→ { "screened": 19, "returned": 7, "tokens": [ { "symbol": "NVDA", "priceUsd": 178.2, "liquidityUsd": 240000, "tier": "Grade A" }, … ] }
```

### Rank launches

```text
pons_launch_ranking { "limit": 20, "sortBy": "graduation" }
→ { "total": 20, "sortedBy": "graduation",
    "summary": { "Graduated": 3, "Grade A": 5, "Early Watch": 4, "Watch": 6, "Low Signal": 2 },
    "launches": [ … ] }
```
