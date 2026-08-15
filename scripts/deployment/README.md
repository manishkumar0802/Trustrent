# Deployment

Phase 1 provides the _scaffold_ — the deploy orchestration is a typed stub that
validates configuration and prints the plan. Real deployment lands in phase 2,
once the contracts are finalized.

## Prerequisites

- Rust toolchain + `wasm32-unknown-unknown` target
- `stellar-cli` (formerly `soroban-cli`) 22.x — verify the installed version
  with `stellar --version` and consult `stellar <command> --help` for exact
  flags, which can drift between CLI releases.
- A testnet account: `stellar keys generate trustrent-dev` (or fund an existing
  one via the Stellar Laboratory — Testnet only).

## Building contract WASM

```bash
cd contracts
stellar contract build          # optimized WASM into target/wasm32-unknown-unknown/release/
```

## Deploying (phase 2 sketch — verify flags against your CLI)

```bash
# From contracts/
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rental_agreement.wasm \
  --source trustrent-dev \
  --network testnet

stellar contract invoke --id <AGREEMENT_ID> --source trustrent-dev \
  --network testnet -- create --landlord <G...> --property_ref "..." ...
```

`scripts/deployment/deploy.ts` will orchestrate the sequence
(agreement → escrow → dispute, then `initialize` + wiring) once phase 2 lands.

## Environment

Copy the repo-root `.env.example` to `.env` and set `SOROBAN_SECRET_KEY`.
Never use mainnet credentials during development.
