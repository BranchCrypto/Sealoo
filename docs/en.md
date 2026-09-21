# Sealoo 🦭

## AI Desktop Pet × Avalanche

> **A friendly AI companion that makes Avalanche feel simple.**

---

## 1. Project

Sealoo is an AI Pet running on your desktop.

It accompanies users, chats with them, searches for information, summarizes content, generates files, and connects to the Avalanche Wallet.

By simply chatting with a cute seal, users can naturally interact with Avalanche's:

- Wallet
- On-chain Identity
- Credit
- Transactions
- Explorer

### Core Experience

```text
User
  ↓
🦭 Sealoo
  ↓
Simple AI
  ↓
Avalanche
```

---

## 2. Product Vision

## Make Avalanche feel simple.

The gateway to Web3 can be a pet.

When users open their computer:

```text
        🦭

    Hi, I'm Sealoo!
```

Users chat:

```text
"What is Avalanche?"
```

Sealoo answers.

Users continue:

```text
"Help me check Avalanche C-Chain."
```

Sealoo searches, reads, and summarizes.

After connecting the Wallet:

```text
Wallet
0xABC...123

AVAX
2.31

Credit
96
```

Avalanche becomes part of the everyday desktop experience.

---

## 3. Product Positioning

**Sealoo = Avalanche AI Desktop Companion**

Core Capabilities:

- 🦭 Desktop Pet
- 💬 AI Chat
- 🤖 Simple Agent
- 🌐 Web Search
- 📄 File Generation
- 👛 Avalanche Wallet
- 🪪 On-chain Agent Identity
- ⚡ Simple Credit
- 🔎 Transaction Explorer

---

## 4. User Journey

## Step 1 — Meet Sealoo

Launch Sealoo.

```text
🦭

Hi!
I'm Sealoo.
```

Sealoo stays in the corner of your desktop.

---

## Step 2 — Chat

Users can chat directly.

```text
User:
"What is Avalanche?"

Sealoo:
"Avalanche is a blockchain platform...
I can show you your Avalanche Wallet."
```

---

## Step 3 — Simple Agent

Users give Sealoo a simple task:

> "Help me research Avalanche and write a report in Markdown."

Sealoo:

```text
Thinking...
      ↓
Searching...
      ↓
Reading...
      ↓
Summarizing...
      ↓
Writing...
      ↓
Done!
```

Finally generated:

```text
avalanche-report.md
```

---

## Step 4 — Connect Avalanche

Users click:

```text
[ Connect Wallet ]
```

Sealoo displays:

```text
Avalanche Wallet

0xABC...123

AVAX: 2.31
Credit: 96
```

---

## Step 5 — On-chain Identity

Users create their own Sealoo:

```text
Sealoo #123

Owner:
0xABC...123

Network:
Avalanche
```

The Sealoo Identity is recorded on the Avalanche chain.

---

## Step 6 — Usage

Sealoo consumes simple Credits when executing tasks.

For example:

```text
Search       1
Read         1
Summarize    2
Write        1

Total        5 Credit
```

Task completed:

```text
100 Credit
     ↓
95 Credit
```

After lock + settle, Credit events (with TaskId) are recorded on-chain.

---

## 5. Sealoo Architecture

```text
                         USER
                           │
                           ▼
                    ┌─────────────┐
                    │   🦭 Sealoo │
                    │ Desktop Pet │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Chat        Simple Agent   Wallet
              │            │            │
              │       ┌────┼────┐       │
              │       ▼    ▼    ▼       │
              │    Search Read Write     │
              │            │             │
              └────────────┼─────────────┘
                           │
                           ▼
                    Avalanche C-Chain
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Identity      Credit       Events
```

---

## 6. AI Layer

Sealoo uses a lightweight Agent Runtime.

## Agent Loop

```text
User Request
     ↓
Understand
     ↓
Plan
     ↓
Tool
     ↓
Result
     ↓
Answer
```

### MVP Tools

#### Web

```text
search_web()
fetch_page()
```

#### File

```text
write_file()
```

#### Chat

```text
answer()
summarize()
```

---

## 7. Example Agent Task

User:

> "Help me research official Avalanche documentation and generate a Markdown report."

Sealoo:

```text
Task Created

1. Search Avalanche docs
2. Read relevant pages
3. Extract key information
4. Summarize
5. Generate Markdown
```

Interface:

```text
🦭 Searching...

✓ Avalanche Docs
✓ C-Chain
✓ Consensus
→ Writing report
```

Completion:

```text
✓ Report completed

[ Open report.md ]
```

---

