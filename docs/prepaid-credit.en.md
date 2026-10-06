# Sealoo Credit Prepaid Plan

> **Client estimates Tokens → convert to Credit and lock → settle by actual Tokens on any terminal state (refund the rest)**

Sealoo’s Agent quota uses a prepaid model: the client meters Tokens; Avalanche contracts lock and settle Credit; the flow aligns with the fish-bucket / energy product story.

Related: `docs/en.md` §12 Credit.

---

## 1. Goals

| Goal | Meaning |
|------|---------|
| Prepaid | Users hold Credit before the Agent runs |
| Client-side estimate | Token usage is estimated on the client, then converted to Credit to lock |
| Anti-abuse | Cancel / crash / kill all settle Tokens used so far |
| Demo-friendly | Few on-chain txs per task; no per-tool wallet prompts |
| Verifiable | TaskId links local logs to Avalanche events / Explorer |
| Narrative fit | Credit = food; lock a portion up front; eat what was used |

---

## 2. Core Model

```text
available
locked
────────────────
total = available + locked
```

- **purchase / feed**: increase `available`
- **lock**: move estimate from `available` → `locked` at task start
- **settle**: charge `actual` from `locked`, unlock the remainder to `available`
- **source of truth**: Avalanche contract

### Units

| Unit | Who computes | Role |
|------|--------------|------|
| Token (LLM) | Client estimates / accumulates | Real model-usage meter |
| Credit (on-chain) | Token × rate | Lock, settle, user-facing quota |

```text
TOKENS_PER_CREDIT = 1000

estimateCredit = ceil(estimateTokens / TOKENS_PER_CREDIT)
actualCredit   = ceil(actualTokens   / TOKENS_PER_CREDIT)

// e.g. estimateTokens 4800 → 5 Credit
```

### Who holds what

| Asset | Holder | Role |
|-------|--------|------|
| LLM API Key | LLM gateway only (`gateway/`) | Real model calls (DeepSeek / compatible) |
| Token estimate | Client | Pre-task lock size |
| Token tally | Gateway (upstream `usage`) | In-run metering and cap |
| Credit | User (on-chain) | Prepaid quota to run Agent |
| Fish bucket | User wallet | On-chain assets → Credit / feed |

Users never receive or paste the LLM API Key. Gateway design: `docs/llm-gateway.en.md`.

---

## 3. Main Flow

```text
① Preload
   purchase / feed → available ↑

② Client Token estimate (off-chain)
   estimateTokens = client.estimateTokenUsage(task)
   estimateCredit = ceil(estimateTokens / TOKENS_PER_CREDIT)
   if available < estimateCredit → reject (Need Credit)

③ Lock (prepaid takes effect)
   lock(taskId, estimateCredit)
   emit CreditLocked(taskId, estimateCredit, owner)

④ Off-chain run + client accumulates actual Tokens
   Agent tools run
   actualTokens = client.accumulateTokenUsage(...)
   // cap: actualCredit cannot exceed estimateCredit

⑤ Terminal settle (success / cancel / fail / timeout)
   actualCredit = ceil(actualTokens / TOKENS_PER_CREDIT)
   settle(taskId, actualCredit)
   refund = estimateCredit - actualCredit
   emit CreditSettled(taskId, actualCredit, refund, owner)
```

### Example

```text
Start: available=100, locked=0
Client: estimateTokens=4800 → estimateCredit=5

lock(5) → available=95, locked=5

actualTokens=2900 → actualCredit=3, success
  → available=97, locked=0

cancel after actualTokens=800 → actualCredit=1
  → available=99, locked=0
```

---

## 4. Client Token Estimation

Estimation and accumulation happen on the client. The contract only sees Credit integers.

### 4.1 Before start: `estimateTokenUsage(task)`

Inputs:

```text
- user prompt / context length
- task type (chat / search / research report)
- planned tool steps & rounds from the Agent planner
- expected output size (e.g. long Markdown)
```

Formula:

```text
estimateTokens =
    promptTokens
  + sum(plannedToolRounds × TOOL_ROUND_TOKENS)
  + expectedOutputTokens
  + SAFETY_MARGIN          // 10%–20%
```

Task baselines:

| Task type | Base tokens | Then add |
|-----------|-------------|----------|
| Chat | 800 | measured prompt |
| Single search Q&A | 2500 | prompt + 1–2 tool rounds |
| Research + report | 4500 | prompt + multi-round tools + long output |

### 4.2 During / after: `accumulateTokenUsage`

