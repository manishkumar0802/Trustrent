# TrustRent — Architecture

> Your deposit. Locked fairly. Released transparently.

TrustRent escrows rental security deposits on **Stellar Soroban**. A tenant's
deposit is locked in a smart contract — not held by the landlord — and released
only through a transparent, evidence-backed move-out and settlement process.

**Network:** Stellar **Testnet** during development. Mainnet is explicitly
disabled in tooling and scripts.

---

## 1. System architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   apps/web (Next.js)│  HTTP  │   apps/api (Fastify) │
│  design system +    │ ─────► │  clean services +    │
│  role-based routes  │        │  repository seams    │
└─────────┬───────────┘        └──────────┬───────────┘
          │ events (timeline)             │ reads/writes
          ▼                               ▼
┌──────────────────────────────────────────────────────┐
│           packages/blockchain (TrustRentClient)      │
│   typed interface — wired to @stellar/stellar-sdk in │
│   the contract-integration phase                     │
└──────────────────────────┬───────────────────────────┘
                           │ Soroban RPC (Testnet)
                           ▼
┌──────────────────────────────────────────────────────┐
│                 Soroban contracts                    │
│  ┌──────────────────┐  cross-contract   ┌──────────┐ │
│  │ rental_agreement │───── calls ──────►│  escrow  │ │
│  │ lifecycle +      │◄──────────────────│ holds &  │ │
│  │ orchestration    │   (see §8)        │ releases │ │
│  └────────┬─────────┘                   └────┬─────┘ │
│           │ cross-contract calls             │       │
│  ┌────────▼─────────┐  freezes / settles ────┘       │
│  │     dispute      │  the deposit during a dispute  │
│  └───────┬──────────┘                                │
│          │ verifies role, writes outcome reputation │
│  ┌───────▼──────────┐                                │
│  │   user_registry  │  identity + reputation        │
│  └──────────────────┘                                │
└──────────────────────────────────────────────────────┘
          │ references only (hash/CID, never files)
          ▼
   Off-chain evidence storage (pluggable: local → IPFS/Arweave/S3)
```

Shared code:

- **`@trustrent/types`** — domain model mirroring the on-chain state machine
  and event catalog (single source of truth across web/API/contracts).
- **`@trustrent/shared`** — lifecycle order, event labels, formatting.
- **`tr-common`** (Rust) — contract types, the shared `Error` catalog, event
  name constants, and the cross-contract interface traits (`escrow_api`,
  `dispute_api`, `registry_api`) used by the four Soroban contracts.

---

## 2. Contract responsibilities

| Contract           | Responsibility                                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rental_agreement` | Orchestrator. Agreement lifecycle (`create → join → … → close`), role-based authorization, move-out and evidence flow, deduction proposal/acceptance, dispute delegation, settlement coordination.                                                                                |
| `escrow`           | Holds the deposit and controls its release. Tracks locked/released amounts and status. Refuses any withdrawal that is not triggered by the registered agreement or dispute contract.                                                                                              |
| `dispute`          | Dispute records, dispute evidence, resolution proposal/acceptance, and the settlement split. Assigns the platform arbitrator (verified against the registry); an arbitrator's decision is binding. Never moves funds itself — it instructs escrow, which re-validates everything. |
| `user_registry`    | Identity directory: wallet → role (Landlord/Tenant/Arbitrator) + reputation. Consulted by dispute to verify arbitrators, and receives winner/loser reputation updates after settlements. Never touches funds.                                                                     |

No contract can move a deposit on its own:

- `escrow` only accepts fund-moving calls from the two addresses registered at
  `initialize` (the agreement and dispute contracts).
- `dispute` cannot move funds at all — `lock_for_dispute` and `settle_dispute`
  are escrow functions that only the dispute contract's address may call, and
  escrow re-checks its own state (dispute-locked, not already released).
- `rental_agreement` is the only place a landlord or tenant can act with their
  own signature, and it enforces the state machine before any escrow call.

---

## 3. Contract interfaces

### `rental_agreement` (AgreementContract)