## 8. Avalanche Layer

Avalanche handles Sealoo's on-chain capabilities.

```text
Avalanche
│
├── Wallet
├── Agent Identity
├── Credit
└── Transaction History
```

### Identity

```text
Wallet
   ↓
Sealoo #123
```

### Credit

```text
Credit Balance
      ↓
Prepaid lock + settle
      ↓
Avalanche Event
```

### Explorer

Users can click:

```text
[ View on Avalanche ]
```

To view actual on-chain transactions.

---

## 9. Smart Contracts

## AgentRegistry

Handles Sealoo identity.

```solidity
mint()
ownerOf()
getAgent()
```

Core Data:

```text
agentId
owner
metadata
```

---

## WorkCredit

Handles Credit.

```solidity
balanceOf()
lockedOf()
purchase()
lock(taskId, estimate)
settle(taskId, actual)
```

Core Data:

```text
available[address]
locked[address]
taskId
```

Core Event:

```text
CreditLocked(taskId, estimate, owner)
CreditSettled(taskId, actual, refund, owner)
```

Settlement rule: prepaid — `lock` at start, `settle` on any terminal state. Tool steps are never settled individually. See [Prepaid Plan](./prepaid-credit.en.md).

---

## 10. On-chain / Off-chain

## On-chain

```text
Sealoo Ownership
Wallet
Credit Balance (available / locked)
Prepaid lock + terminal settle
Transaction Events
```

## Off-chain

```text
AI
Conversation
Memory
Web Search
Tool Execution
Credit estimate: client Token estimate & conversion
Tool metering & actual Token tally
Files
UI
Animation
```

### Core Principle

> **AI stays off-chain.**
>
> **Ownership and value stay on Avalanche.**
>
> **Prepaid: client estimates Tokens; lock Credit at start; settle from actual Tokens at end.**

---

## 11. Wallet Security

Sealoo does NOT store:

```text
Private Key
Seed Phrase
```

Transaction Flow:

```text
Sealoo
  ↓
Transaction Request
  ↓
User Wallet
  ↓
User Approval
  ↓
Avalanche
```

The user is always in control of the wallet.

---

## 12. Credit

Credit is Sealoo's lightweight usage quota, using a **prepaid** model.

**Token usage is estimated and accumulated on the client**, then converted to Credit for lock and settle.

Full design: [Credit Prepaid Plan](./prepaid-credit.en.md)

Example:

```text
100 Credit
```

### Prepaid: Client Estimates Tokens → Lock Credit → Terminal Settle

Search, read, summarize, and write inside a Task run off-chain. The client estimates Tokens before start, converts to `estimateCredit` and locks; accumulates `actualTokens` during the run; settles `actualCredit` on any terminal state and refunds the unused portion.

```text
User creates task
  ↓
[Client] estimateTokens → estimateCredit (e.g. 4800 Tokens → 5 Credit)
  ↓
[On-chain] lock(taskId, estimateCredit=5)
  ↓
[Off-chain] Agent runs; [Client] accumulates actualTokens
  ↓
[Client] actualTokens → actualCredit
  ↓
[On-chain] settle(taskId, actualCredit)
```

Rate:

```text
TOKENS_PER_CREDIT = 1000
estimateCredit = ceil(estimateTokens / 1000)
```

Single-task breakdown (off-chain tally → actual):

```text
Search       1
Read         1
Summarize    2
Write        1
----------------
Total        5
```

Result (estimate=5, actual=5):

```text
100 → 95
```

| Step | Where | On-chain? |
|------|-------|-----------|
| Token estimate / tally | Client | No |
| Token → Credit conversion | Client | No |
| Tool call logs | Off-chain | No |
| lock(estimateCredit) | On-chain | Yes (once at start) |
| settle(actualCredit) | On-chain | Yes (once at end) |
| Credit balance source of truth | Avalanche contract | Yes |

> Demo note: Tokens are metered only on the client; the chain locks/settles Credit. Per-task Credit txs are lock + settle. Cancel still settles Tokens used so far — no free exit.

### Insufficient Credit Policy

Client estimates Tokens and converts to Credit first; if `available < estimateCredit`, **do not lock or run**.

```text
Receive task
  ↓
[Client] estimateTokenUsage → estimateCredit
  ↓
available ≥ estimateCredit ?
  ├─ No  → Reject + Need Credit (no tools)
  └─ Yes → lock → run + tally Tokens → settle(actualCredit)
```

| Case | Credit | Estimate | Behavior |
|------|--------|----------|----------|
| Enough | 100 | 5 | lock → run → settle |
| Short | 3 | 5 | **Reject**; prompt to top up |
| Exact | 5 | 5 | Allow; available becomes 0 after settle |

