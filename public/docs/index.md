# PonsMCP documentation

PonsMCP is a local Model Context Protocol server and TypeScript SDK for agents operating on Robinhood Chain (chain ID `4663`). It has two capability groups:

1. **pons intelligence** — read PONS market data and self-describing pons launch tokens directly onchain.
RPC: set `PONSMCP_ALCHEMY_KEY` to route all chain reads through Alchemy (recommended for agents; falls back to public endpoints automatically).

2. **payment execution** — quote USDG, apply local limits, sign from the configured agent wallet, broadcast, and inspect receipts.

3. **x402 compatibility** — agents using the x402 convention (`HTTP 402` + `X-PAYMENT` headers) can fetch paid resources with automatic settlement: see [x402-compatibility.md](x402-compatibility.md).

## Documentation structure

```
docs/
├── concepts/
│   ├── mpp-protocol.md          # What is MPP and HTTP 402
│   ├── robinhood-settlement.md  # USDG settlement on chain 4663
│   ├── agent-integration.md     # Agent payment patterns
│   └── pons-purpose.md          # What PONS is for in PonsMCP
├── guides/
│   ├── typescript-sdk.md        # Full SDK guide
│   ├── merchant-integration.md  # Accept agent payments
│   └── security.md              # Keys, policy, signing
├── x402-compatibility.md        # x402 protocol support and paid-resource fetch
└── api/
    ├── sdk-reference.md         # Client API
    └── intents-api.md           # Intents + merchant registry
```

## Quick links

- [What is MPP?](concepts/mpp-protocol.md)
- [x402 compatibility](x402-compatibility.md)
- [Robinhood Chain settlement](concepts/robinhood-settlement.md)
- [TypeScript SDK guide](guides/typescript-sdk.md)
- [Merchant integration](guides/merchant-integration.md)
- [SDK reference](api/sdk-reference.md)
- [Payment intents API](api/intents-api.md)
- [Tool reference](tools.md)

## Honest availability

- The MCP server runs locally over stdio today (npm: `@ponsmcp/sdk`).
- The agent wallet private key never belongs in the browser UI.
- Payments settle in USDG; PONS/pons market reads are separate tools.
- `$MCP` is live: contract `0x15da2596F4C21227185466066Bf0f19d9D526B8a` on Robinhood Chain (4663). Verify name/symbol/supply on-chain yourself before trusting any ticker — this doc links the canonical address, not a name.
