import { keccak256, stringToHex, type Hex } from "viem";

export const TOKENS_PER_CREDIT = 1000;

/** Same formula as agent/runtime CreditFromTokens. */
export function creditFromTokens(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / TOKENS_PER_CREDIT);
}

/** Docs templates: chat 800 / search 2500 / report 4500 + prompt + ~15% margin. */
export function estimateTokens(prompt: string): number {
  const promptTokens = Math.floor((prompt.length + 3) / 4);
  const p = prompt.toLowerCase();
  let base = 800;
  if (/报告|研究|markdown|\.md|report|research|写一份|生成一份/.test(p)) base = 4500;
  else if (/搜索|查一下|search|http|网页|阅读|总结|avalanche|c-chain/.test(p)) base = 2500;
  const raw = base + Math.max(promptTokens, prompt.length > 0 ? 1 : 0);
  return Math.ceil(raw * 1.15);
}

export type TaskRecord = {
  taskId: string;
  prompt: string;
  estimateCredit: number;
  actualCredit: number;
  refund: number;
  explorerUrl?: string;
  at: number;
};

const HISTORY_KEY = "sealoo.taskHistory";
const HISTORY_MAX = 40;

export function loadHistory(): TaskRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as TaskRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushHistory(rec: TaskRecord): void {
  const next = [rec, ...loadHistory().filter((r) => r.taskId !== rec.taskId)].slice(
    0,
    HISTORY_MAX,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function estimateCredit(prompt: string): { tokens: number; credit: number } {
  const tokens = estimateTokens(prompt);
  return { tokens, credit: creditFromTokens(tokens) };
}

export function actualCredit(tokens: number, estimate: number): number {
  return Math.min(creditFromTokens(tokens), estimate);
}

let seq = 0;

export function newTaskId(owner: string): Hex {
  seq += 1;
  return keccak256(stringToHex(`${owner}:${Date.now()}:${seq}`));
}

export type PendingSettle = {
  taskId: Hex;
  estimateCredit: number;
  actualTokens: number;
  lockTx?: string;
  settleTx?: string;
};

const PENDING_KEY = "sealoo.pendingSettle";

export function loadPendingSettle(): PendingSettle | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSettle;
  } catch {
    return null;
  }
}

export function savePendingSettle(p: PendingSettle | null): void {
  if (!p) {
    localStorage.removeItem(PENDING_KEY);
    return;
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}
