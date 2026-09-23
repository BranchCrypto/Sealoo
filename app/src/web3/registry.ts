import { encodeFunctionData, type Address, type Hash } from "viem";
import { agentRegistryAbi } from "./abi";
import { AGENT_REGISTRY, contractsReady } from "./chain";
import { publicClient, sendContractTx, type TxStatus } from "./wallet";

function requireRegistry(): Address {
  if (!contractsReady()) throw new Error("合约尚未部署：请更新 fuji.json 中的 agentRegistry 地址");
  return AGENT_REGISTRY;
}

export async function agentsOf(owner: Address): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address: requireRegistry(),
    abi: agentRegistryAbi,
    functionName: "agentsOf",
    args: [owner],
  });
}

export async function mint(
  account: Address,
  metadata: string,
  onStatus: (s: TxStatus) => void,
): Promise<Hash> {
  const data = encodeFunctionData({
    abi: agentRegistryAbi,
    functionName: "mint",
    args: [metadata],
  });
  return sendContractTx(account, data, requireRegistry(), onStatus);
}

export async function primaryAgentId(owner: Address): Promise<bigint | null> {
  const ids = await agentsOf(owner);
  return ids.length ? ids[0]! : null;
}