```rust
initialize(env, admin: Address, escrow_contract: Address, dispute_contract: Address)
create_agreement(env, landlord: Address, tenant: Option<Address>, property_ref: String,
                 rent_amount: i128, deposit_amount: i128) -> Result<u32, Error>
join_agreement(env, agreement_id: u32, tenant: Address) -> Result<(), Error>
get_agreement(env, agreement_id: u32) -> Result<AgreementRecord, Error>
get_evidence(env, evidence_id: u32) -> Result<EvidenceRecord, Error>

lock_deposit(env, agreement_id: u32, tenant: Address) -> Result<(), Error>   // → escrow
request_move_out(env, agreement_id: u32, tenant: Address) -> Result<(), Error>
submit_evidence(env, agreement_id: u32, submitter: Address, evidence_type: EvidenceType,
                content_hash: String) -> Result<u32, Error>
approve_inspection(env, agreement_id: u32, landlord: Address) -> Result<(), Error>
propose_deduction(env, agreement_id: u32, landlord: Address, amount: i128,
                  reason: String) -> Result<(), Error>
accept_deduction(env, agreement_id: u32, tenant: Address) -> Result<(), Error>  // → escrow
open_dispute(env, agreement_id: u32, initiator: Address, reason: String)
             -> Result<(), Error>                                               // → dispute
close_agreement(env, agreement_id: u32, caller: Address) -> Result<(), Error>   // → escrow / dispute
```

### `escrow` (EscrowContract)

```rust
initialize(env, admin: Address, agreement_contract: Address, dispute_contract: Address)
lock_deposit(env, agreement_id: u32, tenant: Address, landlord: Address, amount: i128,
             caller: Address) -> Result<(), Error>            // caller == agreement_contract
get_deposit(env, agreement_id: u32) -> Result<DepositRecord, Error>
release_full(env, agreement_id: u32, caller: Address) -> Result<(), Error>  // caller == agreement_contract
release_partial(env, agreement_id: u32, to_tenant: i128, to_landlord: i128,
                caller: Address) -> Result<(), Error>         // caller == agreement_contract
lock_for_dispute(env, agreement_id: u32, caller: Address) -> Result<(), Error>  // caller == dispute_contract
settle_dispute(env, agreement_id: u32, to_tenant: i128, to_landlord: i128,
               caller: Address) -> Result<(), Error>          // caller == dispute_contract
```

### `dispute` (DisputeContract)

```rust
initialize(env, admin: Address, agreement_contract: Address, escrow_contract: Address,
           user_registry: Address)
set_arbitrator(env, admin: Address, arbitrator: Address) -> Result<(), Error>
                                                                      // → registry.get_user (verify role)
open_dispute(env, agreement_id: u32, initiator: Address, landlord: Address, tenant: Address,
             reason: String, caller: Address) -> Result<(), Error>   // caller == agreement_contract
                                                                     // → escrow.lock_for_dispute
submit_dispute_evidence(env, agreement_id: u32, submitter: Address, evidence_type: EvidenceType,
                        content_hash: String) -> Result<u32, Error>
propose_resolution(env, agreement_id: u32, proposer: Address,
                   to_tenant: i128, to_landlord: i128) -> Result<(), Error>
                     // landlord → Opened→UnderReview; assigned arbitrator → binding Opened→Accepted
accept_resolution(env, agreement_id: u32, tenant: Address) -> Result<(), Error>
resolve_dispute(env, agreement_id: u32, caller: Address) -> Result<(), Error>  // → escrow.settle_dispute
get_dispute(env, agreement_id: u32) -> Result<DisputeRecord, Error>
```

### `user_registry` (UserRegistryContract)

```rust
initialize(env, admin: Address)
register_user(env, admin: Address, user: Address, role: UserRole) -> Result<(), Error>
set_reputation(env, admin: Address, user: Address, reputation: u32) -> Result<(), Error>
set_reputation_source(env, admin: Address, source: Address) -> Result<(), Error>
adjust_reputation(env, caller: Address, user: Address, delta: i32) -> Result<(), Error>
                                                                    // caller == reputation source
get_user(env, user: Address) -> Result<UserRecord, Error>
```

