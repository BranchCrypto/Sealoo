# Sealoo Credit 预付费方案

> **客户端估算 Token → 换算 Credit 并锁定 → 任意终态按实际 Token 结算（多退少补）**

Sealoo Agent 运行额度采用预付费模型：客户端负责 Token 计量，Avalanche 合约负责 Credit 锁定与结算，并与「鱼桶 / 精力」产品叙事对齐。

相关文档：`docs/cn.md` 第 12 节 Credit 机制。

---

## 1. 目标

| 目标 | 说明 |
|------|------|
| 预付费 | 用户先持有 Credit，再使用 Agent |
| 客户端估算 | Token 用量由客户端估算，再换算为锁定 Credit |
| 防白嫖 | 取消、崩溃、杀进程均按已用 Token 结算 |
| 可验证 | TaskId 贯穿本地日志与 Avalanche Event / Explorer |
| 叙事一致 | Credit = 粮；开任务先拿出预估份；用完按实际吃掉 |

---

## 2. 核心模型

```text
可用余额 available
冻结余额 locked
────────────────
总额 = available + locked
```

- **purchase / 喂鱼**：增加 `available`
- **lock**：任务开始时从 `available` 挪到 `locked`
- **settle**：任务结束时从 `locked` 扣除实际用量，剩余退回 `available`
- **真相源**：Avalanche 合约状态

### 计量单位

| 单位 | 谁算 | 用途 |
|------|------|------|
| Token（LLM） | 客户端估算 / 累计 | 真实模型用量口径 |
| Credit（链上） | Token × 费率换算 | 锁定与结算、用户可见额度 |

```text
TOKENS_PER_CREDIT = 1000

estimateCredit = ceil(estimateTokens / TOKENS_PER_CREDIT)
actualCredit   = ceil(actualTokens   / TOKENS_PER_CREDIT)

// 例：预估 4800 Token → 5 Credit
```

### 计费身份

| 概念 | 谁持有 | 说明 |
|------|--------|------|
| LLM API Key | 开发者服务端 / Agent Runtime | 真正调用模型 |
| Token 估算与累计 | 客户端 | 开任务前估算，运行中/结束后累计 |
| Credit | 用户（链上） | 使用 Agent 的预付额度 |
| 鱼桶 | 用户钱包 | 用链上资产换 Credit / 喂鱼 |

用户不持有也不填写 LLM API Key。

---

## 3. 主流程

```text
① 预充
   用户 purchase / 喂鱼 → available 增加

② 客户端 Token 用量估算（链下）
   estimateTokens = client.estimateTokenUsage(task)
   estimateCredit = ceil(estimateTokens / TOKENS_PER_CREDIT)
   if available < estimateCredit → 拒绝，Need Credit

③ 锁定（预付生效）
   lock(taskId, estimateCredit)
   available -= estimateCredit
   locked   += estimateCredit
   emit CreditLocked(taskId, estimateCredit, owner)

④ 链下执行 + 客户端累计实际 Token
   Agent 搜索 / 阅读 / 总结 / 写入
   actualTokens = client.accumulateTokenUsage(...)
   // actualCredit 不得超过 estimateCredit；触及上限则停工具并进入结算

⑤ 终态结算（成功 / 取消 / 失败 / 超时 均走此步）
   actualCredit = ceil(actualTokens / TOKENS_PER_CREDIT)
   settle(taskId, actualCredit)
   refund = estimateCredit - actualCredit
   emit CreditSettled(taskId, actualCredit, refund, owner)
```

### 数值示例

```text
初始：available=100, locked=0
客户端估算：estimateTokens=4800 → estimateCredit=5

开任务 lock(5)
  → available=95, locked=5

实际：actualTokens=2900 → actualCredit=3，正常结束
  → available=97, locked=0
  （扣 3，退 2）

中途取消：actualTokens=800 → actualCredit=1
  → available=99, locked=0
  （扣 1，退 4）
```

---

## 4. 客户端 Token 估算

估算与累计均在客户端完成；合约只认 Credit 数字。

### 4.1 开任务前：`estimateTokenUsage(task)`

输入：

```text
- 用户提示词 / 上下文长度
- 任务类型（闲聊 / 搜索 / 研究报告）
- Agent 规划出的工具步数与轮次
- 预期输出长度（如要生成长 Markdown）
```

估算公式：

```text
estimateTokens =
    promptTokens
  + sum(plannedToolRounds × TOOL_ROUND_TOKENS)
  + expectedOutputTokens
  + SAFETY_MARGIN          // 10%～20%
```

任务模板基线：

| 任务类型 | 基础 Token | 再加 |
|----------|------------|------|
| 闲聊 | 800 | prompt 实测 |
| 单次搜索问答 | 2500 | prompt + 1～2 轮工具 |
| 研究并生成报告 | 4500 | prompt + 多轮工具 + 长输出 |

### 4.2 运行中 / 结束后：`accumulateTokenUsage`

1. API 返回的 usage（prompt_tokens + completion_tokens）——有则累加  
2. 无 usage 时：客户端本地 tokenizer / 字符粗估补齐  
3. 工具往返的中间上下文，按轮次计入客户端累计器  

```text
actualTokens = Σ(每次 LLM 调用的 usage 或本地估算)
actualCredit = min(ceil(actualTokens / TOKENS_PER_CREDIT), estimateCredit)
```

