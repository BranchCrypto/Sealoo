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

当前实现：客户端按模型返回的 Token 累计，再换算 Credit（`1000 Token = 1 Credit`，向上取整）。例如：

```text
Tokens ≈ 4800
Credit = ceil(4800 / 1000) = 5
```

链上预付 `lock` / 终态 `settle`、余额预检与钱包扣减仍为规划，尚未接入。

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
模型决定：直接回答，或调用工具
     ↓
执行工具 → 结果回填 Messages
     ↓
（最多 100 轮）直到最终回答
```

没有单独的「规划」结果；步骤由模型的 tool call 隐式完成。

### MVP 工具集

名称一律小写蛇形：动词，或动词_对象。

#### 网络

```text
search_web
fetch_page
```

#### 文件

```text
read
write
edit
```

#### 命令

```text
bash
```

没有工具调用时，模型的最终回复就是回答；归纳写在这条回复里，不另注册工具。

---

## 7. Agent 任务示例

> 目标体验示意。当前快捷栏按工具事件显示「搜索中 / 阅读中 / 写入中」等状态，不单独渲染步骤勾选列表。

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
预付锁定 + 终态结算
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
lockedOf()
purchase()
lock(taskId, estimate)
settle(taskId, actual)
```

核心数据结构：

```text
available[address]
locked[address]
taskId
```

核心事件：

```text
CreditLocked(taskId, estimate, owner)
CreditSettled(taskId, actual, refund, owner)
```

结算约定：预付费模型——任务开始 `lock`，任意终态 `settle`；不按工具步骤分次上链。详见 [预付费方案](./prepaid-credit.cn.md)。

---

## 10. 链上 / 链下职责划分

## 链上 (On-chain)

```text
Sealoo 所有权 (Ownership)
钱包连接 (Wallet)
Credit 余额 (available / locked)
Credit 预付锁定与终态结算 (lock + settle)
交易事件 (Transaction Events)
```

## 链下 (Off-chain)

```text
AI 模型计算
对话逻辑
记忆存储 (Memory)
网络搜索
工具执行 (Tool Execution)
任务 Credit 预估：客户端 Token 估算与换算
工具调用计量与 actual Token 累计
本地文件生成
UI 渲染
宠物动画
```

### 核心设计原则

> **AI 计算保留在链下。**
>
> **所有权与价值锚定在 Avalanche 链上。**
>
> **预付费：客户端估 Token；开始锁定 Credit，终态按实际 Token 换算结算。**

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

Credit 是 Sealoo 的轻量级使用额度，采用**预付费**模型。

**Token 用量由 LLM 网关按模型 `usage` 累计**（客户端估算仅用于开任务前 lock）。详细方案见：[Credit 预付费方案](./prepaid-credit.cn.md)、[LLM Token 网关](./llm-gateway.cn.md)

示例：

```text
初始额度：100 Credit
```

### 预付费：客户端估 Token → 锁定 Credit → 终态结算

一个 Task 内的搜索、阅读、总结、写入均在链下执行。客户端在开任务前估算 Token，换算为 `estimateCredit` 并锁定；运行中累计实际 Token；任意终态按 `actualCredit` 结算，未用部分退回。

```text
用户创建任务
  ↓
[客户端] estimateTokens → estimateCredit（例：4800 Token → 5 Credit）
  ↓
[链上] lock(taskId, estimateCredit=5)
  ↓
[链下] Agent 经 LLM 网关调用模型；网关累计 actualTokens
  ↓
[客户端] actualTokens → actualCredit
  ↓
[链上] settle(taskId, actualCredit)
```

费率：

```text
TOKENS_PER_CREDIT = 1000
estimateCredit = ceil(estimateTokens / 1000)
```

单次任务消耗明细（链下累计，用于得出 actual）：

```text
搜索         1
阅读         1
总结         2
写入         1
----------------
总计         5 Credit
```

最终状态（estimate=5, actual=5）：

```text
100 → 95
```

| 环节 | 位置 | 是否上链 |
|------|------|----------|
| Token 用量估算 | 客户端 | 否 |
| Token 实际累计 | LLM 网关 | 否 |
| Token → Credit 换算 | 网关 / 客户端（费率相同） | 否 |
| 工具调用日志 | 链下 | 否 |
| 锁定预估 lock | 链上 | 是（开始 1 次） |
| 终态结算 settle | 链上 | 是（结束 1 次） |
| Credit 余额真相源 | Avalanche 合约 | 是 |