All amounts are in the smallest token unit (stroops) and are **bookkeeping
only** in the current phase — no token transfers happen yet. The authorization
surface below is exactly what the real Stellar Asset Contract transfers will
sit behind.

---

## 4. State machine

```
                  ┌──────────────┐
   landlord       │   CREATED    │
   creates ──────►│              │
                  └──────┬───────┘
                         │ tenant joins
                  ┌──────▼───────┐
                  │    ACTIVE    │◄───── deposit locked (escrow)
                  └──────┬───────┘
                         │ tenant requests move-out
                  ┌──────▼───────────────┐
                  │  MOVE_OUT_REQUESTED  │
                  └──────┬───────────────┘
                         │ first evidence
                  ┌──────▼───────────────┐
                  │  EVIDENCE_SUBMITTED  │
                  └──────┬───────────────┘
                         │ landlord starts inspection
                  ┌──────▼───────────────┐
                  │  INSPECTION_PENDING  │
                  └──────┬───────────────┘
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌───────────────┐         ┌───────────────┐
   │   APPROVED    │         │   DISPUTED    │  deposit frozen (escrow:
   └───────┬───────┘         └──────┬────────┘  lock_for_dispute)
           │                        │ dispute resolved
           │                ┌──────▼────────┐
           │                │   RESOLVED    │  verified against the
           │                └──────┬────────┘  dispute contract
           │                       │
           │                ┌──────▼────────┐
           │                │  SETTLEMENT   │  split released
           └───────────────►│ (release split)│  (escrow: settle_dispute
                            └──────┬────────┘   / release_partial / release_full)
                                   ▼
                            ┌───────────────┐
                            │    CLOSED     │
                            └───────────────┘
```

Transitions are enforced by the contracts and reject everything else with
`Error::InvalidState`. Selected enforced rules:

- `CREATED → CLOSED` fails (`close_agreement` requires `APPROVED`, `SETTLEMENT`
  or `RESOLVED`/`DISPUTED`).
- `CLOSED → anything` is impossible — no function accepts a closed agreement.
- `approve_inspection` is a two-step landlord action:
  `EVIDENCE_SUBMITTED → INSPECTION_PENDING → APPROVED`.
- `open_dispute` only from `INSPECTION_PENDING`; the agreement record then
  stays `DISPUTED` until `close_agreement` verifies (via the dispute contract)
  that the dispute is `Resolved`, at which point it walks
  `RESOLVED → SETTLEMENT → CLOSED` atomically within the same call.
- `close_agreement` from `APPROVED` executes the full refund first — the escrow
  call happens inside the transition, so `CLOSED` is only reachable after the
  deposit was actually released.

---

## 5. Storage model

All state lives in **persistent storage**, keyed per contract — no duplication
across contracts.

**`rental_agreement`**

| Key                                 | Value                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `Admin`                             | `Address`                                                                                   |
| `EscrowContract`, `DisputeContract` | `Address` (wiring)                                                                          |
| `Counter`                           | `u32` (agreement id sequence)                                                               |
| `EvidenceCounter`                   | `u32`                                                                                       |
| `Agreement(u32)`                    | `AgreementRecord` — parties, rent/deposit amounts, state, `settled` flag, pending deduction |
| `Evidence(u32)`                     | `EvidenceRecord` — reference only                                                           |

**`escrow`**

| Key                                    | Value                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `Admin`                                | `Address`                                                                   |
| `AgreementContract`, `DisputeContract` | `Address` (authorized callers)                                              |
| `Deposit(u32)`                         | `DepositRecord` — tenant, landlord, amount, `released`, status, `locked_at` |

**`dispute`**

| Key                                   | Value                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `Admin`                               | `Address`                                                                          |
| `AgreementContract`, `EscrowContract` | `Address` (wiring)                                                                 |
| `UserRegistry`                        | `Address` (wiring — arbitrator verification)                                       |
| `Arbitrator`                          | `Address` (configured platform arbitrator)                                         |
| `EvidenceCounter`                     | `u32`                                                                              |
| `Dispute(u32)`                        | `DisputeRecord` — initiator, parties, arbitrator, reason, state, split, timestamps |
| `Evidence(u32)`                       | `EvidenceRecord`                                                                   |

