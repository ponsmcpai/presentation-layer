# Agent integration patterns

PonsMCP is a stdio MCP server, so it plugs into any MCP client runtime. Three patterns cover most agent architectures.

## Pattern 1: direct tool calls

The agent runtime lists the 27 tools and calls them as needed. This is the default path — no extra wiring.

```text
payments:    pons_quote, pons_pay, pons_pay_resource, pons_tx_status, pons_balance
x402:        x402_fetch, x402_discover
research:    pons_chain_info, pons_price, pons_token_info, pons_launch_info,
             pons_launch_market, pons_launch_feed, pons_graduated_launches,
             pons_launch_ranking, pons_v2_launch, pons_v2_snipe_tax,
             pons_v2_quote_buy, pons_v2_quote_sell, pons_escrow_balance,
             pons_escrow_token_balance, pons_stocks_list, pons_stock_price,
             pons_stock_info, pons_stocks_screen
transfers:   pons_send_token, pons_send_eth
```

## Pattern 2: intent-driven (web console + agent)

A browser console creates a **persistent payment intent** (merchant, amount, service). The agent receives the intent ID and executes `pons_pay` against it. The console then verifies the returned hash against the exact intent — this is what PonsMCP's Mission Control does.

## Pattern 3: 402 resource unlock

A merchant service returns `402 PAYMENT-REQUIRED` with a price. The agent:
1. quotes the price with `pons_quote`,
2. settles with `pons_pay` to the payTo address,
3. retries the resource with the transaction hash,
4. the merchant verifies the receipt (exact token, recipient, amount, uniqueness) and unlocks the response.

This is the loop implemented by the PonsMCP registry endpoints (`/api/merchant/r/:serviceId`).

## Pattern 4: x402 services

For servers that speak the x402 convention (payment requirements in an `X-PAYMENT` response header or `{ x402Version, accepts }` body, settlement proof returned in an `X-PAYMENT` request header), the agent does not hand-roll the loop — `x402_fetch` does fetch → 402 → parse → policy-checked settlement → retry with proof in one call. `x402_discover` probes a domain for its paid-resource manifest first. See [x402-compatibility.md](../x402-compatibility.md).
