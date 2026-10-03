# Installation

## Requirements

- Node.js 20 or later (the project is tested with Node 26).
- A reachable Robinhood Chain RPC endpoint. The official public endpoint is used first; the runtime also has a read fallback for availability.
- Only for `pons_balance` and `pons_pay`: an agent wallet with ETH for gas and USDG for settlement.

## Local repository

From the repository directory:

```bash
npm install
npm run build
node dist/mcp.js
```

The process uses standard input/output for JSON-RPC. Do not write logs to stdout because MCP frames also use stdout.

## npm package

The package is published on npm as [`@ponsmcp/sdk`](https://www.npmjs.com/package/@ponsmcp/sdk):

```bash
npm install -g @ponsmcp/sdk
ponsmcp            # start the stdio MCP server
# or: npm install @ponsmcp/sdk   (use PonsMCPClient / X402Client in code)
```

## Configure a wallet only when execution is intended

All research and quote tools work without a private key: `pons_chain_info`, `pons_price`, `pons_token_info`, `pons_quote`, `pons_tx_status`, the pons v1 tools (`pons_launch_info`, `pons_launch_market`, `pons_launch_feed`, `pons_graduated_launches`, `pons_launch_ranking`), the pons v2 tools (`pons_v2_launch`, `pons_v2_snipe_tax`, `pons_v2_quote_buy`, `pons_v2_quote_sell`, `pons_escrow_balance`, `pons_escrow_token_balance`), the stock tools (`pons_stocks_list`, `pons_stock_price`, `pons_stock_info`, `pons_stocks_screen`), and `x402_discover`.

Set `PONSMCP_PRIVATE_KEY` only in the MCP server process environment when the agent must read its wallet balance, execute a payment, send tokens, or fetch an x402-gated resource (`pons_balance`, `pons_pay`, `pons_pay_resource`, `pons_send_token`, `pons_send_eth`, `x402_fetch`). Never put this value into a web form, frontend bundle, git repository, or chat message.
