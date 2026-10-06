/** Shared Tauri agent invoke for pet quickbar + home chat. */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  runPrepaidTask,
  type SettledInfo,
  type TaskAgentEvent,
  type TaskAgentRun,
  type TaskRunHooks,
  type AgentGatewayAuth,
} from "./web3";

export type UiAgentEvent = TaskAgentEvent & {
  credit?: {
    estimate: number;
    actual: number;
    refund: number;
    taskId: string;
    explorerUrl?: string;
  };
};

export function runAgentViaTauri(
  prompt: string,
  maxCredit: number,
  onEvent: (ev: TaskAgentEvent) => void,
  auth: AgentGatewayAuth,
): TaskAgentRun {
  let unlisten: UnlistenFn | undefined;
  const done = (async () => {
    unlisten = await listen<TaskAgentEvent>("agent-event", (e) => onEvent(e.payload));
    await invoke("agent_prompt", {
      prompt,
      maxCredit,
      gatewayUrl: auth.gatewayUrl,
      ticket: auth.ticket,
    });
  })();
  return {
    cancel() {
      void invoke("agent_abort");
    },
    done: done.finally(() => {
      unlisten?.();
    }),
  };
}

export function runUiPrepaidTask(
  prompt: string,
  onEvent: (ev: UiAgentEvent) => void,
): TaskAgentRun {
  return runPrepaidTask(prompt, {
    onEvent,
    onStatus(s) {
      if (s === "awaiting_wallet" || s === "pending") {
        onEvent({ type: "tx_status", message: { content: s } });
      }
    },
    onNeedCredit(msg) {
      onEvent({ type: "need_credit", error: msg });
    },
    onSettled(info: SettledInfo) {
      onEvent({
        type: "credit_settled",
        credit: {
          estimate: info.estimateCredit,
          actual: info.actualCredit,
          refund: info.refund,
          taskId: info.taskId,
          explorerUrl: info.explorerUrl,
        },
      });
    },
    runAgent: runAgentViaTauri,
  } satisfies TaskRunHooks);
}