Estimate: the client estimates Tokens from prompt length, planned tool rounds, expected output, etc., then converts to Credit.

The Credit state is subject to the Avalanche Contract.

---

## 13. Ownership Demo

Connect Wallet:

```text
0xABC...123
```

Mint:

```text
Sealoo #123
```

On-chain:

```text
ownerOf(123)

→ 0xABC...123
```

Users can check this on the Explorer.

---

## 14. Credit Demo

Initial:

```text
Credit: 100 (available)
```

Execute task:

```text
Research Avalanche
Client estimate: estimateTokens ≈ 4800 → estimateCredit = 5
```

Prepaid lock → run → terminal settle:

```text
lock(#001, 5)     100 → available 95 / locked 5
settle(#001, 5)   locked 0 / available 95
```

Explorer:

```text
CreditLocked
TaskId: #001
Estimate: 5
Owner: 0xABC...123

CreditSettled
TaskId: #001
Actual: 5
Refund: 0
Owner: 0xABC...123
```

### Verification Path

Fixed TaskId mapping across lock / settle events:

```text
Task #1
  ↓ Agent log: TaskId=#001, estimateTokens=4800, actualTokens=4800, Credit 5→5
  ↓ Local UI: est 5 · actual 5 (100 → 95)
  ↓ On-chain: lock(#001, 5) → settle(#001, 5)
  ↓ Events: CreditLocked + CreditSettled
  ↓ Explorer: [ View on Avalanche ] → public verification
```

| Field | Value | Purpose |
|-------|-------|---------|
| TaskId | `#001` | Primary key across Agent log and Event |
| Estimate / Actual | `5` / `5` | Matches local UI |
| Owner | Connected wallet | Ownership link |
| Tx Hash | lock / settle tx hashes | Explorer deep link |

Post-task UI:

```text
Task #001 · est 5 · actual 5 · refund 0
[ View on-chain record ]
```

### Insufficient Credit Demo

```text
Credit: 3
Task: “Help me research Avalanche and write a report”
Estimate: 5
Result: Do not lock or run
Sealoo: “I need a little more Credit to keep going.”
```

---

## 15. Desktop UI

## Home

```text
┌─────────────────────────┐
│        🦭 Sealoo        │
│                         │
│     Hi! I'm Sealoo.     │
│                         │
│  Credit: 95             │
│  Wallet: Connected      │
│                         │
│  [ Chat ]               │
│  [ Wallet ]             │
│  [ History ]            │
└─────────────────────────┘
```

---

## Chat

```text
┌─────────────────────────┐
│ 🦭 Sealoo               │
│                         │
│ What can I help with?   │
│                         │
│ > Research Avalanche    │
│                         │
│ Thinking...             │
│ Searching...            │
│ Reading...              │
│ Done!                   │
│                         │
│ Task #001 · -5 Credit   │
│ [ View on-chain record ]│
└─────────────────────────┘
```

---

## Wallet

Local display and on-chain truth must be distinguishable. The wallet view shows Network, Last synced, and transaction status.

```text
┌─────────────────────────────┐
│ Avalanche Wallet            │
│ Network: Avalanche Fuji     │
│                             │
│ 0xABC...123                 │
│                             │
│ AVAX        2.31            │
│ Credit      95              │
│                             │
│ Last synced: 2026-09-21     │
│              16:08:12       │
│                             │
│ Status: Confirmed ✓         │
│                             │
│ [ View on Explorer ]        │
│ [ Refresh ]                 │
└─────────────────────────────┘
```

Transaction status:

| State | UI copy | Meaning |
|-------|---------|---------|
| idle | Confirmed ✓ | No in-flight transaction |
| awaiting_wallet | Waiting for wallet confirmation... | Requested; awaiting user signature |
| pending | Transaction pending... | Broadcast; awaiting inclusion |
| confirmed | Confirmed ✓ | Receipt confirmed; local state overwritten from chain |
| failed | Failed — tap to retry | Failed or rejected |

Local Credit is a cache; `Last synced` and `Confirmed` show consistency with the chain.

---

## 16. Sealoo Personality

Sealoo's personality remains simple, friendly, and lighthearted.

### Idle

```text
🦭
"I'm here!"
```

### Thinking

```text
🦭
"Hmm... let me think."
```

### Working

```text
🦭
"On it!"
```

### Need Credit

Triggered when Credit pre-check fails before the task starts (no tools called yet):

