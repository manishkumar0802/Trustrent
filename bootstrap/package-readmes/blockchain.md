# @trustrent/blockchain

Typed client layer for the TrustRent Soroban contracts.

Phase 1 ships a **typed stub**: `TrustRentClient` exposes the full method
surface but every call throws `NotImplementedError` — nothing is faked. The web
UI is driven by explicit mock data until the wiring exists.

Phase 2 wiring: install `@stellar/stellar-sdk`, generate typed bindings with
`soroban contract bindings typescript`, and implement the stub bodies. See
`src/client.ts` and `scripts/deployment/README.md`.
