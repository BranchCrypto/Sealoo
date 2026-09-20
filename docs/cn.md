# Sealoo 🦭

## AI 桌面宠物 × Avalanche

> **一只让 Avalanche 变得简单亲切的 AI 桌面宠物伙伴。**

---

## 1. 项目简介

Sealoo 是一只运行在桌面上的 AI 宠物（AI Pet）。

它会陪伴用户、和用户聊天、搜索信息、总结内容、生成文件，并连接 Avalanche 钱包（Avalanche Wallet）。

用户只需要和一只可爱的海豹聊天，就可以自然地接触 Avalanche 的：

- 钱包（Wallet）

- 链上身份（On-chain Identity）

- 积分/额度（Credit）

- 链上交易（Transactions）

- 区块链浏览器（Explorer）

### 核心体验流程

```text
用户
  ↓
🦭 Sealoo
  ↓
 AI Agent
  ↓
Avalanche
```

---

## 2. 产品愿景

## 让 Avalanche 变得简单亲切。

Web3 的入口可以是一只宠物。

用户打开电脑：

```text
        🦭

    嗨，我是 Sealoo！
```

用户发起对话：

```text
“什么是 Avalanche？”
```

Sealoo 作出解答。

用户继续提问：

```text
“帮我查一下 Avalanche C-Chain。”
```

Sealoo 自动搜索、阅读并总结。

用户连接钱包后：

```text
Wallet
0xABC...123

AVAX
2.31

Credit
96
```

Avalanche 就这样自然融入了日常桌面体验。

---

## 3. 产品定位

**Sealoo = Avalanche AI 桌面伴侣**

核心能力：

- 🦭 桌面宠物（Desktop Pet）

- 💬 AI 聊天（AI Chat）

- 🤖 轻量 Agent（Simple Agent）

- 🌐 网络搜索（Web Search）

- 📄 文件生成（File Generation）

- 👛 Avalanche 钱包连接（Avalanche Wallet）

- 🪪 链上 Agent 身份（On-chain Agent Identity）

- ⚡ 简易积分额度（Simple Credit）

- 🔎 交易浏览器入口（Transaction Explorer）

---

## 4. 用户旅程

## Step 1 — 遇见 Sealoo

打开 Sealoo。

```text
🦭

你好！
我是 Sealoo。
```

Sealoo 常驻于桌面角落。

---

## Step 2 — 聊天交互

用户可以直接与它聊天。

```text
用户:
“什么是 Avalanche？”

Sealoo:
“Avalanche 是一个高性能区块链平台……
我可以带你看看你的 Avalanche Wallet。”
```

---

## Step 3 — 执行简单任务

用户给 Sealoo 下达一个简单任务：

> “帮我研究 Avalanche，并写成 Markdown 报告。”

Sealoo：

```text
思考中 (Thinking)...
      ↓
搜索中 (Searching)...
      ↓
阅读中 (Reading)...
      ↓
总结中 (Summarizing)...
      ↓
撰写中 (Writing)...
      ↓
完成！(Done!)
```

最终生成：

```text
avalanche-report.md
```

---

## Step 4 — 连接 Avalanche

用户点击：

```text
[ 连接钱包 / Connect Wallet ]
```

Sealoo 显示：

```text
Avalanche Wallet

0xABC...123

AVAX: 2.31
Credit: 96
```

---

## Step 5 — 链上身份

用户铸造并拥有自己的 Sealoo：

```text
Sealoo #123

Owner:
0xABC...123

Network:
Avalanche
```

Sealoo 身份由 Avalanche 链上进行记录。

---

## Step 6 — 额度消耗

Sealoo 执行任务时使用简易 Credit（积分/额度）。

示例：

```text
搜索         1
阅读         1
总结         2
撰写         1

总计         5 Credit
```

任务完成后：

```text
100 Credit
     ↓
95 Credit
```

链上会同步记录对应的 Credit 消耗事件。

---

## 5. Sealoo 整体架构

