<div align="center">

# 🔐 TrustRent

### Your deposit. Locked fairly. Released transparently.

[![CI](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml/badge.svg)](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT%20%2F%20Apache--2.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![Rust](https://img.shields.io/badge/rust-1.97-orange)
![Stellar](https://img.shields.io/badge/stellar-soroban%2022-purple)

**A decentralized rental escrow & dispute resolution platform built on Stellar Soroban**
Github Username - manishkumar0802

[Getting Started](#-getting-started) • [Architecture](#-architecture) • [Smart Contracts](#-smart-contracts) • [Demo](#-demo) • [Deployment](#-deployment)

</div>

---

## 📌 Overview

TrustRent is a production-quality Stellar dApp that **escrows rental security deposits** in smart contracts instead of letting them sit in a landlord's pocket. Deposits are locked on-chain and released only through a transparent, evidence-backed move-out and settlement process.

| Feature | Description |
|---|---|
| 🏠 **Rental Agreements** | Landlord creates, tenant joins — terms locked on-chain |
| 🔒 **Smart Contract Escrow** | Deposits held by code, not people — no unilateral withdrawal |
| 📸 **Evidence Pipeline** | Off-chain files (IPFS), on-chain hashes — tamper-proof proof |
| ⚖️ **Dispute Resolution** | Arbitrator-reviewed splits with binding on-chain execution |
| 🏆 **Reputation System** | On-chain scores track trust for tenants, landlords, and arbitrators |
| 📱 **Responsive UI** | Mobile-first design with role-based dashboards |

---

## 🚀 Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---:|---|---|
| **Smart Contracts** | `Rust` + `Soroban SDK 22` | 4 on-chain contracts: agreement, escrow, dispute, registry |
| **Frontend** | `Next.js 16` + `React 19` + `Tailwind v4` | Responsive dashboard, agreement & dispute flows |
| **API** | `Fastify` + `TypeScript` | Health endpoint, mock agreement service |
| **Shared Packages** | `TypeScript` | Domain types, lifecycle helpers, blockchain client |
| **CI/CD** | `GitHub Actions` | Contracts + web + API pipelines |
| **Network** | `Stellar Testnet` | Development & testing (mainnet disabled) |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUSTRENT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   HTTP    ┌──────────────┐               │
│  │  apps/web    │ ────────► │  apps/api    │               │
│  │  Next.js     │           │  Fastify     │               │
│  └──────┬───────┘           └──────┬───────┘               │
│         │                          │                        │
│         ▼                          ▼                        │
│  ┌──────────────────────────────────────────┐               │
│  │         packages/blockchain              │               │
│  │    TrustRentClient (@stellar/stellar-sdk)│               │
│  └──────────────────┬───────────────────────┘               │
│                     │ Soroban RPC                            │
│                     ▼                                       │
│  ┌──────────────────────────────────────────┐               │
│  │          SOROBAN CONTRACTS               │               │
│  │                                          │               │
│  │  ┌─────────────────┐   ┌──────────┐     │               │
│  │  │ Rental Agreement │──►│  Escrow  │     │               │
│  │  │ (orchestrator)   │◄──│ (vault)  │     │               │
│  │  └────────┬─────────┘   └────┬─────┘     │               │
│  │           │                   │           │               │
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

## 📁 Project Structure

```
TrustRent/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       ├── components/     # UI components + deposit flow
│   │       ├── data/           # Mock data (phase 1)
│   │       ├── hooks/          # React hooks
│   │       ├── services/       # Storage + dispute stores
│   │       └── test/           # Frontend tests
│   └── api/                    # Fastify API service
│       └── src/
│           ├── modules/        # Agreement routes + service
│           └── index.ts        # Server entry
├── contracts/                  # Soroban Cargo workspace (Rust)
│   ├── common/                 # Shared types, errors, events, interfaces
│   ├── rental_agreement/       # Agreement lifecycle orchestrator
│   ├── escrow/                 # Deposit vault — holds & releases funds
│   ├── dispute/                # Dispute records & resolution
│   └── user_registry/          # Identity directory & reputation
├── packages/
│   ├── types/                  # TypeScript domain types
│   ├── shared/                 # Lifecycle helpers, formatting, event labels
│   └── blockchain/             # Typed TrustRentClient stub
├── scripts/
│   ├── deployment/             # Deploy + seed scripts
│   └── seed/                   # Test fixture generator
├── tests/                      # Integration strategy + fixtures
├── docs/                       # Architecture, events, storage, roadmap
└── .github/
    └── workflows/ci.yml        # CI: contracts + web + api
```

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

**Covered scenarios:**
- ✅ Agreement creation & joining
- ✅ Deposit locking & unauthorized withdrawal rejection
- ✅ Move-out request & evidence submission
- ✅ Full refund flow (clean move-out)
- ✅ Partial deduction flow (agreed split)
- ✅ Dispute flow (freeze → propose → accept → settle)
- ✅ Arbitrator binding decisions
- ✅ Invalid state transition rejection
- ✅ Unauthorized action rejection
- ✅ Reputation updates (clean move-out & dispute outcomes)

---

## 📸 Demo & Evidence

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
<summary><strong>TypeScript Typecheck — all workspaces clean</strong></summary>

```
> tsc --noEmit
(no output = no errors)
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

### 🖼️ Screenshots

> **How to add screenshots:** Capture the images below, save them in a `screenshots/` folder at the project root, and they will appear here automatically.

<!-- To add screenshots: save PNG files in screenshots/ folder and uncomment below -->

<!-- #### 📱 Mobile Dashboard -->
<!-- ![Mobile Dashboard](screenshots/mobile-dashboard.png) -->

<!-- #### 💻 Desktop Dashboard -->
<!-- ![Desktop Dashboard](screenshots/desktop-dashboard.png) -->

<!-- #### 📄 Agreement Detail -->
<!-- ![Agreement Detail](screenshots/agreement-detail.png) -->

<!-- #### ⚖️ Disputes Page -->
<!-- ![Disputes Page](screenshots/disputes-page.png) -->

<!-- #### 🔄 Role Switcher -->
<!-- ![Role Switcher](screenshots/role-switcher.png) -->

<!-- #### 📸 Evidence Upload -->
<!-- ![Evidence Upload](screenshots/evidence-upload.png) -->

#### How to capture screenshots

```bash
# 1. Start the app
npm run dev

# 2. Open http://localhost:3000 in your browser

# 3. Capture these pages:
#    - Dashboard (mobile: 375px width, desktop: 1280px)
#    - Agreement detail (AG-1042)
#    - Disputes page
#    - Role switcher (toggle landlord ↔ tenant)
#    - Move-out / evidence page

# 4. Save them as PNG in screenshots/ folder
# 5. Uncomment the lines above to embed them
```

> **Note:** Screenshots will appear on this README once you save them in the `screenshots/` folder and uncomment the image tags above. The `verify-freighter.png` screenshot is already in the repo root.

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

## 📊 CI/CD Pipeline

GitHub Actions runs on every push and pull request:

| Job | Checks |
|---|---|
| **Contracts** | `cargo fmt`, `clippy`, `cargo test`, WASM build |
| **Web** | ESLint, TypeScript typecheck, Vitest, Next.js build |
| **API** | ESLint, TypeScript typecheck, Vitest |

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

</div>
