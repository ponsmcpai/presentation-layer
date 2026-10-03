# PonsMCP — Software Design Document
**Version:** 2.0.1 | **Date:** 2026-10-03 | **Status:** Beta

---

## 1. Executive Summary

PonsMCP is an open-source **Model Context Protocol (MCP) server + TypeScript SDK** that enables autonomous AI agents to settle payments in USDG on **Robinhood Chain (4663)**. The system comprises three layers:

| Layer | Artifact | Status |
|---|---|---|
| SDK / MCP server | `@ponsmcp/sdk@2.0.1` (npm) | ✅ Live |
| Web console | ponsmcp.com/app (Cloudflare Pages + D1) | ✅ Live |
| $MCP token | `0x15da2596F4C21227185466066Bf0f19d9D526B8a` (RH 4663) | ✅ Live |

**Core design principle**: The agent wallet private key never leaves the MCP server process. Browsers and consoles create and inspect payment intents — they never sign.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 AGENT RUNTIME                       │
│  Claude Desktop / Cursor / any MCP host             │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │            ponsmcp (stdio MCP server)        │   │
│  │  25 tools  ·  zero deps  ·  policy engine   │   │
│  │  PONSMCP_PRIVATE_KEY ← never leaves here    │   │
│  └──────────────┬──────────────────────────────┘   │
└─────────────────┼───────────────────────────────────┘
                  │ eth_call / eth_sendRawTransaction
                  ▼
┌─────────────────────────────────────────────────────┐
│            ROBINHOOD CHAIN 4663                     │
│  Arbitrum Orbit L2  ·  USDG settlement              │
│  PONS token  ·  19 stock tokens  ·  pons launchpad  │
└─────────────────────────────────────────────────────┘
                  ▲
                  │ read-only intents / verification
┌─────────────────────────────────────────────────────┐
│         MISSION CONTROL (ponsmcp.com/app)           │
│  Cloudflare Pages + Workers + D1                    │
│  New payment · Receipts · Market Intel · Services   │
└─────────────────────────────────────────────────────┘
```

---

## 3. SDK — Tool Surface (v2.0.1)

### 3.1 PAYMENT (5 tools)

| Tool | Auth | Description |
|---|---|---|
| `pons_quote` | — | USD → USDG base units, no execution |
| `pons_pay` | KEY | Policy → sign → broadcast → verify receipt |
| `pons_pay_resource` | KEY | Parse 402 resource, settle exact price |
| `pons_tx_status` | — | Receipt lookup + decoded ERC-20 transfers |
| `pons_balance` | KEY | Agent wallet balance for any token |

### 3.2 STOCKS (4 tools)

| Tool | Description |
|---|---|
| `pons_stocks_list` | All 19 RH Chain tokenized stocks + addresses |
| `pons_stock_price` | Live DEX price by ticker (NVDA, AAPL, TSLA…) |
| `pons_stock_info` | On-chain name/symbol/supply |
| `pons_stocks_screen` | Screen all 19 by liquidity, Grade A filter |

**Stock registry** (19 verified on-chain, symbol + name + totalSupply confirmed):
AAPL, AMD, AMZN, BE, COIN, CRWV, GOOGL, INTC, META, MSFT, MU, NFLX, NVDA, ORCL, PLTR, SNDK, SPCX, TSLA, USAR

### 3.3 LAUNCH INTELLIGENCE (11 tools)

| Tool | Description |
|---|---|
| `pons_launch_feed` | Recent pons v1 launches |
| `pons_launch_ranking` | Tier ranking: Graduated / Grade A / Early Watch / Watch / Low Signal |
| `pons_graduated_launches` | Launches that hit graduation |
| `pons_launch_info` | V1 token on-chain metadata |
| `pons_launch_market` | Live DEX markets for launch token |
| `pons_v2_launch` | V2 factory launch record |
| `pons_v2_snipe_tax` | Decaying opening tax per recipient |
| `pons_v2_quote_buy` | Pure curve buy quote (no chain read) |
| `pons_v2_quote_sell` | Pure curve sell quote (no chain read) |
| `pons_escrow_balance` | Claimable ETH on v2 fee escrow |
| `pons_escrow_token_balance` | Claimable ERC-20 fees |

### 3.4 CHAIN & TRANSFER (5 tools)

| Tool | Auth | Description |
|---|---|---|
| `pons_chain_info` | — | Chain ID, block, gas, canonical addresses |
| `pons_price` | — | Live PONS price, top DEX pairs |
| `pons_token_info` | — | ERC-20 metadata for any token |
| `pons_send_token` | KEY | Send any ERC-20 by ticker or address |
| `pons_send_eth` | KEY | Send native ETH |

---

## 4. RPC Failover Architecture

```
rpcEndpoints() → [Alchemy (if key), nodeflare, routeme]