```text
                         用户
                           │
                           ▼
                    ┌─────────────┐
                    │   🦭 Sealoo │
                    │   桌面宠物   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
            聊天            Agent      钱包
              │            │            │
              │       ┌────┼────┐       │
              │       ▼    ▼    ▼       │
              │      搜索 阅读 写入     │
              │            │             │
              └────────────┼─────────────┘
                           │
                           ▼
                    Avalanche C-Chain
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
            身份          积分        事件记录
```

---

## 6. AI 层架构

Sealoo 使用轻量级的 Agent 运行环境（Agent Runtime）。

## Agent 运行循环

```text
用户请求 (User Request)
     ↓
理解意图 (Understand)
     ↓
规划步骤 (Plan)
     ↓
调用工具 (Tool)
     ↓
获得结果 (Result)
     ↓
生成回答 (Answer)
```

### MVP 工具集

#### Web（网络类）

```text
search_web()
fetch_page()
```

#### File（文件类）

```text
write_file()
```

#### Chat（对话类）

```text
answer()
summarize()
```

---

## 7. Agent 任务示例

用户：

> “帮我研究 Avalanche 官方资料，并生成一份 Markdown 报告。”

Sealoo：

```text
任务已创建

1. 搜索 Avalanche 官方文档
2. 阅读相关页面
3. 提取关键信息
4. 归纳总结
5. 生成 Markdown 文件
```

界面展示：

```text
🦭 正在搜索中...

✓ Avalanche Docs
✓ C-Chain
✓ Consensus
→ 正在撰写报告...
```

完成：

```text
✓ 报告已生成完毕

[ 打开 report.md ]
```

---

## 8. Avalanche 链上层

Avalanche 负责 Sealoo 的链上能力与资产属性。

```text
Avalanche
│
├── 钱包 (Wallet)
├── Agent 链上身份 (Agent Identity)
├── 使用额度 (Credit)
└── 交易历史 (Transaction History)
```

### 身份 (Identity)

```text
Wallet
   ↓
Sealoo #123
```

### 积分额度 (Credit)

```text
Credit 余额
      ↓
简易消耗
      ↓
Avalanche 链上 Event
```

### 区块链浏览器 (Explorer)

用户随时可点击：

```text
[ 在 Avalanche 上查看 / View on Avalanche ]
```

查看真实的链上交易细节。

---

## 9. 智能合约

## AgentRegistry.sol

负责管理 Sealoo 的链上身份。

```solidity
mint()
ownerOf()
getAgent()
```

核心数据结构：

```text
agentId
owner
metadata
```

---

## WorkCredit.sol

负责管理 Credit（额度）。

```solidity
balanceOf()
consume()
purchase()
```

核心数据结构：

```text
credits[address]
taskId
consumption
```

---

## 10. 链上 / 链下职责划分

## 链上 (On-chain)

```text
Sealoo 所有权 (Ownership)
钱包连接 (Wallet)
Credit 余额 (Credit Balance)
Credit 消耗记录 (Credit Consumption)
交易事件 (Transaction Events)
```

## 链下 (Off-chain)

```text
AI 模型计算
对话逻辑
记忆存储 (Memory)
网络搜索
工具执行 (Tool Execution)
本地文件生成
UI 渲染
宠物动画
```

### 核心设计原则

> **AI 计算保留在链下。**
>
> **所有权与价值锚定在 Avalanche 链上。**

---

## 11. 钱包安全机制

Sealoo 坚决**不保存**：

```text
私钥 (Private Key)
助记词 (Seed Phrase)
```

交易交互流程：

```text
Sealoo
  ↓
发起交易请求 (Transaction Request)
  ↓
用户钱包弹窗 (User Wallet)
  ↓
用户确认授权 (User Approval)
  ↓
提交至 Avalanche
```

用户始终拥有对钱包的绝对控制权。

---

## 12. Credit 机制

Credit 是 Sealoo 的轻量级使用额度。

示例：

```text
初始额度：100 Credit
```

单次任务消耗：

```text
搜索         1
阅读         1
总结         2
写入         1
----------------
总计         5 Credit
```

最终状态：

```text
100 → 95
```

所有 Credit 的最终状态均以 Avalanche 合约记录为准。

---

## 13. 防篡改演示 (Tamper Demo)

