# Sealoo LLM Token 网关

> **Key 只在服务端；网关查链上 Credit 后再转发模型；用量以网关看到的 `usage` 为准。**

用户不配置、不持有 LLM API Key。桌面不直连 DeepSeek。链上只放 Credit，不放 Key、不放 Token。

相关文档：`docs/prepaid-credit.cn.md`、`docs/cn.md` 第 12 节。代码：`gateway/`。

---

## 1. 目标

| 目标 | 说明 |
|------|------|
| 用户不碰 Key | DeepSeek（或其它兼容接口）的 Key 只存在网关环境变量 |
| Credit 真能挡住推理 | 没有链上 `lock`，网关拒绝转发 |
| Token 真相在网关 | 以模型返回的 `usage` 累计，不信客户端自报 |
| 第一版够薄 | 只做鉴权、查链、转发；Agent 工具仍在用户电脑执行 |

非目标（第一版不做）：流式输出、多实例票据存储、合约 Relayer 代 `settle`、按 AVAX 实时定价。

---

## 2. 放哪里

| 东西 | 位置 | 不要放哪 |
|------|------|----------|
| DeepSeek API Key | 网关进程环境变量 | 桌面、安装包、合约、前端 |
| LLM Token 用量 | 网关按上游 `usage` 累计 | 客户端估算不当最终扣费依据 |
| Credit | Fuji `WorkCredit` | 网关自己发一套余额 |
| 工具（读文件 / 搜索） | 本地 Go Agent | 网关 |

查 `balanceOf` / `openTask` / `tasks` 是 `eth_call`，**不花 gas**。花钱的仍是钱包侧 `lock` / `settle`。

---

## 3. 流程

```text
用户喂鱼（purchase）
  ↓
桌面估 Token → estimateCredit；余额不足则停
  ↓
钱包 lock(taskId, estimateCredit)
  ↓
桌面 personal_sign 挑战文案 → POST /v1/ticket
  ↓
网关：验签名 + eth_call 确认 openTask(owner)==taskId 且 Locked
  ↓
返回短期 ticket（不是 DeepSeek Key）
  ↓
Agent：OPENAI_BASE_URL=网关  Authorization: Bearer <ticket>
  ↓
POST /v1/chat/completions
  网关再查锁仓 / 剩余额度 → 用服务端 Key 转发 DeepSeek
  ↓
累计 usage；换算 Credit 触顶则 402，不再转发
  ↓
桌面仍用用户钱包 settle（见第 6 节）
```

当前 `WorkCredit.settle` 要求 `msg.sender == owner`，网关**不能**替用户上链结算。第一版：网关强制停用；桌面按网关累计的 Token `settle`。以后若加 Relayer 角色，再改为网关结算。

---

## 4. HTTP API

默认监听 `:8787`。OpenAI 兼容路径便于现有 Go 客户端只改 BaseURL。

### `GET /health`

存活检查。

### `GET /v1/challenge?address=0x…&taskId=0x…`

返回必须用该钱包 `personal_sign` 的原文（换行必须一致）：

```text
Sealoo LLM gateway
URI: <GATEWAY_PUBLIC_URL>
Chain ID: 43113
WorkCredit: <合约地址>
Address: <checksum 地址>
Task: <taskId>
```

### `POST /v1/ticket`

```json
{ "address": "0x…", "taskId": "0x…", "signature": "0x…" }
```

成功：`{ "token": "<ticket>", "expiresIn": 7200, "estimateCredit": 5 }`

失败：签名不符、链上无锁仓、task 不属于该地址 → `401` / `403`。

### `POST /v1/chat/completions`

`Authorization: Bearer <ticket>`。请求体与 OpenAI Chat Completions 相同。网关可覆盖 `model` 为配置的上游模型。第一版拒绝 `stream: true`。

### `GET /v1/usage`

同一 Bearer。返回该 ticket 已用 `prompt_tokens` / `completion_tokens` / `total_tokens` 以及 `actualCredit`。

费率与现网一致：`TOKENS_PER_CREDIT = 1000`，向上取整。

---

## 5. 查链规则（每次发 ticket、每次 completions 前）

对 `WorkCredit` 只读：

1. `openTask(address)` 等于请求的 `taskId`，且不是 `bytes32(0)`
2. `tasks(taskId)`：`owner == address`，`state == Locked (1)`
3. `CreditFromTokens(已用 + 本轮预留) <= estimate`

不满足则不携带上游 Key、不发 DeepSeek 请求。

---

## 6. 与现有模块的分工

| 模块 | 继续做什么 | 网关上线后改什么 |
|------|------------|------------------|
| `web3/WorkCredit` | purchase / lock / settle | 第一版合约不改 |
| `app` 桌面 | 钱包 lock / settle、唤起 Agent | lock 成功后换 ticket，把 ticket 当 Agent 的 API Key |
| `agent` | 工具循环、打 `/v1/chat/completions` | `OPENAI_BASE_URL` 指向网关；Key 改为 ticket |
| `gateway` | 持有 DeepSeek Key、验 Web3、转发、计量 | 本仓库新目录 |

---

## 7. 运行

环境变量（见 `gateway/.env.example`）：

```text
LISTEN=:8787
GATEWAY_PUBLIC_URL=http://127.0.0.1:8787
DEEPSEEK_API_KEY=       # 必填，仅服务器
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
WORK_CREDIT=0x16c3F7F78e9dca9f8B5D475bE812E773f34C1F67
CHAIN_ID=43113
TICKET_TTL_SEC=7200
```

```text
cd gateway
go test ./...
go run .
```

本地 Agent 联调（桌面接 ticket 之前）：先 `lock`，再 `GET /v1/challenge` → 钱包签名 → `POST /v1/ticket`，然后：

```text
OPENAI_BASE_URL=http://127.0.0.1:8787/v1
OPENAI_API_KEY=<ticket>
OPENAI_MODEL=deepseek-chat
```

Fuji 测试币 Credit 几乎免费，**不要把未加每用户限额的网关暴露到公网**，否则会刷光 DeepSeek 额度。

---

## 8. 以后再做

- `WorkCredit` 授权 Relayer，由网关 `settle`
- Redis 票据、多副本
- 流式、限流、模型路由
- Credit 对 DeepSeek 美元成本的汇率与告警
