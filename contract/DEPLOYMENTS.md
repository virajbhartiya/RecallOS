# Contract Deployments

This file tracks all contract deployments across different networks.

## Sepolia Testnet

### Latest Deployment - October 21, 2025

**Network:** Sepolia (Chain ID: 11155111)

**Contract Addresses:**
- Proxy (Main Contract): `0xde662d9c6a0bb41ad82b3550177feaf4e43bd602`
- Implementation: `0x35af2cae8c7788e58dcf81b4d8637e54073cc6bc`
- Proxy Admin: `0xB5f1377433865BE245586997A7042c564926b2e9`
- Contract Owner: `0x01b7b2bC30c958bA3bC0852bF1BD4efB165281Ba`

**Deployment Details:**
- Deployment Date: October 21, 2025
- Deployer: `0x01b7b2bc30c958ba3bc0852bf1bd4efb165281ba`
- RPC URL: https://eth-sepolia.public.blastapi.io
- Block Explorer: https://sepolia.etherscan.io/address/0xde662d9c6a0bb41ad82b3550177feaf4e43bd602

**Notes:**
- This is a UUPS proxy deployment
- The proxy address is the main contract address to use in applications
- Implementation can be upgraded by the proxy admin

---

## Mainnet

_No mainnet deployment yet_

---

## Optimism Mainnet

_No OP mainnet deployment yet_

---

## How to Use

When integrating with the contract, always use the **Proxy Address** as your contract address. This ensures that future upgrades work seamlessly without requiring changes to your integration.

### Environment Variable Setup

Add this to your `.env` file:

```bash
MEMORY_REGISTRY_CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602
```

### Verifying the Contract

To verify the deployment on Etherscan:

```bash
npm run verify:sepolia
```

### Upgrading the Contract

To upgrade to a new implementation:

```bash
CONTRACT_ADDRESS=0xde662d9c6a0bb41ad82b3550177feaf4e43bd602 npm run upgrade:sepolia
```

