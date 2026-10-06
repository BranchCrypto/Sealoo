import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { CORE_INSTALL, FUJI_CHAIN_ID, FUJI_CHAIN_ID_HEX, FUJI_RPC } from "./chain";

export type TxStatus = "idle" | "awaiting_wallet" | "pending" | "confirmed" | "failed";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getProvider(): EthereumProvider | null {
  return window.ethereum ?? null;
}

export function noWalletMessage(): string {
  return `未检测到钱包。请安装 Avalanche Core 或 MetaMask，并确保本窗口可访问注入的 provider。\n${CORE_INSTALL}`;
}

export async function signMessage(account: Address, message: string): Promise<Hex> {
  const wc = walletClient();
  return wc.signMessage({ account, message });
}

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(FUJI_RPC),
});

export async function connect(): Promise<Address> {
  const provider = getProvider();
  if (!provider) throw new Error(noWalletMessage());
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0] as Address | undefined;
  if (!account) throw new Error("钱包未返回账户");
  await switchToFuji();
  return account;
}

export async function getAccount(): Promise<Address | null> {
  const provider = getProvider();
  if (!provider) return null;
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  return (accounts[0] as Address | undefined) ?? null;
}

export async function switchToFuji(): Promise<void> {
  const provider = getProvider();
  if (!provider) throw new Error(noWalletMessage());
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FUJI_CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: FUJI_CHAIN_ID_HEX,
          chainName: "Avalanche Fuji C-Chain",
          nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
          rpcUrls: [FUJI_RPC],
          blockExplorerUrls: ["https://testnet.snowtrace.io"],
        },
      ],
    });
  }
  const id = Number(
    await provider.request({ method: "eth_chainId" }),
  );
  if (id !== FUJI_CHAIN_ID) throw new Error("请切换到 Avalanche Fuji (43113)");
}

export function walletClient() {
  const provider = getProvider();
  if (!provider) throw new Error(noWalletMessage());
  return createWalletClient({
    chain: avalancheFuji,
    transport: custom(provider),
  });
}

export async function sendContractTx(
  account: Address,
  data: Hex,
  to: Address,
  onStatus: (s: TxStatus) => void,
): Promise<Hash> {
  onStatus("awaiting_wallet");
  const wc = walletClient();
  let hash: Hash;
  try {
    hash = await wc.sendTransaction({ account, to, data, chain: avalancheFuji });
  } catch (e) {
    onStatus("failed");
    throw e;
  }
  onStatus("pending");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    onStatus("failed");
    throw new Error("交易失败");
  }
  onStatus("confirmed");
  return hash;
}

export async function getAvaxBalance(address: Address): Promise<string> {
  const wei = await publicClient.getBalance({ address });
  const whole = Number(wei) / 1e18;
  return whole.toFixed(4);
}