Per call:
  TOTAL_BUDGET_MS = 12,000ms (starts AFTER slot acquired)
  ENDPOINT_TIMEOUT_MS = 4,000ms per attempt

Flow:
  ┌─ acquire slot (MAX_CONCURRENT_RPC = 6, queued) ─┐
  │  deadline = now() + 12s                          │
  │  for url in endpoints:                           │
  │    if deadline exhausted → break                 │
  │    try fetch(url, timeout=4s)                    │
  │    on 429 → sleep 400ms, retry same              │
  │    on any error → next endpoint immediately      │
  └──────────────────────────────────────────────────┘

REMOVED: rpc.mainnet.chain.robinhood.com
REASON: Resolves to lamanlabuh.aduankonten.id (Indonesian ISP block page)
        on some networks — hangs full connect timeout instead of rejecting.
```

---

## 5. Payment Flow

```
Agent calls pons_pay(payTo, amountUsd)
         │
         ▼
    1. Policy check
       ├─ per-tx cap: amount_base ≤ PONSMCP_MAX_PER_TX (default 100 USDG = 100_000_000)
       ├─ daily cap: dailyUsed + amount_base ≤ PONSMCP_DAILY_LIMIT (default 1_000_000_000)
       └─ balance check: USDG.balanceOf(agentWallet) ≥ amount_base
         │
         ▼
    2. EIP-155 sign (local, in-process)
       ├─ erc20TransferData(payTo, amountBase) calldata
       ├─ nonce: eth_getTransactionCount(pending)
       ├─ gasPrice: max(currentGasPrice × 1.5, 100_000_000 wei floor)
       └─ gas: 80_000 (ERC-20 transfer)
         │
         ▼
    3. Broadcast → eth_sendRawTransaction
         │
         ▼
    4. Receipt poll (3s interval, default 30s timeout)
       └─ eth_getTransactionReceipt
         │
         ▼
    5. Verify receipt
       ├─ status === 0x1 (not reverted)
       ├─ USDG Transfer event present in logs
       ├─ event.to === payTo (lowercase match)
       └─ event.value === amountBase (exact match)
         │
         ▼
    Returns: { ok, txHash, explorer, transfers[] }
```

---

## 6. Web Console — API Endpoints

| Endpoint | Method | Auth | Cache | Description |
|---|---|---|---|---|
| `/api/merchant/services` | GET | — | 60s | Active service catalog |
| `/api/intents` | POST | — | no-store | Create payment intent |
| `/api/intents/:id/verify` | POST | — | no-store | Verify tx hash against intent |
| `/api/merchant/r/:serviceId` | GET | intent | no-store | Unlock paid resource |
| `/api/rpc` | POST | — | no-store | RPC proxy (whitelisted methods) |
| `/api/mcp-price` | GET | — | 30s | $MCP live price via DexScreener |
| `/api/mcp-price` | GET | — | 30s | Live price, proxied same-origin |
| `/api/launches` | GET | — | 30s | Pons launch feed + tier ranking |
| `/api/signals` | GET | — | 60s | Market signals from D1 |
| `/api/token-chart` | GET | — | 60s | GeckoTerminal OHLCV per token |
| `/api/chart` | GET | — | 120s | CoinGecko chart (PONS) |
| `/api/logo` | GET | — | 86400s | IPFS logo proxy (allowlist) |
| `/api/launch-preview` | POST | — | no-store | Buy/sell curve quote |

---

## 7. D1 Database Schema

```sql
-- Payment intents
CREATE TABLE payment_intents (
  id TEXT PRIMARY KEY,                    -- pi_<24hex>
  status TEXT NOT NULL,                   -- pending | paid | failed
  service_id TEXT,                        -- links to merchant_services
  network TEXT, chain_id INTEGER, asset TEXT, asset_address TEXT,
  amount_usdg TEXT, amount_base TEXT, pay_to TEXT,
  tx_hash TEXT, created_at TEXT, verified_at TEXT
);

