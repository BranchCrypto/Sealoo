import type { Address, Hex } from "viem";
import { LLM_GATEWAY } from "./chain";
import { signMessage } from "./wallet";

export function gatewayOrigin(): string {
  const raw = LLM_GATEWAY.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "").replace(/\/v1$/i, "");
}

export function gatewayOpenAIBase(): string {
  const origin = gatewayOrigin();
  return origin ? `${origin}/v1` : "";
}

type GatewayErr = { error?: { message?: string } };

async function readJSON(res: Response): Promise<Record<string, unknown> & GatewayErr> {
  return (await res.json()) as Record<string, unknown> & GatewayErr;
}

export async function issueTicket(account: Address, taskId: Hex): Promise<string> {
  const origin = gatewayOrigin();
  if (!origin) {
    throw new Error("未配置 LLM 网关：请在 fuji.json 填写 llmGateway");
  }
  const q = new URLSearchParams({ address: account, taskId });
  const challengeRes = await fetch(`${origin}/v1/challenge?${q}`);
  const challenge = await readJSON(challengeRes);
  if (!challengeRes.ok) {
    throw new Error(challenge.error?.message || "网关 challenge 失败");
  }
  const message = String(challenge.message ?? "");
  if (!message) throw new Error("网关未返回签名原文");
  const signature = await signMessage(account, message);
  const ticketRes = await fetch(`${origin}/v1/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: account, taskId, signature }),
  });
  const issued = await readJSON(ticketRes);
  if (!ticketRes.ok) {
    throw new Error(issued.error?.message || "网关拒绝发票：请确认已 lock Credit");
  }
  const token = String(issued.token ?? "");
  if (!token) throw new Error("网关未返回 ticket");
  return token;
}

export async function ticketUsage(token: string): Promise<number | null> {
  const origin = gatewayOrigin();
  if (!origin || !token) return null;
  const res = await fetch(`${origin}/v1/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await readJSON(res);
  return typeof json.total_tokens === "number" ? json.total_tokens : null;
}
