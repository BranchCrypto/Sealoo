![Avalanche Buildathon](github_public/Avalanche.svg)

# Sealoo

**海豹主题桌面宠物 ，使用Web3技术自动补充Token的Work Agent。**

---

## Features

- **开发中**

---

## 运行模式

![Operating Mode Overview](github_public/Operating-Mode-Overview.webp)

---

## 技术栈

**前端**

| 技术         | 用途      |
| ---------- | ------- |
| Tauri      | 桌面壳     |
| Rust       | 前端进程管理  |
| TypeScript | 前端逻辑    |
| Three.js   | 模型挂载与动画 |
| Vite       | 前端构建    |

**Agent**

| 技术 | 用途    |
| -- | ----- |
| Go | Agent |

**Web3**

| 技术       | 用途       |
| -------- | -------- |
| Solidity | 链上合约     |
| Go       | Web3 侧逻辑 |
| 钱包       | 链上资产与交互  |

---

## 产品方向（草稿）

以电子宠物为载体的 Agent，具备基础 Work Agent 能力。

**Agent 侧**

1. **基础工具** — 文件：`read` · `write` · `edit`；命令：`bash`；网络：`search_web` · `fetch_page`。名称一律小写蛇形。计划中：`glob` · `grep`
2. **宠物定义** — 宠物基因与长短期记忆（设计中）
3. **Skill** — 用短期或一次性 skill 调用
4. **记忆** — 关键信息 + 工具调用记录
5. **计时器** — 定时任务

**Web3 侧**

1. **宠物信息** — 海豹 id、品种、年龄、毛色、重量、尺寸、样式模板、性格
2. **鱼桶** — 钱包余额

**核心交互**

| 概念  | 说明                                     |
| --- | -------------------------------------- |
| 精力值 | Token 用量映射为精力；耗尽需吃鱼补充                  |
| 鱼桶  | 链上钱包余额；买鱼与喂鱼均需用户在钱包中确认                 |
| 上链  | 多数交互不上链；重要变化、买鱼与喂鱼走链上；精力耗尽时暂停并等待用户确认喂鱼 |

---

## Dev Start

**前置**

| 环境   | 要求                                      |
| ---- | --------------------------------------- |
| Node | 18+                                     |
| Rust | [rustup](https://rustup.rs/) 安装的 stable |

```bash
cd Sealoo/app
npm install
npm run tauri dev
```

Agent 由桌面端拉起。先编译二进制（没有它时会退回 `go run`），并设置 `OPENAI_API_KEY`。可选：`OPENAI_BASE_URL`、`OPENAI_MODEL`、`SEALOO_AGENT`。

```bash
cd Sealoo/agent
go build -o sealoo-agent.exe .
```

---

## 目录结构

```text
Sealoo/
├── app/                       # Tauri 桌面宠物客户端
│   ├── index.html             # #pet 画布根、#ctx-menu、#quickbar
│   ├── home.html              # 主页窗口
│   ├── package.json
│   ├── vite.config.ts         # 端口 1420
│   ├── src/
│   │   ├── main.ts            # 宠物窗口 + 拉起 Agent
│   │   ├── quickbar.ts        # 任务快捷栏
│   │   ├── home.ts
│   │   ├── prefs.ts
│   │   ├── styles.css
│   │   └── movement/          # 动作路由和管理
│   │       ├── router.ts
│   │       └── drag.ts
│   ├── public/models/
│   │   └── pet.glb
│   └── src-tauri/
│       ├── tauri.conf.json
│       ├── capabilities/default.json
│       └── src/
│           ├── main.rs
│           └── lib.rs         # prefs + agent_prompt / agent_abort
├── agent/                     # Go Agent（read/write/edit/bash/search_web/fetch_page）
│   ├── main.go
│   └── runtime/
├── model/                     # Blender 模型与导出脚本
│   └── ban/banv3.py
├── docs/                      # 产品文档与预付费方案
└── github_public/             # GitHub 材料
```

---