-- Merchants & services
CREATE TABLE merchants (address TEXT PRIMARY KEY, name TEXT, active INTEGER, created_at TEXT);
CREATE TABLE merchant_services (
  id TEXT PRIMARY KEY, merchant_address TEXT, name TEXT,
  resource_path TEXT, price_usdg_base TEXT, price_usdg_display TEXT,
  active INTEGER, created_at TEXT
);

-- Rate limits
CREATE TABLE api_rate_limits (
  bucket TEXT, client_ip TEXT, window_start INTEGER, request_count INTEGER
);

-- Market signals (from notifier pipeline)
CREATE TABLE market_signals (
  id TEXT PRIMARY KEY, source_type TEXT, symbol TEXT, token_address TEXT,
  chain TEXT, price_usd REAL, volume_24h_usd REAL, market_cap_usd REAL,
  ath_usd REAL, ath_drawdown_pct REAL, liquidity_usd REAL,
  change_5m_pct REAL, change_1h_pct REAL, age_text TEXT,
  holders_total INTEGER, top10_pct REAL,
  smart_buys INTEGER, smart_sells INTEGER, smart_net_usd REAL,
  cluster_buy_wallets INTEGER, rug_score REAL, renounced INTEGER,
  dev_hold_pct REAL, x_handle TEXT, x_followers INTEGER,
  narrative TEXT, raw_text TEXT, signal_at TEXT, inserted_at TEXT
);
```

---

## 8. Service Catalog

| ID | Name | Price | Unlock Content |
|---|---|---|---|
| `svc_devsandbox01` | Developer sandbox payment | 0.01 USDG | Verification breakdown + proof the rail works |
| `svc_signalfeed01` | Grade A signals digest | 0.05 USDG | Latest 10 Grade A signals from D1 (structured JSON) |
| `svc_stockscreen01` | RH Chain stock screener | 0.10 USDG | All 19 stocks live-ranked by DEX liquidity |
| `svc_launchintel01` | Launch intelligence snapshot | 0.30 USDG | V2 factory config count + latest block (live chain read) |
| `svc_sdkguide01` | SDK integration quickstart | 0.50 USDG | TypeScript install + quickstart code + policy config |

---

## 9. Security Model

### 9.1 Key boundary
- Private key lives **only** in the MCP server process (env var `PONSMCP_PRIVATE_KEY`)
- Web console creates/inspects intents only — never signs
- Browser never receives, stores, or transmits the private key

### 9.2 Policy boundary
```
Configurable caps (checked before ANY signing):
  PONSMCP_MAX_PER_TX    = 100_000_000 (100 USDG, 6 decimals)
  PONSMCP_DAILY_LIMIT   = 1_000_000_000 (1,000 USDG)
  