> Demo 说明：Token 只在客户端计量；链上只锁/结 Credit。单任务 Credit 相关链上交互为 lock + settle。中途取消同样按已用 Token 结算，防止白嫖。

### Credit 不足策略

客户端先估 Token 并换算 Credit；`available < estimateCredit` 则**不 lock、不执行**。

```text
收到任务
  ↓
[客户端] estimateTokenUsage → estimateCredit
  ↓
available ≥ estimateCredit ?
  ├─ No  → 拒绝执行 + Need Credit 提示（不调用工具）
  └─ Yes → lock → 执行并累计 Token → settle(actualCredit)
```

| 场景 | Credit | 预估消耗 | 行为 |
|------|--------|----------|------|
| 充足 | 100 | 5 | lock → 执行 → settle |
| 不足 | 3 | 5 | **拒绝执行**；提示补充 Credit |
| 边界 | 5 | 5 | 允许；settle 后 available 为 0 |

预估口径：由客户端按提示词长度、规划工具轮次、预期输出等估算 Token，再换算 Credit。

所有 Credit 的最终状态均以 Avalanche 合约记录为准。

---

## 13. 所有权演示 (Ownership Demo)

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

## 14. Credit 消耗演示 (Credit Demo)

初始状态：

```text
Credit: 100（available）
```

执行任务：

```text
“研究 Avalanche”
客户端估算：estimateTokens ≈ 4800 → estimateCredit = 5
```

预付锁定 → 执行 → 终态结算：

```text
lock(#001, 5)     100 → available 95 / locked 5
settle(#001, 5)   locked 0 / available 95
```

Explorer 链上事件日志：

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

### 用户验证路径

固定 TaskId 与链上 lock / settle Event 的对应关系：

```text
Task #1
  ↓ Agent 日志：TaskId=#001, estimateTokens=4800, actualTokens=4800, Credit 5→5
  ↓ 本地 UI：预估 5 · 实际 5（100 → 95）
  ↓ 链上：lock(#001, 5) → settle(#001, 5)
  ↓ Event：CreditLocked + CreditSettled
  ↓ Explorer：[ View on Avalanche ] → 用户公开验证
```

| 字段 | 值 | 用途 |
|------|-----|------|
| TaskId | `#001` | Agent 日志与 Event 主键 |
| Estimate / Actual | `5` / `5` | 与本地展示一致 |
| Owner | 当前连接钱包 | 所有权关联 |
| Tx Hash | lock / settle 交易哈希 | Explorer 跳转 |

任务完成后 UI 展示：

```text
Task #001 · 预估 5 · 实际 5 · 退回 0
[ 查看链上记录 ]
```

### Credit 不足演示

```text
Credit: 3
任务: “帮我研究 Avalanche 并生成报告”
预估: 5
结果: 不 lock、不执行
Sealoo: “需要补充一点 Credit 才能继续工作哦。”
```

---

## 15. 桌面 UI 界面设计

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
│                         │
│ Task #001 · -5 Credit   │
│ [ 查看链上记录 ]        │
└─────────────────────────┘
```

---

## 钱包界面 (Wallet)

本地显示与链上真实状态需可区分。钱包界面展示 Network、Last synced 与交易状态。

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
│ [ 在 Explorer 中查看 ]      │
│ [ 刷新 ]                    │
└─────────────────────────────┘
```

交易状态：

| 状态 | UI 文案 | 含义 |
|------|---------|------|
| idle | Confirmed ✓ | 无进行中交易 |
| awaiting_wallet | Waiting for wallet confirmation... | 已请求、待用户签名 |
| pending | Transaction pending... | 已广播、待出块 |
| confirmed | Confirmed ✓ | 收据确认，本地已用链上值覆盖 |
| failed | Failed — tap to retry | 失败或用户拒绝 |

本地 Credit 为缓存；`Last synced` 与 `Confirmed` 标明与链上一致性。

---

## 16. Sealoo 人设与性格

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

在任务开始前的 Credit 预检失败时触发（尚未调用工具）：

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

## 17. Hackathon 核心 Demo 剧本

## 场景 1

桌面右下角出现宠物：

```text
🦭 Sealoo
```

---

## 场景 2

用户发起指令：

> “帮我研究 Avalanche，并生成一份 Markdown 报告。”

