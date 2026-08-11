# @trustrent/api

Fastify service behind the TrustRent web app.

Phase 1 provides:
- `GET /health` — liveness + network config summary
- `GET /api/agreements` / `GET /api/agreements/:id` — in-memory mock service typed
  by `@trustrent/types` (no persistence, no chain calls)

Phase 2 will add a repository abstraction (the `AgreementRepository` seam in
`src/modules/agreements/service.ts`), evidence ingest, and proxying of read
calls to the Soroban contracts through `@trustrent/blockchain`.

Run: `npm run dev` (from `apps/api`) or `npm run dev:api` (from repo root).
