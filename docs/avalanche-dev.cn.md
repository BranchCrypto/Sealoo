# AGENT: Avalanche / Fuji scope

Audience: Cursor agents implementing Sealoo Web3. Not end-user docs.
Canonical product/credit specs: `docs/cn.md`, `docs/prepaid-credit.cn.md`, `docs/llm-gateway.cn.md`. Prefer those for API details; this file is constraints + wiring.

## Network (hard)

- Only Avalanche Fuji C-Chain. Never Mainnet (`43114`). Never custom L1 / P-Chain / X-Chain / ICM.
- Chain ID: `43113` (`0xA869`)
- RPC: `https://api.avax-test.network/ext/bc/C/rpc`
- Currency: AVAX (test)
- Explorer / faucet: https://build.avax.network/docs/primary-network · https://build.avax.network/console
- Hub: https://build.avax.network/ — use C-Chain path only

## Done (do not rebuild)

- Desktop pet (Tauri + Three.js), quickbar, prefs, home setup
- Go Agent: `read` `write` `edit` `bash` `search_web` `fetch_page`
- LLM gateway (`gateway/`): DeepSeek key on server, Fuji `eth_call` Credit checks, OpenAI-compatible proxy
- Client Token tally + `CreditFromTokens` (`TOKENS_PER_CREDIT = 1000`) in `agent/runtime`

## TODO (in scope)

1. Solidity on Fuji: `AgentRegistry` — `mint` `ownerOf` `getAgent` (`agentId` `owner` `metadata`)
2. Solidity on Fuji: `WorkCredit` — `balanceOf` `lockedOf` `purchase` `lock(taskId, estimate)` `settle(taskId, actual)`; events `CreditLocked` / `CreditSettled` (TaskId)
3. Wallet **integration** (do not build a wallet): prefer Avalanche **Core** (Hub Integrations); MetaMask on Fuji OK. App requests txs → user signs in external wallet. No private key / seed in Sealoo.
4. Client flow: estimateTokens → estimateCredit → if `available < estimate` refuse (Need Credit, no tools) → `lock` → run Agent (cap tools at estimate) → `settle(actual)` on any terminal state (success/cancel/fail)
5. UI: Network=Fuji, Last synced, tx status `idle|awaiting_wallet|pending|confirmed|failed`; post-task TaskId + Credit delta + Explorer link (TaskId ↔ tx)

## Credit rules (source of truth = Fuji contract)

```
estimateCredit = ceil(estimateTokens / 1000)
actualCredit   = ceil(actualTokens / 1000)
```

- Local Credit display = cache only
- Per task on-chain: exactly `lock` then `settle` (never per-tool settle)
- Cancel still settles actual Tokens used

## Stack touchpoints

- Contracts: new (none in repo yet). Deploy Foundry or Hardhat → Fuji
- TS app: `app/src/` (quickbar, home, wallet **status** UI — not a keystore). Connect via Core / injected provider / WalletConnect-style bridge as needed for Tauri. SDK: https://build.avax.network/docs/tooling/avalanche-sdk/client/getting-started · c-chain-client · wallet-client; Core: https://build.avax.network/integrations
- Rust: `app/src-tauri/src/lib.rs` (agent spawn/events); desktop↔wallet may need deep-link / local callback — still to Core/MetaMask, not a custom wallet
- Agent: `agent/runtime` — wire pre-check, estimate cap, settle handoff; do not reimplement tools

## Out of scope

- Custom wallet / keystore / seed UI (use Core or MetaMask)
- Mainnet, L1 subnet, memory/Skill/timer/`glob`/`grep`
- Explicit plan-step checklist UI (tool status in quickbar is enough)
- Storing keys in the app

## Acceptance (Fuji)

Connect wallet → mint identity → Credit available → task → lock → Agent report → settle → Explorer shows matching events for TaskId.