```text
🦭
"I need a little more Credit
to keep going."
```

### Complete

```text
🦭
"Done! 🦭"
```

---

## 17. Main Hackathon Demo

## Scene 1

Appears on desktop:

```text
🦭 Sealoo
```

---

## Scene 2

User:

> "Help me research Avalanche and write a Markdown report."

After pre-check passes (Credit ≥ estimate 5), Sealoo:

```text
Thinking...
Searching...
Reading...
Writing...
```

---

## Scene 3

Generated:

```text
avalanche-report.md
```

---

## Scene 4

Display prepaid lock + settle:

```text
Credit

Before available: 100
Locked estimate:    5
Actual used:        5
Refund:             0
After available:   95
TaskId: #001
```

---

## Scene 4b · Insufficient Credit

```text
Credit: 3
Estimate: 5
→ Reject; do not call tools
→ Need Credit prompt
```

---

## Scene 5

Click:

```text
View on Avalanche
```

Follow Task #001 verification path: Agent log → lock → settle → Explorer.

---

## Scene 6

Open Wallet:

```text
Network: Avalanche Fuji
Sealoo #123
Owner: 0xABC...123
Credit: 95
Last synced: ...
Status: Confirmed ✓
```

---

## Final Screen

```text
        🦭 Sealoo

AI on your desktop.
Avalanche underneath.

[ Explore Avalanche ]
```

---

## 18. MVP

### Desktop

- [x] Desktop Pet
- [x] Chat UI
- [x] Simple animations
- [x] Task status
- [x] Wallet Network / Last synced / tx status

### AI

- [x] Chat
- [x] Simple planning
- [x] Web Search
- [x] Page Reading
- [x] Summarization
- [x] Markdown Generation
- [x] Client Token estimate & accumulation
- [x] Credit conversion & balance pre-check
- [x] Off-chain tool metering & task aggregation

### Avalanche

- [x] Wallet Connection
- [x] Sealoo Identity
- [x] Agent NFT
- [x] Credit Balance
- [x] Prepaid Credit lock + settle
- [x] Transaction Events (with TaskId)
- [x] Explorer Link (TaskId ↔ Tx verifiable)

### Security

- [x] No Private Key Storage
- [x] User Wallet Approval
- [x] On-chain Credit State

---

## 19. Tech Stack

```text
Desktop
├── Electron / Tauri
├── React
└── TypeScript

AI
├── LLM API
├── Agent Runtime
└── Web Tools

Blockchain
├── Avalanche C-Chain
├── Solidity
├── Viem / Ethers
└── WalletConnect / Avalanche Wallet

Contracts
├── AgentRegistry.sol
└── WorkCredit.sol
```

---

## 20. Repository

```text
sealoo/
│
├── app/
│   ├── ui/
│   ├── pet/
│   └── wallet/
│
├── agent/
│   ├── runtime/
│   ├── tools/
│   └── chat/
│
├── contracts/
│   ├── AgentRegistry.sol
│   └── WorkCredit.sol
│
├── blockchain/
│   ├── wallet/
│   └── client/
│
└── README.md
```

---

## 21. Network

Hackathon Demo:

```text
Avalanche Fuji Testnet
Chain ID: 43113
```

Production:

```text
Avalanche C-Chain
Chain ID: 43114
```

---

## 22. Future

More seal...

---

## 23. Product Philosophy

```text
Simple UI
      ↓
Simple AI
      ↓
Simple Web3
      ↓
Avalanche
```

Core Principle:

> **One pet. One wallet. One simple Avalanche experience.**

---

## 24. Final Pitch

## Sealoo 🦭

**Your AI companion for Avalanche.**

Sealoo lives on your desktop.

You can chat with it, ask it questions, search the web, summarize information, and create simple files.

Connect your Avalanche Wallet and your Sealoo gets an on-chain identity.

Its usage can be represented through a simple Credit system on Avalanche.

Your AI stays off-chain.

Your ownership and value stay on-chain.

Your wallet stays under your control.

Sealoo turns Avalanche from something you visit into something that lives with you.

> **AI on your desktop.**
>
> **Avalanche underneath.**
>
> **Sealoo in between.**

---

## 25. Final Definition

> **Sealoo is an AI desktop pet and an easy entry point to Avalanche.**
>
> **It combines a lightweight AI Agent experience with Avalanche Wallet, on-chain identity, and simple usage accounting.**
>
> **AI lives off-chain.**
>
> **Ownership and value live on Avalanche.**
>
> **The user controls the wallet.**
>
> **Sealoo makes Avalanche simple, friendly, and always within reach.**