预检通过（Credit ≥ 预估 5）后，Sealoo 状态切换：

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

显示 Credit 变动（预付 lock + 终态 settle）：

```text
Credit

任务前 available: 100
预估锁定:           5
实际消耗:           5
退回:               0
任务后 available:  95
TaskId: #001
```

---

## 场景 4b · Credit 不足

```text
Credit: 3
预估: 5
→ 拒绝执行，不进入工具调用
→ Need Credit 提示
```

---

## 场景 5

点击按钮：

```text
View on Avalanche
```

沿 Task #001 验证路径展示：Agent 日志 → lock → settle → Explorer。

---

## 场景 6

打开钱包视图：

```text
Network: Avalanche Fuji
Sealoo #123
Owner: 0xABC...123
Credit: 95
Last synced: ...
Status: Confirmed ✓
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

## 18. MVP 功能清单

### 桌面端 (Desktop)

- [x] 桌面宠物常驻 (Desktop Pet)

- [x] 快捷栏对话 / 任务状态 (Quickbar)

- [x] 基础动画交互 (Simple animations)

- [ ] 完整聊天 UI / 任务详情页

- [ ] 钱包 Network / Last synced / 交易状态展示

### AI 层

- [x] 智能对话 (Chat，Tauri 拉起 Go Agent)

- [ ] 简易任务规划 (Simple planning，显式步骤列表)

- [x] 网络搜索 (Web Search → `search_web`)

- [x] 网页阅读 (Page Reading → `fetch_page`)

- [x] 内容总结 (写在最终回复里，无独立工具)

- [x] Markdown 文件生成 (`write` / `edit`)

- [x] 客户端 Token 累计与 Credit 换算（`1000 Token = 1 Credit`）

- [ ] 任务前余额预检与拒绝执行

- [ ] 预估上限内停工具 / lock + settle

### Avalanche 链上

- [ ] 钱包连接 (Wallet Connection)

- [ ] Sealoo 链上身份 (Sealoo Identity)

- [ ] Agent NFT 铸造

- [ ] Credit 余额查询

- [ ] Credit 预付锁定与终态结算（lock + settle）

- [ ] 链上 Event 事件抛出（含 TaskId）

- [ ] 区块链浏览器跳转链接（TaskId ↔ Tx 可验证）

### 安全性 (Security)

- [ ] 无私钥存储 (No Private Key Storage)

- [ ] 交易由用户钱包授权

- [ ] 链上防篡改 Credit 状态

---

## 19. 技术栈 (Tech Stack)

```text
Desktop (桌面端)
├── Tauri
├── TypeScript
└── Three.js

AI Layer (AI 层)
├── Go Agent Runtime
├── OpenAI-compatible LLM API
└── Tools: read · write · edit · bash · search_web · fetch_page

Blockchain (规划中)
├── Avalanche C-Chain
├── Solidity
└── 钱包客户端（未接入）
```

---

## 20. 项目目录结构

```text
sealoo/
│
├── app/                      # Tauri 桌面宠物
│   ├── src/
│   │   ├── main.ts           # 宠物窗口 + 快捷栏
│   │   ├── quickbar.ts       # 任务快捷栏
│   │   ├── home.ts           # 主页窗口
│   │   └── movement/         # 动画 / 拖拽
│   └── src-tauri/            # 拉起 Agent、偏好存储
│
├── agent/                    # Go Agent
│   ├── main.go               # CLI：-prompt / -events
│   └── runtime/              # 循环、工具、LLM 客户端
│
├── model/                    # Blender 模型与导出
│   └── ban/banv3.py
│
├── docs/                     # 产品与预付费方案文档
└── README.md
```

---

## 21. 网络部署

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

## 22. 未来展望

More seal...（更多可爱的海豹与可能性）

---

## 23. 产品哲学

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

## 24. 终极 Pitch 演讲稿

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

## 25. 最终定义

> **Sealoo 既是一只 AI 桌面宠物，也是通往 Avalanche 生态最简单的入口。**
>
> **它将轻量级的 AI Agent 体验与 Avalanche 钱包、链上身份和简单透明的额度系统完美结合。**
>
> **AI 计算运行于链下，所有权与价值留存于 Avalanche。**
>
> **用户拥有钱包的完整控制权。**
>
> **Sealoo 让 Avalanche 变得简单、亲切、触手可及。**
