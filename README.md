# TrustRent

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

> **Status — phase 1 scaffold.** The UI, design system, routes, monorepo and
> contract workspace (placeholder contracts with unit tests) are in place. The
> blockchain client is a typed stub that intentionally throws — nothing is
> faked. On-chain wiring is phase 2 (see `docs/roadmap.md`).

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
