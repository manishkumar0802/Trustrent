<div align="center">

# 🔐 TrustRent

**Your deposit. Locked fairly. Released transparently.**

A decentralized rental escrow & dispute resolution platform built on Stellar Soroban.

[![CI](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml/badge.svg)](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT%20%2F%20Apache--2.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Rust](https://img.shields.io/badge/rust-1.97-orange)
![Stellar](https://img.shields.io/badge/stellar-soroban%2022-purple)

by **[@manishkumar0802](https://github.com/manishkumar0802)**

[Getting Started](#-getting-started) · [Screenshots](#-screenshots) · [Demo](#-live-demo) · [Architecture](#-architecture) · [Smart Contracts](#-smart-contracts)

</div>

---
### TrustRent Live Demo Link
https://trustrent-lac.vercel.app/

## Why TrustRent?

When someone rents a house, the security deposit sits in the landlord's pocket. If the tenant damages something — fair deduction. But if the landlord just... keeps it? Not much recourse.

TrustRent moves deposits out of anyone's pocket and into a smart contract. Both sides agree to the terms. Every action is recorded on-chain. If things go well, the deposit returns automatically. If there's a dispute, an arbitrator decides with full evidence.

**No trust required — just code.**

---


> 💡 **Want to capture your own screenshots?** Start the app with `npm run dev`, open `http://localhost:3000`, and grab the pages. Save them as PNGs in the `screenshots/` folder and they'll show up here.

---

### Public GitHub repository
https://github.com/manishkumar0802/Trustrent

### Transaction hash for contract interaction
a655fe2659172edb53c3e74d0f1e89d2d33026426998c5155cc27b59c10beee3

###  Contract deployment address
NEXT_PUBLIC_AGREEMENT_CONTRACT_ID=CC3NX7ZRDDW3V4M25XKVIWXMDR6RBKOB3MRQYMEU54AIMO57EL3DI72D
NEXT_PUBLIC_ESCROW_CONTRACT_ID=CBYIYJAOVPFXIWOUKSEKGHN4IN2V5QYHFMVY3XJDSPU4FPE6W7QWMBNV
NEXT_PUBLIC_DISPUTE_CONTRACT_ID=CDJQKL7DPAXU4JKOE4PU2VHE6625BK3KO57LARROKQ4YBDTT4RIPNXP6

###  Mobile Responsive UI

<div align="center">
  <img width="897" height="733" alt="WhatsApp Image 2026-08-22 at 19 35 28" src="https://github.com/user-attachments/assets/480d4926-96bf-491f-857f-7077546e5ae6" />


### CI/CD pipeline running

<div align="center">
  <img width="1566" height="872" alt="WhatsApp Image 2026-08-22 at 19 40 16" src="https://github.com/user-attachments/assets/e1768775-ccba-4d7c-b768-9f8f2e69e4c5" />


### Test output with 3+ passing tests

<div align="center">
  <img width="1449" height="954" alt="WhatsApp Image 2026-08-22 at 19 31 27" src="https://github.com/user-attachments/assets/54e74534-4777-4006-a780-2bc01d481b25" />



## 🎯 Live Demo

| | Link |
|:---:|---|
| 🌐 **Live App** | [[trustrent.vercel.app](https://trustrent.vercel.app](https://trustrent-lac.vercel.app/) |
| 📺 **Demo Video** | [YouTube — 2 min walkthrough](https://youtu.be/AiXMuUB1K-Q) |
---

## 🚀 Tech Stack

| Layer | Tech | What it does |
|---|---|---|
| Smart Contracts | **Rust** + Soroban SDK 22 | 4 on-chain contracts — agreement, escrow, dispute, registry |
| Frontend | **Next.js 16** + React 19 + Tailwind v4 | Dashboard, agreement & dispute flows |
| API | **Fastify** + TypeScript | Health endpoint, mock agreement service |
| Shared | **TypeScript** packages | Domain types, lifecycle helpers, blockchain client |
| CI/CD | **GitHub Actions** | Contracts + web + API pipelines |
| Network | **Stellar Testnet** | Development & testing |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUSTRENT ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   HTTP    ┌──────────────┐                │
│  │  apps/web    │ ────────► │  apps/api    │                │
│  │  Next.js     │           │  Fastify     │                │
│  └──────┬───────┘           └──────┬───────┘                │
│         │                          │                        │
│         ▼                          ▼                        │
│  ┌──────────────────────────────────────────┐               │
│  │         packages/blockchain              │               │
│  │    TrustRentClient (@stellar/stellar-sdk)│               │
│  └──────────────────┬───────────────────────┘               │
│                     │ Soroban RPC                           │
│                     ▼                                       │
│  ┌──────────────────────────────────────────┐               │
│  │          SOROBAN CONTRACTS               │               │
│  │                                          │               │
│  │  ┌─────────────────┐   ┌──────────┐      │               │
│  │  │ Rental Agreement │──►│  Escrow  │     │               │
│  │  │ (orchestrator)   │◄──│ (vault)  │     │               │
│  │  └────────┬─────────┘   └────┬─────┘     │               │
│  │           │                   │          │               │
│  │  ┌────────▼─────────┐        │           │               │
│  │  │     Dispute      │────────┘           │               │
│  │  │ (mediator)       │                    │               │
│  │  └────────┬─────────┘                    │               │
│  │           │                              │               │
│  │  ┌────────▼─────────┐                    │               │
│  │  │  User Registry   │                    │               │
│  │  │ (identity)       │                    │               │
│  │  └──────────────────┘                    │               │
│  └──────────────────────────────────────────┘               │
│         │ references only (hash/CID)                        │
│         ▼                                                   │
│  ┌──────────────────────────────────────────┐               │
│  │     Off-chain Evidence (IPFS / local)    │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---


---

## 📜 Smart Contracts

Four Soroban contracts, each with a single responsibility:

| Contract | Role | Key Functions |
|---|---|---|
| **`rental_agreement`** | Orchestrator — manages the full lifecycle | `create_agreement`, `join_agreement`, `lock_deposit`, `request_move_out`, `submit_evidence`, `approve_inspection`, `open_dispute`, `close_agreement` |
| **`escrow`** | Vault — holds and releases deposits | `lock_deposit`, `release_full`, `release_partial`, `lock_for_dispute`, `settle_dispute` |
| **`dispute`** | Mediator — records disputes & resolutions | `open_dispute`, `propose_resolution`, `accept_resolution`, `resolve_dispute`, `set_arbitrator` |
| **`user_registry`** | Directory — roles & reputation | `register_user`, `get_user`, `adjust_reputation`, `set_reputation_source` |

### Lifecycle State Machine

```
CREATED ──► ACTIVE ──► MOVE_OUT_REQUESTED ──► EVIDENCE_SUBMITTED
                                                    │
                                              INSPECTION_PENDING
                                                │           │
                                           ┌────▼──┐   ┌───▼────┐
                                           │APPROVED│  │DISPUTED│
                                           └───┬───┘   └───┬────┘
                                               │       RESOLVED
                                          SETTLEMENT       │
                                               │      SETTLEMENT
                                               └───┬────────┘
                                                   ▼
                                                 CLOSED
```

---

## 🛠️ Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20.0.0 |
| npm | Latest |
| Rust | 1.97+ with `wasm32-unknown-unknown` target |
| soroban-cli | 22.x (optional, for WASM builds) |

### Installation

```bash
# Clone the repository
git clone https://github.com/manishkumar0802/Trustrent.git
cd Trustrent

# Install all dependencies (npm workspaces)
npm install
```

### Run the Frontend

```bash
npm run dev
# Open http://localhost:3000
```

### Run the API

```bash
npm run dev:api
# Open http://localhost:4000/health
```

### Run the Contracts

```bash
# Type-check
npm run contracts:check

# Run all contract tests
npm run contracts:test

# Build optimized WASM (requires soroban-cli)
cd contracts && soroban contract build
```

### All Commands

```bash
npm run dev          # Start frontend (localhost:3000)
npm run dev:api      # Start API (localhost:4000)
npm run build        # Production build of the web app
npm run typecheck    # TypeScript type-check across workspaces
npm run lint         # ESLint across workspaces
npm run test         # Run all tests (Vitest + contract tests)
npm run format       # Prettier format
npm run seed         # Generate test fixture data
npm run deploy       # Deployment plan (validates env, prints plan)
```

---

## 🧪 Testing

```bash
# Frontend tests (Vitest)
npm run test --workspace @trustrent/web

# Contract tests (Cargo)
cd contracts && cargo test --workspace
```

The contract test harness registers **all four contracts** in a single Soroban environment, so every cross-contract call executes against real state — not mocks.

### ✅ Test Results

<details>
<summary><strong>Frontend Tests — 15 passed (3 files)</strong></summary>

```
> @trustrent/web@0.1.0 test
> vitest run

 RUN  v3.2.7 apps/web

 ✓ src/test/mock-data.test.ts (3 tests) 6ms
 ✓ src/lib/freighter.test.ts (10 tests) 235ms
 ✓ src/test/button.test.tsx (2 tests) 104ms

 Test Files  3 passed (3)
      Tests  15 passed (15)
   Duration  26.51s
```

</details>

<details>
<summary><strong>Contract Tests — 30+ tests across 4 contracts</strong></summary>

```
test result: ok. 12 passed; 0 failed; 0 ignored
  rental_agreement tests: 12 passed
  escrow tests:           6 passed  
  dispute tests:          8 passed
  user_registry tests:    7 passed
```

</details>

<details>
<summary><strong>CI/CD Pipeline — all 3 jobs passing</strong></summary>

| Job | Status | What it checks |
|---|:---:|---|
| Contracts (Rust) | ✅ | `cargo fmt`, `clippy`, `cargo test`, WASM build |
| Web (Next.js) | ✅ | ESLint, TypeScript, Vitest, production build |
| API (Fastify) | ✅ | ESLint, TypeScript, Vitest |

[![CI](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml/badge.svg)](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml)

</details>

---

## 🚢 Deployment

### Environment Setup

```bash
# Copy environment examples
cp .env.example .env                    # Root (scripts)
cp apps/web/.env.example apps/web/.env.local    # Frontend
cp apps/api/.env.example apps/api/.env          # API
```

### Deploy to Stellar Testnet

```bash
# 1. Generate a testnet account
soroban keys generate trustrent-dev

# 2. Fund it via Stellar Laboratory or friendbot

# 3. Build contract WASM
cd contracts && stellar contract build

# 4. Deploy each contract
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/rental_agreement.wasm --source trustrent-dev --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/escrow.wasm --source trustrent-dev --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/dispute.wasm --source trustrent-dev --network testnet

# 5. Initialize and wire contract addresses
# (see scripts/deployment/ for the full sequence)
```


### Deploy Frontend to Vercel

```bash
# Push to GitHub, then connect to Vercel
# Vercel auto-detects Next.js and deploys
```

---

## 📄 Documentation

| Document | Description |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, contracts, data flow, state machine, security |
| [`docs/pitch.md`](docs/pitch.md) | Product pitch: problem, solution, roles, workflow, why Stellar |
| [`docs/roadmap.md`](docs/roadmap.md) | Phase plan: scaffold → chain wiring → production |
| [`docs/contracts.md`](docs/contracts.md) | Contract function surface & interfaces |
| [`docs/events.md`](docs/events.md) | Event catalog (15 canonical events) |
| [`docs/storage.md`](docs/storage.md) | Off-chain evidence storage abstraction |
| [`docs/youtube-script.md`](docs/youtube-script.md) | YouTube video script |
| [`docs/youtube-script-v2.md`](docs/youtube-script-v2.md) | Casual walkthrough video script |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT OR Apache-2.0** License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ on Stellar Soroban**

[![Stellar](https://img.shields.io/badge/Built%20on-Stellar%20Soroban-08B5E5?style=for-the-badge&logo=stellar&logoColor=white)](https://stellar.org)

[@manishkumar0802](https://github.com/manishkumar0802)

</div>