Sealoo 本地界面显示：

```text
Credit: 95
```

恶意修改本地前端状态：

```text
Credit: 9999
```

系统重新从 Avalanche 合约读取数据：

```text
真实 Credit: 95
```

Demo 演示核心理念：

> **前端 UI 状态可以被任意篡改，
> 但 Avalanche 链上状态不可动摇。**

---

## 14. 所有权演示 (Ownership Demo)

连接钱包：

```text
0xABC...123
```

Mint 铸造：

```text
Sealoo #123
```

链上查询：

```text
ownerOf(123)

→ 0xABC...123
```

用户可在 Avalanche Explorer 中公开验证。

---

## 15. Credit 消耗演示 (Credit Demo)

初始状态：

```text
Credit: 100
```

执行任务：

```text
“研究 Avalanche”
```

消耗：

```text
5 Credit
```

链上更新：

```text
100 → 95
```

Explorer 链上事件日志：

```text
CreditConsumed
TaskId: #001
Amount: 5
Owner: 0xABC...123
```

---

## 16. 桌面 UI 界面设计

## 首页 (Home)

```text
┌─────────────────────────┐
│        🦭 Sealoo        │
│                         │
│     嗨！我是 Sealoo。    │
│                         │
│  Credit: 95             │
│  Wallet: 已连接          │
│                         │
│  [ 开始聊天 ]           │
│  [ 钱包详情 ]           │
│  [ 历史记录 ]           │
└─────────────────────────┘
```

---

## 聊天界面 (Chat)

```text
┌─────────────────────────┐
│ 🦭 Sealoo               │
│                         │
│ 有什么我可以帮你的吗？  │
│                         │
│ > 研究 Avalanche        │
│                         │
│ 思考中...               │
│ 搜索中...               │
│ 阅读中...               │
│ 完成！                  │
└─────────────────────────┘
```

---

## 钱包界面 (Wallet)

```text
┌─────────────────────────┐
│ Avalanche Wallet        │
│                         │
│ 0xABC...123             │
│                         │
│ AVAX      2.31          │
│ Credit    95            │
│                         │
│ [ 在 Explorer 中查看 ]  │
└─────────────────────────┘
```

---

## 17. Sealoo 人设与性格

Sealoo 的人设保持简单、友好与轻量化。

### 待机状态 (Idle)

```text
🦭
“我一直都在哦！”
```

### 思考状态 (Thinking)

```text
🦭
“嗯……让我想想。”
```

### 工作状态 (Working)

```text
🦭
“收到，这就去办！”
```

### 额度不足 (Need Credit)

```text
🦭
“需要补充一点 Credit 才能继续工作哦。”
```

### 任务完成 (Complete)

```text
🦭
“搞定啦！🦭”
```

---

## 18. Hackathon 核心 Demo 剧本

## 场景 1

桌面右下角出现宠物：

```text
🦭 Sealoo
```

---

## 场景 2

用户发起指令：

> “帮我研究 Avalanche，并生成一份 Markdown 报告。”

Sealoo 状态切换：

```text
Thinking...
Searching...
Reading...
Writing...
```

---

## 场景 3

文件生成成功：

```text
avalanche-report.md
```

---

## 场景 4

显示 Credit 变动：

```text
Credit

任务前: 100
消耗:     5
任务后:  95
```

---

## 场景 5

点击按钮：

```text
View on Avalanche
```

向评委展示真实发生的链上交易信息。

---

## 场景 6

打开钱包视图：

```text
Sealoo #123
Owner: 0xABC...123
```

---

## 场景 7

在本地篡改 Credit 为：

```text
9999
```

重新从 Smart Contract 读取：

```text
95
```

---

## 结尾画面 (Final Screen)

```text
        🦭 Sealoo

桌面上是可爱的 AI，
桌面下是强大的 Avalanche。

[ 探索 Avalanche ]
```

---

## 19. MVP 功能清单

### 桌面端 (Desktop)

- [x] 桌面宠物常驻 (Desktop Pet)

- [x] 聊天 UI (Chat UI)

- [x] 基础动画交互 (Simple animations)

- [x] 任务状态指示 (Task status)