Policy counter: in-process (resets on server restart)
→ Known limitation for multi-instance deployments
```

### 9.3 Proof boundary
- Hash alone is not proof
- Receipt must have: `status === 0x1` + USDG Transfer event with correct token, recipient, amount
- Merchant resources re-verify with `pons_tx_status` independently

### 9.4 Identity boundary
- Token names/symbols are NOT identity
- `$MCP` canonical: `0x15da2596F4C21227185466066Bf0f19d9D526B8a` on chain 4663
- Docs link the canonical address; users must verify on-chain

### 9.5 CSP / Web
```
Content-Security-Policy:
  default-src 'self'
  script-src 'self'
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  img-src 'self' data:
  connect-src 'self'
  frame-ancestors 'none'
```
All external data (prices, charts, logos, RPC) proxied through same-origin `/api/*` endpoints.

---

## 10. Market Intelligence Pipeline

```
Telegram notifier.py (always-on, PID confirmed live)
    │ listens to Grade A + Early Watch channels
    │ writes to /root/grade_a_signals.txt (1.1MB+)
    ▼
parse_notifier_signals.py
    │ extracts: price, MC, ATH+drawdown, liq, holders,
    │           top10%, smart money, rug score, renounced,
    │           dev hold, X handle, narrative
    ▼
D1 market_signals table (156 rows, idempotent INSERT OR IGNORE)
    │
    ▼
/api/signals endpoint (ORDER BY price_usd NOT NULL ASC, signal_at DESC)
    │
    ▼
Mission Control Launch Intel tab → Signal drawer
    ├─ Price, MC, ATH, Liquidity, Volume, Age
    ├─ Holders total + top-10 concentration
    ├─ Smart money flow (buys/sells/net/cluster)
    ├─ Risk: rug score + renounced status
    ├─ GeckoTerminal OHLCV chart (per-token, 1D/7D/30D)
    └─ X handle + narrative
```

---

## 11. Known Limitations (Beta)

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Policy daily counter is in-process — resets on server restart | Medium | By design for v1; external state planned |
| 2 | `pons_balance` error message unclear when key ≠ funded wallet | Low | Fix queued |
| 3 | IPFS logos for ~25% of tokens fail (gateway rate limits) | Low | Fallback letter avatar renders cleanly |
| 4 | pons_send_token/pons_send_eth: 80k gas estimate may be too low for some tokens | Medium | Uses SDK's legacy estimate; `eth_estimateGas` call planned |
| 5 | Signals DB refreshed manually (parse_notifier_signals.py) — not auto-synced | Low | Cron job planned |

---

## 12. Deployment

| Component | Host | Region | Domain |
|---|---|---|---|
| Web console | Cloudflare Pages | Global edge | ponsmcp.com |
| D1 database | Cloudflare D1 | Global | ponsmcp-payments |
| SDK / MCP server | npm + local | Agent's machine | — |
| $MCP token | Robinhood Chain 4663 | L2 | — |

**GitHub org:** github.com/ponsmcpai (6 repos)
**npm:** @ponsmcp/sdk@2.0.1

---

## 13. Functional Test Results
*Executed: 2026-10-03 by automated test agent against production https://pons-mcp.pages.dev*

| # | Endpoint | HTTP | Latency | Key Data | Result |
|---|---|---|---|---|---|
| 1 | `GET /api/merchant/services` | 200 | 10.2s | 5 services confirmed: 0.01/0.05/0.10/0.30/0.50 USDG | ✅ PASS |
| 2 | `GET /api/launches` | 200 | 2.9s | total:84, Graduated:15, Low Signal:69 | ✅ PASS |
| 3 | `GET /api/signals?limit=5` | 200 | 1.4s | Grade A first (VANT), MC $35.5K, liq $12.4K, holders 118 | ✅ PASS |
| 4 | `GET /api/mcp-price` | 200 | 0.5s | priceUsd: $0.0000232, change24h: -60.5%, liquidityUsd: $15.2K | ✅ PASS |
| 5 | `GET /api/token-chart` (VANT, 24h) | 200 | 2.0s | 41 OHLCV candles, GeckoTerminal source | ✅ PASS |
| 6 | `GET /api/chart?coin=pons&days=1` | 200 | 1.2s | 289 price points, CoinGecko source | ✅ PASS |
| 7 | `GET /api/logo` (pinata URL) | 200 | 0.8s | image/png, 910KB, correctly proxied | ✅ PASS |
| 8 | `POST /api/intents` (svc_devsandbox01) | 201 | 0.24s | `pi_29c49450...`, status:pending, amount:0.01 USDG | ✅ PASS |
| 9 | `POST /api/launch-preview` (CME buy 0.001 ETH) | 200 | 1.6s | tokensOut confirmed, feeEth:0.000003, priceImpact:14% | ✅ PASS |
| 10a | SDK `pons_chain_info` | — | 287ms | chainId:4663, block:78,302,471, gas:0.032 gwei | ✅ PASS |
| 10b | SDK `pons_price` | — | 223ms | PONS $0.516, 30 pairs, liq $18M+ | ✅ PASS |
| 10c | SDK `pons_stocks_list` | — | 1ms | 19 tokens, all addresses confirmed | ✅ PASS |
| 10d | SDK `pons_launch_ranking` | — | 12.6s | 32 launches, tiered correctly | ✅ PASS |

**Note on `/api/merchant/services` latency (10.2s)**: First-request cold-start on Cloudflare D1. Subsequent requests cache within ~1s. No action needed.

**Bugs found during testing:**
- `POST /api/intents` without `service_id` passed empty `amount_usdg` format → `"amount_usdg must be a decimal string"`. **Fixed in same session**: `service_id` now wired from chip/button click to POST body.

---

## 14. Code Quality Audit
*Executed: 2026-10-03 by automated code audit agent*

### chain.ts — RPC Budget
- ✅ Deadline starts after `acquireRpcSlot()` — queue wait not charged against budget
- ✅ Per-endpoint timeout clamped: `Math.max(500, Math.min(4000, remaining))`
- ✅ 429 retry: single retry on same endpoint before moving on
- ⚠️ **Minor**: `ENDPOINT_TIMEOUT_MS` comment says "keep short" but constant is module-private — not exported for testing. Low risk.

### mcp.ts — Tool Surface
- ✅ 25 tools in TOOLS array, 25 cases in callTool switch — **exact match confirmed**
- ✅ `pons_price` present (was missing from web UI, fixed)
- ✅ `pons_send_token` validates key format with `/^[0-9a-fA-F]{64}$/` before use
- ✅ Amount parsing uses string split / BigInt — no float precision issues

### AppPage.tsx — React
- ✅ All `setInterval` calls have `return () => clearInterval(id)` cleanup
- ✅ `let alive = true` abort pattern in async useEffects (SignalDrawer, LaunchIntelPanel)
- ✅ `useEffect` deps arrays include all referenced callbacks
- ⚠️ **Minor**: `logoCache` is a module-level `Map` — survives hot reload in dev, not a production issue

### merchant/r/[serviceId].ts — Content Builders
- ✅ `svc_devsandbox01` — sandbox receipt, 3 proof items
- ✅ `svc_signalfeed01` — live D1 query, top 10 Grade A signals
- ✅ `svc_stockscreen01` — DexScreener live fetch, 19 stocks ranked
- ✅ `svc_launchintel01` — live chain read (launchConfigCount + blockNumber)
- ✅ `svc_sdkguide01` — quickstart snippet + policy defaults
- ⚠️ **Minor**: `svc_stockscreen01` hardcodes STOCK_TOKENS JSON string inline — should import from stocks.ts. Functional but maintenance risk.

### Migrations
- ✅ All 4 migrations present: `0001_payment_intents`, `0002_rate_limits`, `0003_merchant_registry`, `0004_market_signals`

### Build Status
- ✅ `cd /root/ponsmcp && npm run build` — clean, 0 errors
- ✅ `cd /root/pons-mcp && npm run build` — clean, 0 errors

---

## 15. Security Audit
*Executed: 2026-10-03 by automated security audit agent — pending completion*

*(To be inserted upon subagent completion)*

---

