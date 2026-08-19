# Deployment

This project is now in the phase 2 verified + phase 3 submission stage. The
script still validates configuration and prints a deploy plan, but the runbook
below reflects the intended real deployment sequence for the Orange Belt demo.

## Prerequisites

- Rust toolchain + `wasm32-unknown-unknown` target
- `stellar-cli` (formerly `soroban-cli`) 22.x — verify the installed version
  with `stellar --version` and consult `stellar <command> --help` for exact
  flags, which can drift between CLI releases.
- A funded Stellar Testnet account: `stellar keys generate trustrent-dev` or
  use a funded wallet from the Stellar Laboratory.

## Building contract WASM

```bash
cd contracts
stellar contract build
```

This produces the optimized contract WASM in the standard build output folder.

## Deployment sequence

```bash
# 1) Build each contract
cd contracts
stellar contract build

# 2) Deploy the three contracts
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/rental_agreement.wasm --source trustrent-dev --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/escrow.wasm --source trustrent-dev --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/dispute.wasm --source trustrent-dev --network testnet

# 3) Initialize each contract and wire addresses
# Then persist the resulting contract IDs in a `.env` or config file used by the app.
```

The `scripts/deployment/deploy.ts` script remains the safe validation entry point
for CI / local dev, while the actual contract deployment commands above reflect
what is needed for the public demo and submission evidence.

## Frontend deployment

For the live demo:

- Vercel for the Next.js frontend
- Stellar Testnet contract IDs and transaction hashes recorded in the README
- public demo URL used for submission evidence

## Environment

Copy the repo-root `.env.example` to `.env` and set `SOROBAN_SECRET_KEY`.
Never use mainnet credentials during development.
