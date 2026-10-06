# Sealoo LLM Token Gateway

> **The API key stays on the server. The gateway checks on-chain Credit, then proxies the model. Metering uses upstream `usage`, not the client.**

Users never configure or hold an LLM API key. The desktop app must not call DeepSeek directly. The chain stores Credit only — not keys, not model tokens.

See `docs/prepaid-credit.en.md` and `docs/en.md` §12. Code lives in `gateway/`.

---

## 1. Goals

| Goal | Meaning |
|------|---------|
| No user key | DeepSeek (or any OpenAI-compatible) key exists only as a gateway env var |
| Credit actually gates inference | No on-chain `lock` → gateway refuses to proxy |
| Gateway owns Token truth | Accumulate provider `usage`; do not trust client-reported totals |
| Stay thin | Auth, chain reads, proxy only; tools still run on the user’s machine |

Out of scope for v1: streaming, shared ticket storage, a contract relayer for `settle`, live AVAX pricing.

---

## 2. Where things live

| Thing | Where | Not here |
|------|--------|----------|
| DeepSeek API key | Gateway process env | Desktop, installer, contract, UI |
| LLM Token usage | Gateway, from upstream `usage` | Client estimates as the settle source of truth |
| Credit | Fuji `WorkCredit` | A second ledger inside the gateway |
| Tools (files / search) | Local Go agent | Gateway |

`balanceOf` / `openTask` / `tasks` are `eth_call` and **do not spend gas**. Gas is still only `lock` / `settle` from the wallet.

---

## 3. Flow

```text
User feeds (purchase)
  → desktop estimates Tokens → estimateCredit (stop if insufficient)
  → wallet lock(taskId, estimateCredit)
  → personal_sign challenge → POST /v1/ticket
  → gateway: recover signer + eth_call openTask(owner)==taskId and Locked
  → short-lived ticket (not the DeepSeek key)
  → agent: OPENAI_BASE_URL=gateway, Authorization: Bearer <ticket>
  → POST /v1/chat/completions (re-check lock / remaining quota, then proxy)
  → cap at estimateCredit → 402
  → desktop settle from the user’s wallet (see §6)
```

`WorkCredit.settle` requires `msg.sender == owner`, so the gateway cannot settle for the user. v1: gateway enforces the cap; the desktop still `settle`s using gateway-metered Tokens. A later relayer role can move settle on-chain to the gateway.

---

## 4. HTTP API

Default listen `:8787`. OpenAI-compatible path so the existing Go client only changes BaseURL.

- `GET /health`
- `GET /v1/challenge?address=&taskId=` — exact `personal_sign` message
- `POST /v1/ticket` — `{ address, taskId, signature }` → `{ token, expiresIn, estimateCredit }`
- `POST /v1/chat/completions` — `Bearer <ticket>`; v1 rejects `stream: true`
- `GET /v1/usage` — cumulative tokens and `actualCredit` for the ticket

Rate: `TOKENS_PER_CREDIT = 1000`, rounded up.

Challenge message (newlines must match):

```text
Sealoo LLM gateway
URI: <GATEWAY_PUBLIC_URL>
Chain ID: 43113
WorkCredit: <contract>
Address: <checksum address>
Task: <taskId>
```

---

## 5. Chain checks (ticket issue and every completion)

Read-only `WorkCredit`:

1. `openTask(address)` equals `taskId` and is not zero
2. `tasks(taskId)`: `owner == address`, `state == Locked (1)`
3. `CreditFromTokens(used) <= estimate`

Otherwise the upstream key is never used.

---

## 6. Run

See `gateway/.env.example`. From `gateway/`: `go test ./...` then `go run .`

Until the desktop mints tickets, point the agent at the gateway with `OPENAI_BASE_URL` and the ticket as `OPENAI_API_KEY`.

Do not expose an un-rate-limited gateway on the public internet while Fuji Credit is free to mint — it will drain the DeepSeek balance.