1. API `usage` (prompt_tokens + completion_tokens) when available  
2. Else local tokenizer / char heuristic on the client  
3. Tool-round context counted into the client accumulator  

```text
actualTokens = Σ(per-call usage or local estimate)
actualCredit = min(ceil(actualTokens / TOKENS_PER_CREDIT), estimateCredit)
```

### 4.3 Client fields persisted with the Task

```text
taskId
estimateTokens
estimateCredit
actualTokens
actualCredit
refundCredit
```

These go into Agent logs and UI; only Credit amounts go on-chain.

---

## 5. Contract Surface (WorkCredit)

```solidity
balanceOf(address)           // available
lockedOf(address)            // locked
purchase()

lock(bytes32 taskId, uint256 estimateCredit)
settle(bytes32 taskId, uint256 actualCredit)
// actualCredit <= estimateCredit
```

The contract receives Credit, not Token counts. Token → Credit conversion stays on the client.

Events:

```text
CreditPurchased(owner, amount)
CreditLocked(taskId, estimateCredit, owner)
CreditSettled(taskId, actualCredit, refund, owner)
```

Task state: `None → Locked → Settled` (settle once per taskId). On timeout, the client relaunches or a keeper completes `settle`.

---

## 6. On-chain / Off-chain

| Step | Where | On-chain? |
|------|-------|-----------|
| Token estimate | Client | No |
| Token → Credit conversion | Client | No |
| Tool calls | Off-chain | No |
| Actual Token tally | Client | No |
| purchase / feed | On-chain | Yes |
| lock(estimateCredit) | On-chain | Yes (once at start) |
| settle(actualCredit) | On-chain | Yes (once at end) |

Per-task Credit txs: **lock + settle**.

Path:

```text
purchase → client estimates Tokens → lock(Credit) → run + tally Tokens → settle(Credit)
```

---

## 7. Terminal & Edge Cases

| Case | Handling |
|------|----------|
| Success | client computes `actualCredit`, then `settle` |
| Cancel | bill Tokens accumulated so far |
| Insufficient pre-check | no lock, no run |
| actualCredit hits estimateCredit | stop tools, settle full estimate |
| Crash / kill | persist accumulated Tokens locally; settle on relaunch |
| Locked but timed out unsettled | settle accumulated Tokens; if none, settle full estimateCredit |
| User rejects lock signature | task never starts |
| User rejects settle signature | retry; block new tasks until settled |
| Under-estimate | stop at lock cap; show “quota used up” |
| Over-estimate | refund unused Credit on settle |

### Rules

1. Every task ends in Settled  
2. Cannot lock if available < estimateCredit  
3. actualCredit cannot exceed estimateCredit  
4. Block new tasks while one is unsettled  
5. Tokens stay off-chain; chain only receives Credit  

---

## 8. Product Narrative

```text
Fish bucket / Credit           = food prepared in advance
Client Token → Credit estimate = how much food to bring
lock(estimateCredit)           = set aside estimated food
Work + client Token tally      = Sealoo spends energy
settle(actualCredit)           = eat what was used; return the rest
Need Credit                    = “Feed me first, then I can work.”
```

---

## 9. UI

```text
Before:  Est. Tokens ~4,800 · Est. Credit 5 · Available 100 · [ Start → lock ]
During:  Locked 5 · Used Tokens ~2,100 · ~3 Credit
After:   Task #001 · Tokens 4800→2900 · Credit 5→3 refund 2 · [ Explorer ]
```

Wallet shows Network (Avalanche Fuji), Last synced, and tx status (Waiting / Pending / Confirmed).

---

## 10. Explorer Path

```text
TaskId=#001
  → Client: estimateTokens=4800 → estimateCredit=5
  → CreditLocked(#001, 5)
  → Client: actualTokens=2900 → actualCredit=3
  → CreditSettled(#001, 3, refund=2)
  → Explorer (Credit on-chain; Tokens in local / Agent logs)
```

---

## 11. Feature Checklist

- [x] Client produces `estimateTokens` / `estimateCredit` before start  
- [x] purchase / feed increases Credit  
- [x] reject when available < estimateCredit  
- [x] Agent runs after successful lock  
- [x] Client accumulates `actualTokens` during the run  
- [x] success / cancel / fail all settle from actual Tokens  
- [x] crash recovery can settle  
- [x] 2 Credit txs per task (lock + settle)  
- [x] TaskId deep-links to Explorer  

---

## 12. Definition

> **Sealoo Credit prepaid = client estimates Tokens and converts to Credit + lock estimate at start + settle from actual Tokens on any terminal state with refund.**