### AI 层

- [x] 智能对话 (Chat)

- [x] 简易任务规划 (Simple planning)

- [x] 网络搜索 (Web Search)

- [x] 网页阅读 (Page Reading)

- [x] 内容总结 (Summarization)

- [x] Markdown 文件生成

### Avalanche 链上

- [x] 钱包连接 (Wallet Connection)

- [x] Sealoo 链上身份 (Sealoo Identity)

- [x] Agent NFT 铸造

- [x] Credit 余额查询

- [x] Credit 扣减消耗

- [x] 链上 Event 事件抛出

- [x] 区块链浏览器跳转链接

### 安全性 (Security)

- [x] 无私钥存储 (No Private Key Storage)

- [x] 交易由用户钱包授权

- [x] 链上防篡改 Credit 状态

- [x] 本地状态篡改演示

---

## 20. 技术栈 (Tech Stack)

```text
Desktop (桌面端)
├── Electron / Tauri
├── React
└── TypeScript

AI Layer (AI 层)
├── LLM API
├── Agent Runtime
└── Web Tools

Blockchain (区块链)
├── Avalanche C-Chain
├── Solidity
├── Viem / Ethers
└── WalletConnect / Avalanche Wallet

Contracts (智能合约)
├── AgentRegistry.sol
└── WorkCredit.sol
```

---

## 21. 项目目录结构

```text
sealoo/
│
├── app/                  # 桌面客户端
│   ├── ui/               # 界面 UI
│   ├── pet/              # 宠物逻辑与动画
│   └── wallet/           # 钱包连接模块
│
├── agent/                # AI Agent 运行时
│   ├── runtime/          # Agent 循环与逻辑
│   ├── tools/            # 工具集 (搜索/文件等)
│   └── chat/             # 对话管理
│
├── contracts/            # Solidity 智能合约
│   ├── AgentRegistry.sol # 身份合约
│   └── WorkCredit.sol    # 积分/额度合约
│
├── blockchain/           # 区块链交互
│   ├── wallet/           # 钱包 Provider
│   └── client/           # 合约客户端
│
└── README.md
```

---

## 22. 网络部署

Hackathon Demo 演示环境：

```text
Avalanche Fuji Testnet
Chain ID: 43113
```

生产环境（Production）：

```text
Avalanche C-Chain
Chain ID: 43114
```

---

## 23. 未来展望

More seal...（更多可爱的海豹与可能性）

---

## 24. 产品哲学

```text
简单的 UI
      ↓
简单的 AI
      ↓
简单的 Web3
      ↓
Avalanche
```

核心原则：

> **一只宠物，一个钱包，一次简单纯粹的 Avalanche 体验。**

---

## 25. 终极 Pitch 演讲稿

## Sealoo 🦭

**您在 Avalanche 上的 AI 桌面伴侣。**

Sealoo 生活在您的电脑桌面上。

您可以随时与它聊天、向它提问、让它搜索网络、总结资料以及生成各种文件。

当您连接 Avalanche 钱包时，您的 Sealoo 就会获得属于它的链上身份。

它的使用额度（Credit）可以通过 Avalanche 上的合约进行清晰的记录与核算。

您的 AI 计算与交互保留在链下，安全高效；

您的资产所有权与价值锁定在 Avalanche 链上，不可篡改；

您的钱包永远在您自己的掌控之中。

Sealoo 让 Avalanche 从一个您偶尔访问的 Web3 网站，变成一个每天陪伴在您身边的桌面伙伴。

> **AI 在桌面上，**
>
> **Avalanche 在底座下，**
>
> **Sealoo 在它们之间。**

---

## 26. 最终定义

> **Sealoo 既是一只 AI 桌面宠物，也是通往 Avalanche 生态最简单的入口。**
>
> **它将轻量级的 AI Agent 体验与 Avalanche 钱包、链上身份和简单透明的额度系统完美结合。**
>
> **AI 计算运行于链下，所有权与价值留存于 Avalanche。**
>
> **用户拥有钱包的完整控制权。**
>
> **Sealoo 让 Avalanche 变得简单、亲切、触手可及。**