**`user_registry`**

| Key                | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| `Admin`            | `Address`                                                    |
| `ReputationSource` | `Address` — the contract allowed to call `adjust_reputation` |
| `User(Addr)`       | `UserRecord` — role, reputation, registered_at               |

No contract re-stores what another already holds: escrow stores parties because
it must transfer to them in the next phase; the agreement record remains the
source of truth for rent and deposit amounts, and the dispute record for the
resolution split.

---

## 6. On-chain vs off-chain data

**On-chain (Soroban storage):** agreement metadata, lifecycle state, evidence
**references** (`id`, `agreement_id`, `evidence_type`, `content_hash`,
`submitted_by`, `timestamp`), dispute records and splits, deposit lock state.

**Off-chain (pluggable storage):** images, PDFs, bills, room-condition photos —
via a `StorageProvider` abstraction (`local` now; IPFS/Arweave/S3 candidates,
chosen through the Gravity Index).

The UI always makes this explicit: _the blockchain stores the proof, not the
file._ Evidence `content_hash` values are content-addressed (CIDs) so
tampering is detectable.

---

## 7. Event architecture

Contracts publish canonical events consumed by the frontend activity timeline
and future indexers:

`AgreementCreated · TenantJoined · DepositLocked · MoveOutRequested ·
EvidenceSubmitted · InspectionApproved · DeductionProposed ·
SettlementAccepted · DisputeOpened · DisputeResolved · DepositReleased ·
AgreementClosed · UserRegistered · ReputationUpdated · ArbitratorAssigned`

Every event publishes a single symbol topic (the event name) with a typed data
tuple, e.g. `(Symbol::new(&env, "DepositLocked"),) → (agreement_id, amount)`.
The catalog lives once in `tr_common::events` (Rust) and `@trustrent/types`
(TS) to prevent drift. Full table: `docs/events.md`.

---

## 8. Cross-contract calls

All calls are real Soroban cross-contract invocations through trait-based
clients (`#[contractclient]` on `tr_common::escrow_api::EscrowInterface` and
`tr_common::dispute_api::DisputeInterface`). The caller passes its own
`env.current_contract_address()` as `caller`; the callee `require_auth`s it —
a contract address is implicitly authorized as the direct invoker — and
compares it against the addresses registered at `initialize`.

