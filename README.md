# SelectorClash — Function Selector Collision Detector

> **Algorithmic 4-Byte Function Selector Collision Detection & On-Chain Verification Registry for Modular and Upgradeable EVM Architectures on Botchain Testnet.**

[![Network: Botchain Testnet](https://img.shields.io/badge/Network-Botchain%20Testnet%20(968)-zinc?style=flat-square&logo=ethereum)](https://scan.bohr.life)
[![Contract](https://img.shields.io/badge/Contract-0xce4f...fee8-emerald?style=flat-square)](https://scan.bohr.life/address/0xce4fe8e5d4f41df7adde93ec32b251ba0189fee8)
[![Fee Policy](https://img.shields.io/badge/Fee%20Policy-Gas%20Fee%20Only%20(BOT)-zinc?style=flat-square)](https://scan.bohr.life)
[![License: MIT](https://img.shields.io/badge/License-MIT-zinc?style=flat-square)](LICENSE)

---

## Overview

In the Ethereum Virtual Machine (EVM), smart contract execution routes function calls using a **4-byte identifier** derived from the Keccak-256 hash of the function signature: `bytes4(keccak256("transfer(address,uint256)"))`.

Because a 4-byte selector provides only 32 bits of entropy ($2^{32} \approx 4.29 \times 10^9$ possibilities), distinct signatures can calculate to the exact same 4-byte hash (a **Function Selector Collision**).

While monolithic contracts prevent duplicate names at compile time, modern upgradeable and modular contracts are vulnerable:
- **ERC-1967 Transparent Proxies**: An implementation function can collide with an administrative function (e.g. `upgradeTo`, `admin`, `proxy_owner`), allowing callers or admins to unintentionally trigger proxy administrative logic rather than implementation code (the **Tincho attack vector**).
- **ERC-2535 Diamond Multi-Facet Systems**: Independent facet contracts can contain overlapping selectors, silently overriding routing tables during `diamondCut`.

**SelectorClash** eliminates this attack surface by providing pre-deployment static analysis, live on-chain storage and Loupe inspection on **Botchain Testnet**, and a decentralized, **Gas Fee Only** verification registry.

---

## Live Deployment (Botchain Testnet)

The core verification contract [`SelectorClashRegistry.sol`](./contracts/SelectorClashRegistry.sol) is live on **Botchain Testnet (Chain ID: 968)**:

| Property | Value |
|:---|:---|
| **Contract Address** | [`0xce4fe8e5d4f41df7adde93ec32b251ba0189fee8`](https://scan.bohr.life/address/0xce4fe8e5d4f41df7adde93ec32b251ba0189fee8) |
| **Deployment Tx Hash** | [`0x70e5ab8fc323d7bc777a9b84d8b27ef70e88100d6f515f2f2979c967128702cd`](https://scan.bohr.life/tx/0x70e5ab8fc323d7bc777a9b84d8b27ef70e88100d6f515f2f2979c967128702cd) |
| **Chain ID** | `968` |
| **Network Name** | Botchain Testnet (Bohr) |
| **RPC Endpoint** | `https://rpc.bohr.life` |
| **Block Explorer** | [https://scan.bohr.life](https://scan.bohr.life) |
| **Native Gas Token** | `BOT` (18 Decimals) |
| **Fee Policy** | **Gas Fee Only** (`msg.value == 0`, zero protocol surcharges) |

---

## Key Features

### 1. 🔍 ABI & Selector Analyzer
- Extracts 4-byte selectors from raw Solidity JSON ABIs or human-readable signature strings.
- Strictly normalizes signatures to canonical EVM ABI format (e.g. `uint` $\rightarrow$ `uint256`, recursive tuples, multidimensional arrays, stripped whitespace).
- Detects intra-contract selector collisions.
- **Multi-Facet / Diamond Diff**: Compare two or more facet ABIs side-by-side before deployment to ensure clean separation of routing.
- **Proxy Clashing Detection**: Cross-checks implementation functions against standard ERC-1967 / UUPS reserved selectors (`upgradeTo`, `admin`, `changeAdmin`, `proxy_owner`, etc.).

### 2. 💎 ERC-2535 Diamond Loupe Inspector
- Connects directly to **Botchain Testnet** via RPC (`https://rpc.bohr.life`).
- Queries `IDiamondLoupe.facets()` on any live Diamond contract address.
- Inspects facet routing tables and flags active selector overlaps across facets.

### 3. 🛡️ ERC-1967 Proxy Dispatcher Checker
- Reads live storage slots directly on Botchain Testnet:
  - **Implementation Slot**: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
  - **Admin Slot**: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
  - **Beacon Slot**: `0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50`
- Detects whether the implementation contains clashing administrative methods.

### 4. 📜 On-Chain Verification Registry (`SelectorClashRegistry.sol`)
- **Gas Fee Only**: All contract interactions cost **network gas in BOT only**. Zero platform fees, developer taxes, or hidden paywalls.
- **Record Audits**: Store permanent, timestamped cryptographic collision proofs on-chain.
- **Community Collision Reporting**: Submit discovered selector collisions directly to the decentralized registry.

### 5. 📚 Collision Database & Keccak Calculator
- Catalog of famous historical collision vectors (Tincho proxy collision, ERC-20 approval overlap, Poly Network dispatcher hijack).
- Real-time Keccak-256 calculator to test arbitrary function signatures and inspect 4-byte selectors instantly.

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│               SelectorClash Web3 Interface             │
│   (Next.js 14 App Router • React 18 • Black & Gray)    │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │   Viem / Wagmi  │      │  Reown AppKit   │
       │   (Injected)    │      │ (WalletConnect) │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                └───────────┬────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Botchain Testnet (968)  │
              │   RPC: rpc.bohr.life      │
              │   Token: BOT              │
              └─────────────┬─────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
│  EIP-1967   │      │  ERC-2535   │      │ Selector-   │
│   Storage   │      │   Diamond   │      │ Clash-      │
│    Slots    │      │    Loupe    │      │ Registry    │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## Tech Stack

- **Smart Contract**: Solidity `0.8.24` (Cancun EVM target), compiled with native solc.
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript.
- **Web3 Integration**: Viem v2, Wagmi v2, `@reown/appkit`, `@reown/appkit-adapter-wagmi`.
- **Styling**: Tailwind CSS (Strict minimalist black-and-gray zinc aesthetic, monospace typography).
- **Icons**: Lucide React.

---

## Getting Started

### Prerequisites
- Node.js $\ge$ 18.17.0
- npm $\ge$ 9.0.0
- Web3 Wallet (MetaMask, Rabby, or WalletConnect-compatible wallet) configured for **Botchain Testnet**:
  - **RPC URL**: `https://rpc.bohr.life`
  - **Chain ID**: `968`
  - **Symbol**: `BOT`
  - **Explorer**: `https://scan.bohr.life`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/webtrovert0x/selectorClash.git
cd selectorClash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Reown AppKit Project ID (from https://cloud.reown.com)
REOWN_ID=your_reown_project_id

# Botchain Testnet Private Key for Contract Deployment
PRIVATE_KEY=your_private_key_here

# Deployed SelectorClashRegistry Contract Address on Botchain Testnet
SELECTOR_CLASH_REGISTRY_ADDRESS=0xce4fe8e5d4f41df7adde93ec32b251ba0189fee8
```

> **Security Note**: `REOWN_ID` and `PRIVATE_KEY` are kept strictly private on the server side in `.env` and are never exposed in public build bundles.

### 3. Smart Contract Compilation & Deployment
To recompile or redeploy `SelectorClashRegistry.sol`:
```bash
# Compile contract using native Solc
npm run compile:contract

# Deploy to Botchain Testnet (Chain ID 968) using Viem
npm run deploy:contract
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## Smart Contract: `SelectorClashRegistry.sol`

The deployed contract implements:
- `recordAudit`: Records verified audit results with ABI hash, architecture type, collision flags, and colliding selectors.
- `reportCollision`: Community reporting function to log confirmed 4-byte selector collision pairs.
- `getRecentAudits`: Paginated view of recent audit records.
- `getRecentReports`: Paginated view of recent collision reports.
- **Gas Fee Only**: All state-modifying functions are non-payable. Interactions require network gas in `BOT` only.

---

## Documentation

For a comprehensive technical analysis of EVM 4-byte truncation, the Birthday Paradox mathematical bounds, and the Tincho Transparent Proxy attack vector, see:
📄 **[WHITEPAPER.md](./WHITEPAPER.md)**

---

## License

This project is licensed under the [MIT License](./LICENSE).
