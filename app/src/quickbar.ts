/** Desktop pet quickbar — liquid glass prompt + single-task status (issue #2). */

export type Stage = "searching" | "reading" | "writing" | "complete";

const STAGE_LABEL: Record<Stage, string> = {
  searching: "搜索中",
  reading: "阅读中",
  writing: "写入中",
  complete: "任务已完成",
};

const TOOL_STATUS: Record<string, string> = {
  search_web: "搜索中",
  fetch_page: "阅读中",
  read: "阅读中",
  write: "写入中",
  edit: "写入中",
  bash: "执行中",
};

const STAGES: Stage[] = ["searching", "reading", "writing", "complete"];
const STAGE_MS = 2200;

export type AgentEvent = {
  type: string;
  tool_name?: string;
  error?: string;
  message?: { role?: string; content?: string };
  usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  credit?: {
    estimate: number;
    actual: number;
    refund: number;
    taskId: string;
    explorerUrl?: string;
  };
};

export type AgentRun = {
  cancel: () => void;
  done: Promise<void>;
};

export type QuickbarHooks = {
  openDetails: (view?: "chat" | "wallet") => void;
  /** Fired when interactive chrome appears/disappears (click-through). */
  onChromeChange: (active: boolean) => void;
  /** Live agent. Omit to play the timed demo. */
  run?: (prompt: string, onEvent: (ev: AgentEvent) => void) => AgentRun;
};

export type Quickbar = {
  isBusy: () => boolean;
  isChromeOpen: () => boolean;
  hitTest: (clientX: number, clientY: number) => boolean;
  openPrompt: () => void;
  focusStrip: () => void;
  closePrompt: () => void;
};

