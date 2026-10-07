import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { getPrefs, markSetupComplete, setPrefs } from "./prefs";
import { runUiPrepaidTask, type UiAgentEvent } from "./agentBridge";
import {
  CORE_INSTALL,
  connect,
  contractsReady,
  credit,
  explorerTxUrl,
  getAccount,
  getAvaxBalance,
  loadHistory,
  noWalletMessage,
  pushHistory,
  recoverPendingSettle,
  registry,
  type TxStatus,
} from "./web3";
import type { Address } from "viem";

type ViewId =
  | "welcome"
  | "name"
  | "about"
  | "done"
  | "home"
  | "wallet"
  | "chat"
  | "history"
  | "settings";

type AppView = "home" | "wallet" | "chat" | "history" | "settings";

const TOOL_STAGE: Record<string, string> = {
  search_web: "搜索中…",
  fetch_page: "阅读中…",
  write: "撰写中…",
  edit: "撰写中…",
  read: "阅读中…",
  bash: "处理中…",
};

const win = getCurrentWindow();
const views: Record<ViewId, HTMLElement> = {
  welcome: must("#view-welcome"),
  name: must("#view-name"),
  about: must("#view-about"),
  done: must("#view-done"),
  home: must("#view-home"),
  wallet: must("#view-wallet"),
  chat: must("#view-chat"),
  history: must("#view-history"),
  settings: must("#view-settings"),
};
const nameInput = must<HTMLInputElement>("#pet-name");
const nextName = must<HTMLButtonElement>("#next-name");
const doneName = must("#done-name");
const homeTitle = must("#home-title");
const hubCredit = must("#hub-credit");
const hubWallet = must("#hub-wallet");
const finishBtn = must<HTMLButtonElement>("#finish-setup");
const closeBtn = must<HTMLButtonElement>("#win-close");

const wAddress = must("#w-address");
const wAvax = must("#w-avax");
const wCredit = must("#w-credit");
const wAgent = must("#w-agent");
const wSynced = must("#w-synced");
const wStatus = must("#w-status");
const wMsg = must("#w-msg");
const btnConnect = must<HTMLButtonElement>("#w-connect");
const btnMint = must<HTMLButtonElement>("#w-mint");
const btnFeed = must<HTMLButtonElement>("#w-feed");
const btnRefresh = must<HTMLButtonElement>("#w-refresh");
const btnRecover = must<HTMLButtonElement>("#w-recover");
const linkExplorer = must<HTMLAnchorElement>("#w-explorer");

const chatTitle = must("#chat-title");
const chatHint = must("#chat-hint");
const chatUser = must("#chat-user");
const chatStage = must("#chat-stage");
const chatReplyWrap = must("#chat-reply-wrap");
const chatReply = must("#chat-reply");
const chatCredit = must("#chat-credit");
const chatExplorer = must<HTMLAnchorElement>("#chat-explorer");
const chatForm = must<HTMLFormElement>("#chat-form");
const chatInput = must<HTMLInputElement>("#chat-input");
const chatSend = must<HTMLButtonElement>("#chat-send");
const chatAbort = must<HTMLButtonElement>("#chat-abort");

const histList = must("#hist-list");
const histEmpty = must("#hist-empty");
const settingsName = must<HTMLInputElement>("#settings-name");
const settingsSave = must<HTMLButtonElement>("#settings-save");

let current: ViewId | null = null;
let petName = "Sealoo";
let account: Address | null = null;
let lastTx: string | null = null;
let chatBusy = false;
let chatCancel: (() => void) | null = null;
let chatPrompt = "";
let setupDone = false;

function must<T extends HTMLElement = HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`${sel} missing`);
  return el;
}

function readName(): string {
  return nameInput.value.trim();
}

function hasPetName(): boolean {
  return readName().length > 0;
}

function syncNameNext() {
  nextName.disabled = !hasPetName();
}

function isAppView(v: string): v is AppView {
  return (
    v === "home" ||
    v === "wallet" ||
    v === "chat" ||
    v === "history" ||
    v === "settings"
  );
}

function show(id: ViewId) {
  if (id === "done") doneName.textContent = petName;
  if (id === "home" || id === "wallet") {
    homeTitle.textContent = petName;
    chatTitle.textContent = petName;
    void refreshWallet();
  }
  if (id === "chat") {
    chatTitle.textContent = petName;
    if (!chatBusy) resetChatIdle();
  }
  if (id === "history") renderHistory();
  if (id === "settings") settingsName.value = petName;
  if (id === "name" && !nameInput.value && petName) {
    nameInput.value = petName;
  }

  for (const [key, el] of Object.entries(views) as [ViewId, HTMLElement][]) {
    el.hidden = key !== id;
  }
  current = id;

  if (id === "name") {
    syncNameNext();
    requestAnimationFrame(() => nameInput.focus());
  }
  if (id === "chat" && !chatBusy) requestAnimationFrame(() => chatInput.focus());
}

