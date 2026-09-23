import fuji from "./fuji.json";

export const FUJI_CHAIN_ID = 43113;
export const FUJI_CHAIN_ID_HEX = "0xa869";
export const FUJI_RPC = fuji.rpc as string;
export const EXPLORER_TX = fuji.explorerTx as string;
export const AGENT_REGISTRY = fuji.agentRegistry as `0x${string}`;
export const WORK_CREDIT = fuji.workCredit as `0x${string}`;

export const CORE_INSTALL = "https://build.avax.network/integrations";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_TX}${hash}`;
}

export function contractsReady(): boolean {
  return (
    AGENT_REGISTRY !== "0x0000000000000000000000000000000000000000" &&
    WORK_CREDIT !== "0x0000000000000000000000000000000000000000"
  );
}