export function mountQuickbar(hooks: QuickbarHooks): Quickbar {
  const root = must("#quickbar");
  const promptForm = must<HTMLFormElement>("#qb-prompt");
  const promptInput = must<HTMLInputElement>("#qb-input");
  const panel = must("#qb-panel");
  const card = must("#qb-card");
  const promptLine = must("#qb-prompt-line");
  const elapsedEl = must("#qb-elapsed");
  const detailsBtn = must<HTMLButtonElement>("#qb-details");
  const abortBtn = must<HTMLButtonElement>("#qb-abort");
  const stripStatus = must("#qb-strip-status");
  const toggleBtn = must<HTMLButtonElement>("#qb-toggle");
  const replyEl = document.querySelector<HTMLElement>("#qb-reply");
  const chainEl = document.querySelector<HTMLElement>("#qb-chain");

  let busy = false;
  let expanded = false;
  let stage: Stage | null = null;
  let startedAt = 0;
  let tickTimer = 0;
  let stageTimer = 0;
  let focusTimer = 0;
  let gen = 0;
  let settled = false;
  let reply = "";
  let cancelRun: (() => void) | null = null;

  function chromeOpen(): boolean {
    return !root.hidden;
  }

  function syncChrome() {
    hooks.onChromeChange(chromeOpen());
  }

  function showRoot(show: boolean) {
    root.hidden = !show;
    syncChrome();
  }

  function running(): boolean {
    return busy && stage !== "complete";
  }

  function setExpanded(next: boolean) {
    expanded = next;
    card.hidden = !next;
    root.classList.toggle("qb--expanded", next && busy);
    toggleBtn.setAttribute("aria-expanded", String(next));
  }

  function renderStage() {
    if (!stage) return;
    stripStatus.textContent = STAGE_LABEL[stage];
    abortBtn.textContent = stage === "complete" ? "关闭" : "中断";
    root.classList.toggle("qb--done", stage === "complete");
    root.dataset.stage = stage;
  }

  function renderElapsed() {
    const sec = Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
    elapsedEl.textContent = `${sec}s`;
  }

  function clearTimers() {
    if (tickTimer) window.clearInterval(tickTimer);
    if (stageTimer) window.clearTimeout(stageTimer);
    tickTimer = 0;
    stageTimer = 0;
  }

  function resetIdle() {
    gen += 1;
    cancelRun = null;
    clearTimers();
    busy = false;
    stage = null;
    settled = false;
    reply = "";
    setReply("");
    setChain(null);
    panel.hidden = true;
    card.hidden = true;
    promptForm.hidden = true;
    root.classList.remove("qb--expanded", "qb--done", "qb--focus", "qb--error");
    delete root.dataset.stage;
    showRoot(false);
  }

  function setReply(text: string) {
    if (!replyEl) return;
    replyEl.textContent = text;
    replyEl.hidden = text.length === 0;
  }

  function setChain(html: string | null) {
    if (!chainEl) return;
    if (!html) {
      chainEl.innerHTML = "";
      chainEl.hidden = true;
      return;
    }
    chainEl.innerHTML = html;
    chainEl.hidden = false;
  }

  function setStatus(label: string, done: boolean) {
    stripStatus.textContent = label;
    abortBtn.textContent = done ? "关闭" : "中断";
    const failed = label === "出错了" || label === "Need Credit";
    root.classList.toggle("qb--done", done && !failed);
    root.classList.toggle("qb--error", failed);
    if (!done) return;
    stage = "complete";
    if (tickTimer) window.clearInterval(tickTimer);
    tickTimer = 0;
    setExpanded(true);
  }

  function onAgentEvent(ev: AgentEvent) {
    if (ev.type === "need_credit") {
      settled = true;
      hooks.openDetails("wallet");
      resetIdle();
      return;
    }
    if (ev.type === "tx_status") {
      const label =
        ev.message?.content === "awaiting_wallet"
          ? "等待钱包签名"
          : ev.message?.content === "pending"
            ? "交易确认中"
            : ev.message?.content === "settling"
              ? "结算中"
              : null;
      if (label) setStatus(label, false);
      return;
    }
    if (ev.type === "credit_settled" && ev.credit) {
      const c = ev.credit;
      const short = c.taskId.slice(0, 10);
      const link = c.explorerUrl
        ? ` · <a href="${c.explorerUrl}" target="_blank" rel="noreferrer">Explorer</a>`
        : "";
      setChain(
        `Task ${short}… · Credit ${c.estimate}→${c.actual}` +
          (c.refund ? ` · 退回 ${c.refund}` : "") +
          link,
      );
      return;
    }
    if (ev.type === "tool_execution_start") {
      setStatus(TOOL_STATUS[ev.tool_name ?? ""] ?? "处理中", false);
      return;
    }
    if (ev.type === "message_end" && ev.message?.role === "assistant" && ev.message.content) {
      reply = ev.message.content;
      setReply(reply);
      return;
    }
    if (ev.type === "agent_end") {
      if (ev.error) setReply(ev.error);
      return;
    }
  }

  function advanceStage(index: number) {
    if (!busy) return;
    const next = STAGES[index];
    if (!next) return;
    stage = next;
    renderStage();
    if (next === "complete") {
      if (stageTimer) window.clearTimeout(stageTimer);
      stageTimer = 0;
      setExpanded(true);
      return;
    }
    stageTimer = window.setTimeout(() => advanceStage(index + 1), STAGE_MS);
  }

  function startTask(prompt: string) {
    clearTimers();
    busy = true;
    settled = false;
    reply = "";
    setReply("");
    setChain(null);
    startedAt = performance.now();
    promptLine.textContent = prompt;
    promptForm.hidden = true;
    panel.hidden = false;
    showRoot(true);
    setExpanded(false);
    renderElapsed();
    tickTimer = window.setInterval(renderElapsed, 1000);
    if (!hooks.run) {
      advanceStage(0);
      return;
    }
    const my = gen;
    setStatus("思考中", false);
    const handle = hooks.run(prompt, (ev) => {
      if (my !== gen) return;
      onAgentEvent(ev);
    });
    cancelRun = handle.cancel;
    void handle.done.then(
      () => {
        if (my !== gen || settled) return;
        settled = true;
        setStatus("任务已完成", true);
        if (reply) setReply(reply);
      },
      (err: unknown) => {
        if (my !== gen || settled) return;
        settled = true;
        setStatus("出错了", true);
        setReply(errText(err));
      },
    );
  }

  function openPrompt() {
    if (running()) {
      focusStrip();
      return;
    }
    if (busy) resetIdle();
    showRoot(true);
    panel.hidden = true;
    promptForm.hidden = false;
    root.classList.remove("qb--expanded", "qb--done");
    delete root.dataset.stage;
    promptInput.value = "";
    requestAnimationFrame(() => promptInput.focus());
  }

  function focusStrip() {
    if (!running()) return;
    showRoot(true);
    panel.hidden = false;
    setExpanded(true);
    root.classList.remove("qb--focus");
    void root.offsetWidth;
    root.classList.add("qb--focus");
    if (focusTimer) window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => root.classList.remove("qb--focus"), 700);
  }

  function closePrompt() {
    if (running()) return;
    resetIdle();
  }

  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = promptInput.value.trim();
    if (!text || busy) return;
    startTask(text);
  });

  toggleBtn.addEventListener("click", () => {
    if (!busy) return;
    setExpanded(!expanded);
  });

  abortBtn.addEventListener("click", () => {
    if (!busy) return;
    if (stage === "complete") {
      resetIdle();
      return;
    }
    setStatus("结算中", false);
    cancelRun?.();
  });

  detailsBtn.addEventListener("click", () => {
    hooks.openDetails("chat");
    if (stage === "complete") resetIdle();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!promptForm.hidden) {
      closePrompt();
      return;
    }
    if (stage === "complete") {
      resetIdle();
      return;
    }
    if (busy && expanded) setExpanded(false);
  });

  return {
    isBusy: running,
    isChromeOpen: chromeOpen,
    hitTest(clientX, clientY) {
      if (root.hidden) return false;
      const el = document.elementFromPoint(clientX, clientY);
      return !!el?.closest("#quickbar");
    },
    openPrompt,
    focusStrip,
    closePrompt,
  };
}

function errText(err: unknown): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  return "Agent 启动失败";
}

function must<T extends HTMLElement = HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`${sel} missing`);
  return el;
}
