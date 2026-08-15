# Roadmap

## Phase 1 — scaffold (this step) ✅

- Monorepo, frontend design system, routes, shared types
- Contract workspace with placeholder contracts + unit tests
- API scaffold, scripts, CI, docs

## Phase 2 — real chain wiring

- Enforce role authorization (`require_auth`) in all contracts
- Cross-contract calls: rental_agreement ↔ escrow ↔ dispute
- User registry with roles (Landlord/Tenant/Arbitrator) + reputation;
  arbitrator decisions are binding and verified against the registry ✅
- Real token transfer in escrow (Stellar Asset Contract) on **testnet**
- `@stellar/stellar-sdk`-driven `TrustRentClient`; replace mock data
- Deploy scripts create + initialize contracts; contract IDs → env
- Off-chain storage provider (chosen via Gravity Index)

## Phase 3 — production hardening

- Wallet auth (e.g. Freighter), event indexing for the live timeline
- Dispute mediation flow, notifications
- Mainnet gating, audits, fuzz tests
