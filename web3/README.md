# Sealoo Web3 (Avalanche Fuji)

Contracts for on-chain identity + prepaid Credit. **Fuji only** (chainId `43113`).

## Contracts

- `AgentRegistry` — `mint` / `ownerOf` / `getAgent`
- `WorkCredit` — `purchase` / `lock` / `settle` (faucet `purchase` on Fuji)

## Commands

```bash
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url fuji --broadcast
```

Copy logged addresses into `deployments/fuji.json` and `app/src/web3/fuji.json`.

Requires `.env`: `PRIVATE_KEY`, `FUJI_RPC` (see `.env.example`).
