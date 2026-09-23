![Avalanche Buildathon](github_public/Avalanche.svg)

![UI](github_public/ui.webp)

<div align="left">

<h1 align="left">🦭Sealoo</h1>

Your AI seal on the desktop.

## ✨Adopt the seal

You will receive

1. A simple Avalanche experience
2. A cute seal
3. An Agent
4. A permanent pet with an identity
5. A simpler entrance to Avalanche

## 📸Demo

![Demo 1](github_public/demo/demo1.webp)

![Demo 2](github_public/demo/demo2.webp)

![Demo 3](github_public/demo/demo3.webp)

## 🛠️Tech stack

**Desktop:** Tauri 2, TypeScript, Vite, Three.js, viem

**Agent:** Go

**Contracts:** Solidity, Foundry

## Architecture

![Operating Mode Overview](github_public/Operating-Mode-Overview.webp)

## 📁Project structure

```text
Sealoo/
├── app/                 # Tauri desktop client
│   ├── src/             # TypeScript UI, movement, web3
│   ├── src-tauri/       # Rust shell, prefs, agent bridge
│   ├── index.html       # Pet window
│   └── home.html        # Home window
├── agent/               # Go agent runtime
│   ├── main.go
│   └── runtime/
├── web3/                # Solidity + Foundry
│   ├── src/             # AgentRegistry, WorkCredit
│   ├── script/
│   └── test/
├── model/               # Blender models & export
├── docs/                # Product docs
└── github_public/       # README assets
```

</div>
