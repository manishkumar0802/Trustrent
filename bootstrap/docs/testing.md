# Testing

| Layer | Tooling | Where |
| --- | --- | --- |
| Contracts (Rust) | `cargo test` — Soroban test harness (`Env::default()`, generated clients) | `contracts/*/src/lib.rs` (`#[cfg(test)]`) |
| Web | Vitest + Testing Library (jsdom) | `apps/web/src/test/` |
| Shared | Vitest | `packages/shared/src/*.test.ts` |
| API | Vitest + Fastify `inject` | `apps/api/test/` |
| Integration | Rust cross-contract tests, then API↔testnet | `tests/integration/` |

Conventions:

- State transitions are the most valuable contract tests (happy path +
  illegal transitions).
- Frontend tests cover primitives and data-shape invariants, not layout.
- CI runs everything: `.github/workflows/ci.yml`.