### 4.3 客户端产出字段（随 Task 保存）

```text
taskId
estimateTokens
estimateCredit
actualTokens
actualCredit
refundCredit
```

上述字段进入 Agent 日志与 UI；上链仅 `estimateCredit` / `actualCredit`。

---

## 5. 合约接口（WorkCredit）

```solidity
balanceOf(address)           // available
lockedOf(address)            // locked
purchase()                   // 充值 / 喂鱼入口

lock(bytes32 taskId, uint256 estimateCredit)
settle(bytes32 taskId, uint256 actualCredit)
// actualCredit <= estimateCredit；仅任务发起者或授权 Relayer 可结
```

合约接收 Credit，不接收 Token；Token → Credit 换算在客户端完成。

### 事件

```text
CreditPurchased(owner, amount)
CreditLocked(taskId, estimateCredit, owner)
CreditSettled(taskId, actualCredit, refund, owner)
```

### 状态机（单 Task）

```text
None → Locked → Settled
```

同一 `taskId` 不可重复 `lock`；`settle` 只能一次。超时未结算时，由客户端下次启动或 keeper 补 `settle`。

---

## 6. 链上 / 链下分工

| 环节 | 位置 | 上链？ |
|------|------|--------|
| Token 用量估算 | 客户端 | 否 |
| Token → Credit 换算 | 客户端 | 否 |
| 工具调用 | 链下 | 否 |
| 实际 Token 累计 | 客户端 | 否 |
| purchase / 喂鱼 | 链上 | 是 |
| lock(estimateCredit) | 链上 | 是（任务开始 1 次） |
| settle(actualCredit) | 链上 | 是（任务结束 1 次） |
| 余额真相源 | 合约 | 是 |

单任务 Credit 相关链上交易：**lock 1 次 + settle 1 次**（充值另计）。

实现路径：

```text
purchase → 客户端估 Token → lock(Credit) → 执行并累计 Token → settle(Credit)
```

---

## 7. 终态与异常

| 场景 | 处理 |
|------|------|
| 成功完成 | 客户端算出 `actualCredit` 后 `settle`，退回差额 |
| 用户取消 | 按已累计 Token 结算 |
| 预检不足 | 不 `lock`、不执行 |
| actualCredit 冲到 estimateCredit | 停止工具调用，立刻 `settle(taskId, estimateCredit)` |
| 杀进程 / 崩溃 | 本地持久化已累计 Token；下次启动补 `settle` |
| lock 成功但超时未 settle | 按已累计 Token 结算；无累计记录则按 estimateCredit 全额结算 |
| 用户拒绝钱包签名（lock） | 任务不开始 |
| 用户拒绝钱包签名（settle） | 本地重试；未结清前不可开新任务 |
| 客户端估算偏低 | 触及锁定上限即停，提示「额度用尽」 |
| 客户端估算偏高 | settle 后退回差额 |

### 规则

1. 任务必须以 Settled 结束  
2. available 不足不能 lock  
3. actualCredit 不得超过该任务的 estimateCredit  
4. 存在未结任务时，禁止开启新任务  
5. Token 仅作链下计量；链上只提交 Credit  

---

## 8. 产品叙事

```text
鱼桶 / Credit              = 预先准备的粮
客户端估 Token → Credit    = 开干前算要带多少粮
lock(estimateCredit)       = 先拿出预估份粮
链下干活 + 客户端计 Token  = 海豹消耗精力干活
settle(actualCredit)       = 按实际吃掉，剩下放回鱼桶
Credit 不足                = 「先喂点鱼再干活哦」
```

---

## 9. UI 展示

### 任务开始前

```text
预估 Token：约 4,800
预估 Credit：5
可用：100
[ 确认开始 ]   → 触发 lock
```

### 任务进行中

```text
已锁定：5 Credit
已用 Token：约 2,100（客户端累计）
约合 Credit：3
Status: Working...
```

### 任务结束后

```text
Task #001
Token  预估 4800 · 实际 2900
Credit 预估 5 · 实际 3 · 退回 2
可用：97
[ 查看链上记录 ]
```

钱包侧展示：`Network: Avalanche Fuji`、`Last synced`、交易状态（Waiting / Pending / Confirmed）。

---

## 10. 验证路径（Explorer）

```text
TaskId=#001
  → 客户端：estimateTokens=4800 → estimateCredit=5
  → CreditLocked(#001, 5)
  → 客户端：actualTokens=2900 → actualCredit=3
  → CreditSettled(#001, actual=3, refund=2)
  → Explorer（链上为 Credit；Token 在本地 / Agent 日志）
```

---

## 11. 功能清单

- [x] 客户端开任务前给出 `estimateTokens` / `estimateCredit`  
- [x] 用户 purchase / 喂鱼增加 Credit  
- [x] available < estimateCredit 时任务无法开始  
- [x] lock 成功后执行 Agent  
- [x] 运行中客户端累计 `actualTokens`  
- [x] 成功 / 取消 / 失败均按实际 Token 换算后 settle  
- [x] 崩溃后重启可补结算  
- [x] 单任务 2 笔 Credit 相关链上交易（lock + settle）  
- [x] TaskId 可从 UI 跳到 Explorer  

---

## 12. 定义

> **Sealoo Credit 预付费 = 客户端估算 Token 并换算 Credit + 任务开始锁定预估 + 任意终态按实际 Token 换算结算并退回差额。**
