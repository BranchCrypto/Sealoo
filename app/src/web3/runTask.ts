import type { Hash, Hex } from "viem";
import * as credit from "./credit";
import { explorerTxUrl } from "./chain";
import { contractsReady } from "./chain";
import {
  actualCredit,
  estimateCredit,
  loadPendingSettle,
  newTaskId,
  savePendingSettle,
  type PendingSettle,
} from "./task";
import { getAccount, type TxStatus } from "./wallet";

export type TaskAgentEvent = {
  type: string;
  tool_name?: string;
  error?: string;
  message?: { role?: string; content?: string };
  usage?: { total_tokens?: number };
};

export type TaskAgentRun = {
  cancel: () => void;
  done: Promise<void>;
};

export type SettledInfo = {
  taskId: Hex;
  estimateCredit: number;
  actualCredit: number;
  refund: number;
  lockTx?: string;
  settleTx?: string;
  explorerUrl?: string;
};

export type TaskRunHooks = {
  onEvent: (ev: TaskAgentEvent) => void;
  onStatus: (s: TxStatus) => void;
  onNeedCredit: (msg: string) => void;
  onSettled: (info: SettledInfo) => void;
  runAgent: (
    prompt: string,
    maxCredit: number,
    onEvent: (ev: TaskAgentEvent) => void,
  ) => TaskAgentRun;
};

const ZERO =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export async function recoverPendingSettle(
  onStatus: (s: TxStatus) => void,
): Promise<Hash | null> {
  const pending = loadPendingSettle();
  if (!pending || !contractsReady()) return null;
  const account = await getAccount();
  if (!account) return null;
  const open = await credit.openTask(account);
  if (open === ZERO) {
    savePendingSettle(null);
    return null;
  }
  if (open.toLowerCase() !== pending.taskId.toLowerCase()) return null;
  const actual = BigInt(actualCredit(pending.actualTokens, pending.estimateCredit));
  const hash = await credit.settle(account, pending.taskId, actual, onStatus);
  savePendingSettle(null);
  return hash;
}

/** Prepaid flow: estimate → lock → agent → settle (cancel/fail still settle). */
export function runPrepaidTask(prompt: string, hooks: TaskRunHooks): TaskAgentRun {
  let agentCancel: (() => void) | null = null;
  let actualTokens = 0;

  const done = (async () => {
    if (!contractsReady()) {
      throw new Error("合约尚未部署到 Fuji：请填写 fuji.json 地址后重试");
    }

    const account = await getAccount();
    if (!account) {
      hooks.onNeedCredit("请先连接钱包，再让 Sealoo 干活。");
      return;
    }

    if (loadPendingSettle()) {
      await recoverPendingSettle(hooks.onStatus);
    }
    const open = await credit.openTask(account);
    if (open !== ZERO) {
      throw new Error("有未结算任务，请先在主界面补结算后再开新任务");
    }

    const { credit: estCredit } = estimateCredit(prompt);
    const available = await credit.balanceOf(account);
    if (available < BigInt(estCredit)) {
      hooks.onNeedCredit("额度不够，先去钱包喂鱼再继续。");
      return;
    }

    const taskId = newTaskId(account);
    const lockTx = await credit.lock(account, taskId, BigInt(estCredit), hooks.onStatus);
    const pendingRec: PendingSettle = {
      taskId,
      estimateCredit: estCredit,
      actualTokens: 0,
      lockTx,
    };
    savePendingSettle(pendingRec);

    const agent = hooks.runAgent(prompt, estCredit, (ev) => {
      if (ev.usage?.total_tokens != null) {
        if (ev.type === "agent_end") {
          actualTokens = ev.usage.total_tokens;
        } else if (ev.type === "message_end") {
          actualTokens += ev.usage.total_tokens;
        }
        pendingRec.actualTokens = actualTokens;
        savePendingSettle(pendingRec);
      }
      hooks.onEvent(ev);
    });
    agentCancel = agent.cancel;
    try {
      await agent.done;
    } catch {
      // still settle
    }
    agentCancel = null;

    const actual = actualCredit(actualTokens, estCredit);
    pendingRec.actualTokens = actualTokens;
    savePendingSettle(pendingRec);
    hooks.onEvent({ type: "tx_status", message: { content: "settling" } });
    const settleTx = await credit.settle(account, taskId, BigInt(actual), hooks.onStatus);
    savePendingSettle(null);
    hooks.onSettled({
      taskId,
      estimateCredit: estCredit,
      actualCredit: actual,
      refund: estCredit - actual,
      lockTx,
      settleTx,
      explorerUrl: explorerTxUrl(settleTx),
    });
  })();

  return {
    cancel() {
      agentCancel?.();
    },
    done,
  };
}
