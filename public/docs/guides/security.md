# Security guide

## Key handling

- Private keys live **only** in the MCP server process environment (`PONSMCP_PRIVATE_KEY`).
- The SDK never logs key material; error messages are redacted of credential-like patterns.
- Browsers and web consoles never receive keys. Signing happens in the local runtime.

## Policy

- Per-transaction and daily caps are checked **before** signing (`src/policy.ts`).
- Balance is pre-checked: an underfunded wallet never reaches broadcast.
- The daily counter is in-process — restarting the server resets it. Operators wanting durable budgets should run one server per agent and budget via funded capital, not just policy.

## Signing

- Legacy EIP-155 transactions, chain ID 4663 (replay protection).
- Canonical low-s signatures (malleability-safe).
- k is drawn from the OS CSPRNG per signature.

## RPC

- Primary: `https://rpc.nodeflare.app/robinhood/public` — a public chain-4663 endpoint, verified live (chain ID `0x1237`).
- Fallback (reads and broadcasts): `https://lb.routeme.sh/rpc/evm/4663`. An operator may pin a single trusted endpoint with `PONSMCP_RPC_URL` or set `PONSMCP_ALCHEMY_KEY` for Alchemy-routed reads.
- Transactions are signed **locally before** broadcast, so no endpoint can alter amounts or recipients.

## For merchants

- Treat a client-supplied hash as a claim, not proof: verify token + recipient + amount + status yourself.
- Enforce hash uniqueness across intents.
- Watch the address checksum: names and tickers are not identity; contract addresses are.
