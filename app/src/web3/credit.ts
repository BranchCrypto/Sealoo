import { encodeFunctionData, type Address, type Hash, type Hex } from "viem";
import { workCreditAbi } from "./abi";
import { WORK_CREDIT, contractsReady } from "./chain";
import { publicClient, sendContractTx, type TxStatus } from "./wallet";

function requireCredit(): Address {
  if (!contractsReady()) throw new Error("合约尚未部署：请更新 fuji.json 中的 workCredit 地址");
  return WORK_CREDIT;
}

export async function balanceOf(owner: Address): Promise<bigint> {
  return publicClient.readContract({
    address: requireCredit(),
    abi: workCreditAbi,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function lockedOf(owner: Address): Promise<bigint> {
  return publicClient.readContract({
    address: requireCredit(),
    abi: workCreditAbi,
    functionName: "lockedOf",
    args: [owner],
  });
}

export async function openTask(owner: Address): Promise<Hex> {
  return publicClient.readContract({
    address: requireCredit(),
    abi: workCreditAbi,
    functionName: "openTask",
    args: [owner],
  });
}

export async function purchase(
  account: Address,
  amount: bigint,
  onStatus: (s: TxStatus) => void,
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: workCreditAbi,
    functionName: "purchase",
    args: [amount],
  });
  return sendContractTx(account, data, requireCredit(), onStatus);
}

export async function lock(
  account: Address,
  taskId: Hex,
  estimate: bigint,
  onStatus: (s: TxStatus) => void,
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: workCreditAbi,
    functionName: "lock",
    args: [taskId, estimate],
  });
  return sendContractTx(account, data, requireCredit(), onStatus);
}

export async function settle(
  account: Address,
  taskId: Hex,
  actual: bigint,
  onStatus: (s: TxStatus) => void,
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: workCreditAbi,
    functionName: "settle",
    args: [taskId, actual],
  });
  return sendContractTx(account, data, requireCredit(), onStatus);
}
