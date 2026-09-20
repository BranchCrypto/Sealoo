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

The corresponding Credit consumption is recorded on-chain.

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
Simple Consumption
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
consume()
purchase()
```

Core Data:

```text
credits[address]
taskId
consumption
```

---

## 10. On-chain / Off-chain

## On-chain

```text
Sealoo Ownership
Wallet
Credit Balance
Credit Consumption
Transaction Events
```

## Off-chain

```text
AI
Conversation
Memory
Web Search
Tool Execution
Files
UI
Animation
```

### Core Principle

> **AI stays off-chain.**
>
> **Ownership and value stay on Avalanche.**

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

Credit is Sealoo's lightweight usage quota.

Example:

```text
100 Credit
```

Single task:

```text
Search       1
Read         1
Summarize    2
Write        1
----------------
Total        5
```

Result:

```text
100 → 95
```

The Credit state is subject to the Avalanche Contract.

---

## 13. Tamper Demo

Sealoo local interface:

```text
Credit: 95
```

Modify local state:

```text
Credit: 9999
```

Re-read from Avalanche:

```text
Real Credit: 95
```

Demo Message:

> **The UI can change.
> The on-chain state remains real.**

---

## 14. Ownership Demo

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

## 15. Credit Demo

Initial:

```text
Credit: 100
```

Execute task:

```text
Research Avalanche
```

Consumption:

```text
5 Credit
```

On-chain:

```text
100 → 95
```

Explorer:

```text
CreditConsumed
TaskId: #001
Amount: 5
Owner: 0xABC...123
```

---

## 16. Desktop UI

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
└─────────────────────────┘
```

---

## Wallet

```text
┌─────────────────────────┐
│ Avalanche Wallet        │
│                         │
│ 0xABC...123             │
│                         │
│ AVAX      2.31          │
│ Credit    95            │
│                         │
│ [ View on Explorer ]    │
└─────────────────────────┘
```

---

## 17. Sealoo Personality

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

## 18. Main Hackathon Demo

## Scene 1

Appears on desktop:

```text
🦭 Sealoo
```

---

## Scene 2

User:

> "Help me research Avalanche and write a Markdown report."

Sealoo:

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

Display:

```text
Credit

Before: 100
Used:     5
After:   95
```

---

## Scene 5

Click:

```text
View on Avalanche
```

Display real on-chain transaction.

---

## Scene 6

Open Wallet:

```text
Sealoo #123
Owner: 0xABC...123
```

---

## Scene 7

Modify local Credit:

```text
9999
```

Re-read Contract:

```text
95
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

## 19. MVP

### Desktop

- [x] Desktop Pet
- [x] Chat UI
- [x] Simple animations
- [x] Task status

### AI

- [x] Chat
- [x] Simple planning
- [x] Web Search
- [x] Page Reading
- [x] Summarization
- [x] Markdown Generation

### Avalanche

- [x] Wallet Connection
- [x] Sealoo Identity
- [x] Agent NFT
- [x] Credit Balance
- [x] Credit Consumption
- [x] Transaction Events
- [x] Explorer Link

### Security

- [x] No Private Key Storage
- [x] User Wallet Approval
- [x] On-chain Credit State
- [x] Local State Tamper Demo

---

## 20. Tech Stack

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

## 21. Repository

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

## 22. Network

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

## 23. Future

More seal...

---

## 24. Product Philosophy

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

## 25. Final Pitch

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

## 26. Final Definition

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