# TrustRent
## CI/CD passing badge - [![CI](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml/badge.svg)](https://github.com/manishkumar0802/Trustrent/actions/workflows/ci.yml)


## SUBMISSION CHECKLIST:-
                                                                         
## Github Repo. Link :- 

## Live demo link (Vercel):- https://trustrent-lac.vercel.app/   

## Contract deployment address-
1) NEXT_PUBLIC_AGREEMENT_CONTRACT_ID=CC3NX7ZRDDW3V4M25XKVIWXMDR6RBKOB3MRQYMEU54AIMO57EL3DI72D
2) NEXT_PUBLIC_ESCROW_CONTRACT_ID=CBYIYJAOVPFXIWOUKSEKGHN4IN2V5QYHFMVY3XJDSPU4FPE6W7QWMBNV
3) NEXT_PUBLIC_DISPUTE_CONTRACT_ID=CDJQKL7DPAXU4JKOE4PU2VHE6625BK3KO57LARROKQ4YBDTT4RIPNXP6
## Transaction hash for contract interaction :- 
Transaction a655fe2659172edb53c3e74d0f1e89d2d33026426998c5155cc27b59c10beee3
##  Screenshot: Mobile responsive UI: - <img width="897" height="733" alt="WhatsApp Image 2026-08-22 at 19 35 28" src="https://github.com/user-attachments/assets/deef42dc-e853-4248-8fa0-af7066c85d0d" />
                               
## Screenshot: CI/CD pipeline running :-   <img width="1566" height="872" alt="WhatsApp Image 2026-08-22 at 19 40 16" src="https://github.com/user-attachments/assets/a8c9c8a3-81fd-4a51-a4ea-1842a0603992" />


## Screenshot: Test output with 3+ passing tests:- <img width="1449" height="954" alt="WhatsApp Image 2026-08-22 at 19 31 27" src="https://github.com/user-attachments/assets/a85e60e6-d237-4c4f-ac4e-e09526825204" />


## Demo video link (1–2 minutes) :-

> Your deposit. Locked fairly. Released transparently.
TrustRent is a production-quality Stellar dApp for **rental security deposits**.
A tenant's deposit is locked in a **Soroban smart-contract escrow** instead of
sitting in the landlord's pocket, and released only through a transparent,
evidence-backed move-out and settlement process.

- **Roles:** Landlord (create agreements, review move-out, approve/deduct,
  dispute) and Tenant (join, fund deposit, request move-out, submit evidence,
  accept/reject deductions, dispute).
- **Escrow lifecycle:** `CREATED → ACTIVE → MOVE_OUT_REQUESTED →
EVIDENCE_SUBMITTED → INSPECTION_PENDING → APPROVED / DISPUTED →
SETTLEMENT → CLOSED`.
- **Network:** Stellar **Testnet** during development (mainnet disabled).
- **Evidence:** files stored off-chain; the chain keeps only content
  references (hash/CID, submitter, timestamp).

> **Status — phase 2 contract logic verified; phase 3 submission prep in progress.**
> The monorepo, frontend routes, contract workspace, state machine, escrow
> lifecycle, dispute flow, and user registry logic are in place and validated by
> Rust tests. The remaining work is production hardening: wallet/auth wiring,
> live testnet integration, deployment proof, and the public demo submission.

---

## Monorepo layout

```
apps/
  web/          Next.js (App Router) + TypeScript + Tailwind v4
  api/          Fastify service (health + mock agreement service)
contracts/      Soroban Cargo workspace (Rust, SDK 22)
  common/       shared contract types + event catalog
  rental_agreement/  escrow/  dispute/
packages/
  types/        domain types mirroring the on-chain state machine
  shared/       lifecycle order, formatting, event labels
  blockchain/   typed TrustRentClient stub (phase 2: @stellar/stellar-sdk)
scripts/        deployment + seed (testnet)
tests/          integration strategy + fixtures
docs/           contracts, events, storage, testing, roadmap
.github/        CI (contracts + web + api)
```

---

## Getting started

Prerequisites: Node ≥ 20, npm, Rust toolchain (with `wasm32-unknown-unknown`
target for WASM builds), and optionally `soroban-cli` 22.x.

```bash
# 1. Install JS dependencies (npm workspaces)
npm install

# 2. Run the web app (design system + demo routes)
npm run dev            # http://localhost:3000

# 3. Run the API (health + mock agreements)
npm run dev:api        # http://localhost:4000

# 4. Contracts
npm run contracts:check   # cargo check --workspace
npm run contracts:test    # cargo test --workspace
cd contracts && soroban contract build   # optimized WASM (needs soroban-cli)
```

## Orange Belt submission checklist

The project is targeting the required submission items, not a full production roadmap:

- Public GitHub repo
- README with setup + architecture + deploy steps
- 10+ meaningful commits
- Live demo link (Vercel / Netlify)
- Contract deployment address
- Transaction hash for contract interaction
- Screenshot of mobile-responsive UI
- Screenshot of CI pipeline running
- Screenshot of passing tests (3+)
- Demo video (1–2 minutes)

## Deploy and demo runbook

```bash
# Root workspace
npm install
npm run dev --workspace @trustrent/web

# Contract verification (use a writable target dir on Windows)
$env:CARGO_TARGET_DIR='C:\trustrent-target'
cd contracts
cargo test --workspace

# Deployment plan
npm run deploy --workspace @trustrent/scripts
```

Use a local testnet account and populate `.env` with your Stellar values before
running the deploy script. The repo is configured for development/testnet only.

Environment examples: `.env.example` (root, for scripts), `apps/web/.env.example`,
`apps/api/.env.example`. Copy to `.env`/`.env.local` and never commit secrets.

## Common commands

```bash
npm run typecheck   # tsc across workspaces
npm run lint        # eslint across workspaces
npm run test        # vitest across workspaces
npm run build       # production build of the web app
npm run format      # prettier --write
npm run seed        # generate tests/fixtures/agreements.seed.json
npm run deploy      # deploy stub (validates env, prints plan)
```

## Docs

- `ARCHITECTURE.md` — system design, contracts, data flow, state machine,
  on-chain vs off-chain, events, security assumptions.
- `docs/contracts.md` — contract function surface.
- `docs/events.md` — event catalog.
- `docs/storage.md` — off-chain evidence storage abstraction.
- `docs/roadmap.md` — phase plan.
- `docs/pitch.md` — product pitch: problem, roles, workflow, contract
  architecture, event streaming, frontend, and why Stellar.

## License

MIT OR Apache-2.0.