function go(id: ViewId) {
  if (current === "name") {
    if (id !== "welcome" && !hasPetName()) return;
    if (hasPetName()) petName = readName();
  }
  show(id);
}

async function finishSetup() {
  if (!hasPetName() && !petName) return;
  petName = readName() || petName;
  await markSetupComplete(petName);
  setupDone = true;
  await emit("sealoo-setup-complete");
  show("home");
  await win.hide();
}

function setMsg(text: string | null) {
  if (!text) {
    wMsg.hidden = true;
    wMsg.textContent = "";
    return;
  }
  wMsg.hidden = false;
  wMsg.textContent = text;
}

function statusLabel(s: TxStatus): string {
  switch (s) {
    case "idle":
    case "confirmed":
      return "Confirmed";
    case "awaiting_wallet":
      return "Waiting";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
  }
}

function onTxStatus(s: TxStatus) {
  const idle = s === "idle" || s === "confirmed";
  wStatus.hidden = idle;
  wStatus.textContent = idle ? "" : statusLabel(s);
  wStatus.dataset.state = idle ? "" : s;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function setConnected(on: boolean) {
  btnMint.disabled = !on;
  btnFeed.disabled = !on;
  btnRefresh.disabled = !on;
  btnRecover.disabled = !on;
  btnConnect.textContent = on ? "已连接" : "连接钱包";
  hubWallet.textContent = on ? "已连接" : "未连接";
}

async function refreshWallet() {
  setMsg(null);
  if (!contractsReady()) {
    setMsg("合约地址未配置：部署后更新 fuji.json");
  }
  try {
    account = await getAccount();
  } catch {
    account = null;
  }
  if (!account) {
    setConnected(false);
    wAddress.textContent = "未连接";
    wAvax.textContent = "—";
    wCredit.textContent = "—";
    wAgent.textContent = "—";
    hubCredit.textContent = "—";
    return;
  }
  setConnected(true);
  wAddress.textContent = shortAddr(account);
  try {
    wAvax.textContent = await getAvaxBalance(account);
    if (contractsReady()) {
      const [avail, locked, agentId] = await Promise.all([
        credit.balanceOf(account),
        credit.lockedOf(account),
        registry.primaryAgentId(account),
      ]);
      wCredit.textContent = `${avail} available · ${locked} locked`;
      hubCredit.textContent = String(avail);
      wAgent.textContent = agentId != null ? `#${agentId}` : "未铸造";
    } else {
      hubCredit.textContent = "—";
    }
    wSynced.textContent = new Date().toLocaleString();
    onTxStatus("idle");
    if (lastTx) linkExplorer.href = explorerTxUrl(lastTx);
  } catch (e) {
    setMsg(e instanceof Error ? e.message : String(e));
  }
}

async function withTx(fn: () => Promise<string>) {
  setMsg(null);
  try {
    const hash = await fn();
    lastTx = hash;
    linkExplorer.href = explorerTxUrl(hash);
    await refreshWallet();
  } catch (e) {
    onTxStatus("failed");
    setMsg(e instanceof Error ? e.message : String(e));
  }
}

function resetChatIdle() {
  chatBusy = false;
  chatCancel = null;
  chatPrompt = "";
  chatHint.hidden = false;
  chatUser.hidden = true;
  chatUser.textContent = "";
  chatStage.textContent = "";
  chatReplyWrap.hidden = true;
  chatReply.textContent = "";
  chatCredit.hidden = true;
  chatCredit.textContent = "";
  chatExplorer.hidden = true;
  chatInput.disabled = false;
  chatSend.disabled = false;
  chatAbort.hidden = true;
}

function showChatReply(text: string) {
  chatReplyWrap.hidden = false;
  chatReply.textContent = text;
}

function onChatEvent(ev: UiAgentEvent) {
  if (ev.type === "need_credit") {
    chatStage.textContent = "Need Credit";
    showChatReply(ev.error || "请先连接钱包或喂鱼。");
    show("wallet");
    setMsg(ev.error || "请先连接钱包或喂鱼。");
    return;
  }
  if (ev.type === "tx_status") {
    const c = ev.message?.content;
    if (c === "awaiting_wallet") chatStage.textContent = "等待钱包签名…";
    else if (c === "pending") chatStage.textContent = "交易确认中…";
    else if (c === "settling") chatStage.textContent = "结算中…";
    return;
  }
  if (ev.type === "credit_settled" && ev.credit) {
    const c = ev.credit;
    chatCredit.hidden = false;
    chatCredit.textContent =
      `Task ${c.taskId.slice(0, 10)}… · −${c.actual} Credit` +
      (c.refund ? `（退回 ${c.refund}）` : "");
    if (c.explorerUrl) {
      chatExplorer.hidden = false;
      chatExplorer.href = c.explorerUrl;
    }
    pushHistory({
      taskId: c.taskId,
      prompt: chatPrompt,
      estimateCredit: c.estimate,
      actualCredit: c.actual,
      refund: c.refund,
      explorerUrl: c.explorerUrl,
      at: Date.now(),
    });
    void refreshWallet();
    return;
  }
  if (ev.type === "tool_execution_start") {
    chatStage.textContent = TOOL_STAGE[ev.tool_name ?? ""] ?? "处理中…";
    return;
  }
  if (ev.type === "message_end" && ev.message?.role === "assistant" && ev.message.content) {
    showChatReply(ev.message.content);
    return;
  }
  if (ev.type === "agent_end" && ev.error) {
    showChatReply(ev.error);
  }
}

function startChat(prompt: string) {
  if (chatBusy) return;
  chatBusy = true;
  chatPrompt = prompt;
  chatHint.hidden = true;
  chatUser.hidden = false;
  chatUser.textContent = prompt;
  chatStage.textContent = "思考中…";
  chatReplyWrap.hidden = true;
  chatReply.textContent = "";
  chatCredit.hidden = true;
  chatExplorer.hidden = true;
  chatInput.value = "";
  chatInput.disabled = true;
  chatSend.disabled = true;
  chatAbort.hidden = false;

  const handle = runUiPrepaidTask(prompt, onChatEvent);
  chatCancel = handle.cancel;
  void handle.done.then(
    () => {
      if (!chatBusy) return;
      if (!chatStage.textContent || chatStage.textContent.endsWith("…")) {
        chatStage.textContent = "完成！";
      }
      chatBusy = false;
      chatCancel = null;
      chatInput.disabled = false;
      chatSend.disabled = false;
      chatAbort.hidden = true;
      void refreshWallet();
    },
    (err: unknown) => {
      if (!chatBusy) return;
      chatStage.textContent = "出错了";
      showChatReply(err instanceof Error ? err.message : String(err));
      chatBusy = false;
      chatCancel = null;
      chatInput.disabled = false;
      chatSend.disabled = false;
      chatAbort.hidden = true;
    },
  );
}

function renderHistory() {
  const items = loadHistory();
  histList.replaceChildren();
  histEmpty.hidden = items.length > 0;
  for (const r of items) {
    const li = document.createElement("li");
    li.className = "hist-item";
    const when = new Date(r.at).toLocaleString();
    const short = r.taskId.slice(0, 10);
    li.innerHTML =
      `<p class="hist-prompt">${escapeHtml(r.prompt || "(无提示)")}</p>` +
      `<p class="hist-meta">${when} · Task ${short}… · −${r.actualCredit} Credit` +
      (r.refund ? ` · 退 ${r.refund}` : "") +
      `</p>` +
      (r.explorerUrl
        ? `<a class="text-link" href="${r.explorerUrl}" target="_blank" rel="noreferrer">Explorer</a>`
        : "");
    histList.appendChild(li);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

btnConnect.addEventListener("click", () => {
  void (async () => {
    setMsg(null);
    try {
      if (!window.ethereum) {
        setMsg(noWalletMessage());
        window.open(CORE_INSTALL, "_blank");
        return;
      }
      account = await connect();
      await refreshWallet();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  })();
});

btnMint.addEventListener("click", () => {
  if (!account) return;
  void withTx(() => registry.mint(account!, `sealoo:${petName}`, onTxStatus));
});

btnFeed.addEventListener("click", () => {
  if (!account) return;
  void withTx(() => credit.purchase(account!, 100n, onTxStatus));
});

btnRefresh.addEventListener("click", () => {
  void refreshWallet();
});

btnRecover.addEventListener("click", () => {
  void withTx(async () => {
    const hash = await recoverPendingSettle(onTxStatus);
    if (!hash) throw new Error("没有待补结算的任务");
    return hash;
  });
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || chatBusy) return;
  startChat(text);
});

chatAbort.addEventListener("click", () => {
  if (!chatBusy) return;
  chatStage.textContent = "结算中…";
  chatCancel?.();
});

settingsSave.addEventListener("click", () => {
  void (async () => {
    petName = settingsName.value.trim() || "Sealoo";
    await setPrefs({ setupComplete: true, petName });
    show("home");
  })();
});

void win.onCloseRequested(async (event) => {
  event.preventDefault();
  await win.hide();
});

closeBtn.addEventListener("click", () => {
  void win.hide();
});

document.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-go") as ViewId | null;
    if (!target) return;
    go(target);
  });
});

finishBtn.addEventListener("click", () => {
  void finishSetup();
});

nameInput.addEventListener("input", syncNameNext);

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (hasPetName()) go("about");
  }
});

async function boot() {
  const prefs = await getPrefs();
  petName = prefs.petName || "Sealoo";
  setupDone = prefs.setupComplete;
  if (setupDone) {
    show("home");
  } else {
    show("welcome");
  }
  document.documentElement.classList.add("ready");
  await listen<string>("sealoo-home-view", (e) => {
    if (setupDone && isAppView(e.payload)) show(e.payload);
  });
}

void boot();