| Call                | Direction                  | Why it exists                                                                                                                                                                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lock_deposit`      | rental_agreement → escrow  | Tenant funding. Escrow accepts only from the registered agreement contract, so a tenant cannot lock a deposit outside the agreement state machine (e.g. after move-out).                         |
| `release_full`      | rental_agreement → escrow  | Full refund when a clean agreement is closed. Escrow re-validates the caller and that the deposit is not already released / dispute-locked.                                                      |
| `release_partial`   | rental_agreement → escrow  | Executes the agreed-deduction split the moment the tenant accepts it.                                                                                                                            |
| `open_dispute`      | rental_agreement → dispute | Delegates dispute records. The agreement contract has already verified the initiator is a party and the state is `INSPECTION_PENDING`.                                                           |
| `get_dispute`       | rental_agreement → dispute | `close_agreement` reads the dispute record to verify it is truly `Resolved` before allowing the agreement to close.                                                                              |
| `lock_for_dispute`  | dispute → escrow           | Freezes the deposit the instant a dispute opens — the deposit lock is preserved for the entire dispute.                                                                                          |
| `get_deposit`       | dispute → escrow           | Bounds the landlord's proposed resolution split — a proposal exceeding what escrow holds is rejected, so a dispute can never reach an unresolvable state.                                        |
| `settle_dispute`    | dispute → escrow           | Executes the accepted resolution split. Escrow validates the caller (dispute contract only) and its own state (dispute-locked), so a buggy dispute contract still cannot move funds arbitrarily. |
| `get_user`          | dispute → user_registry    | `set_arbitrator` verifies the proposed address is registered with the `Arbitrator` role before assignment, so a random wallet cannot act as arbitrator.                                          |
| `adjust_reputation` | dispute → user_registry    | After a settlement, the larger-share party gains reputation and the other loses some (source-gated; best-effort so reputation never blocks settlement).                                          |

Every call changes real state in the callee — there is no decoration.

---

## 9. Authorization model

**Party actions** (on `rental_agreement` / `dispute`): the acting address
`require_auth`s itself and is checked against the agreement/dispute record —
landlord-only actions (`create_agreement`, `approve_inspection`,
`propose_deduction`), tenant-only actions (`join_agreement`, `lock_deposit`,
`request_move_out`, `accept_deduction`), and either-party actions
(`submit_evidence`, `open_dispute`, `close_agreement`).

**Contract actions** (on `escrow`): every fund-moving function takes `caller`
(the calling contract's own address) and does `caller.require_auth()`. Because
a contract address is implicitly authorized as the direct invoker, this is the
verifiable proof that the call came from the registered agreement or dispute
contract. The tenant and landlord — and any stranger — can never withdraw,
because their addresses are not the registered callers and their signatures
fail the comparison.

**Error catalog** (shared `tr_common::Error`): `Unauthorized`,
`InvalidState`, `AgreementNotFound`, `TenantAlreadyJoined`, `InvalidAmount`,
`DepositAlreadyLocked`, `DepositAlreadyReleased`, `InvalidDeduction`,
`DisputeAlreadyOpen`, `DisputeNotFound`, `NotParty`,
`SettlementAlreadyExecuted`, `EvidenceNotFound`, `DepositNotFound`,
`NotInitialized`, `UserNotFound`, `UserAlreadyRegistered`,
`NotAnArbitrator`. Normal validation failures return these errors — no
random panic strings.

---

## 10. Testing strategy

- **Unit tests per contract** — in-crate `#[cfg(test)]` modules using
  `Env::default()`, `mock_all_auths()` and `Address::generate`.
- **Cross-contract tests register the real callee crates** (`env.register`) so
  every `EscrowClient` / `DisputeClient` / `UserRegistryClient` call executes
  against real state: `dispute` registers `escrow` + `user_registry`;
  `rental_agreement` registers both plus `user_registry`.
- Covered behaviors: agreement creation, tenant joining (invited-only), deposit
  locking, unauthorized withdrawal fails, move-out request, evidence
  submission, full refund, partial deduction, dispute flow (including the
  escrow freeze and settlement), invalid state transitions, double settlement
  prevention, unauthorized landlord/tenant actions, and the cross-contract
  interactions themselves. Tests assert actual state and balances, not that a
  function merely returned.

Run: `cargo fmt` · `cargo test --workspace` · `stellar contract build` (CI:
`cargo fmt --check`, `cargo clippy --workspace --all-targets`, tests, WASM
build).

---

## 11. Security assumptions & known limitations

- **Escrow neutrality** — the contract, not either party, controls funds; no
  party can withdraw unilaterally (verified by tests).
- **Defense in depth on settlement** — dispute → escrow, and agreement →
  escrow, are both caller-checked _and_ state-checked in escrow (dispute-lock
  required, released/double-settle rejected).
- **Evidence integrity** — content-addressed hashes make tampering detectable;
  files never enter the ledger.
- **Testnet-only during development** — deploy scripts refuse non-testnet
  networks (see `scripts/deployment`).
- **Current phase limits (deliberate):** no real token transfers yet — escrow
  tracks balances; a Stellar Asset Contract transfer layer lands next. Real
  human signatures replace `mock_all_auths` on testnet. The
  `packages/blockchain` client and deploy scripts (`stellar` CLI) are stubs.

---

## 12. Repo layout

```
apps/       web (Next.js), api (Fastify)
contracts/  Soroban Cargo workspace: common, rental_agreement, escrow, dispute, user_registry
packages/   types, shared, blockchain (TS)
scripts/    deployment, seed
tests/      integration + fixtures
docs/       contracts, events, storage, testing, roadmap
.github/    workflows/ci.yml
```

See `README.md` for getting started.
