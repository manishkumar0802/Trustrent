# Contracts

Soroban contracts live in `contracts/` (Cargo workspace, SDK 22 / Protocol 22).
Each contract is `no_std`, compiled to WASM (`crate-type = ["cdylib"]`), and
shares types/event names through the `tr-common` crate.

## rental_agreement (`contracts/rental_agreement`)

Owns the agreement lifecycle and orchestrates the move-out flow.

| Function                                                              | Effect                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `create(landlord, property_ref, rent, deposit) -> u32`                | New agreement, state `Created`. Emits `AgreementCreated`.                                                             |
| `join(agreement_id, tenant)`                                          | `Created → Active`. Emits `TenantJoined`.                                                                             |
| `lock_deposit(agreement_id)`                                          | Orchestration seam → escrow in phase 2. Emits `DepositLocked`.                                                        |
| `request_move_out(agreement_id)`                                      | `Active → MoveOutRequested`. Emits `MoveOutRequested`.                                                                |
| `submit_evidence(agreement_id, submitter, kind, content_hash) -> u32` | Stores an evidence reference; first evidence moves `MoveOutRequested → EvidenceSubmitted`. Emits `EvidenceSubmitted`. |
| `start_inspection(agreement_id)`                                      | `EvidenceSubmitted → InspectionPending`.                                                                              |
| `approve(agreement_id)`                                               | `InspectionPending → Approved`. Emits `InspectionApproved`.                                                           |
| `get_agreement / state / get_evidence`                                | Read helpers.                                                                                                         |

Storage keys: `Counter`, `EvidenceCounter`, `Agreement(u32)`, `Evidence(u32)`.

## escrow (`contracts/escrow`)

Holds the deposit. No transfers happen in phase 1 (bookkeeping only).

| Function                                | Effect                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `initialize(admin)`                     | One-time setup.                                                                     |
| `lock(agreement_id, depositor, amount)` | Creates the deposit lock (`Locked`). One lock per agreement. Emits `DepositLocked`. |
| `release(agreement_id, amount)`         | Partial/full release bookkeeping. Emits `DepositReleased`.                          |
| `mark_disputed(agreement_id)`           | Sets `Disputed` — funds stay locked.                                                |
| `lock_status / locked_amount`           | Read helpers.                                                                       |

Storage keys: `Admin`, `Lock(u32)`.

## dispute (`contracts/dispute`)

Dispute records, deductions and resolutions.

| Function                                                             | Effect                                                                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `open(agreement_id, initiator, reason)`                              | Creates record (`Opened`), freezes the deposit in escrow. Emits `DisputeOpened`.                                                              |
| `set_arbitrator(admin, arbitrator)`                                  | Assigns the platform arbitrator (verified against the user registry). Emits `ArbitratorAssigned`.                                             |
| `propose_resolution(agreement_id, proposer, to_tenant, to_landlord)` | Landlord proposal: `Opened → UnderReview`; assigned arbitrator's proposal is binding: `Opened → Accepted`. Emits `DisputeResolutionProposed`. |
| `accept_resolution(agreement_id, tenant)`                            | `UnderReview → Accepted`. Emits `SettlementAccepted`.                                                                                         |
| `resolve(agreement_id, caller)`                                      | `→ Resolved`; executes the split in escrow, then updates winner/loser reputation in the registry (best-effort). Emits `DisputeResolved`.      |
| `get(agreement_id)`                                                  | Read helper.                                                                                                                                  |

Storage keys: `Dispute(u32)`.

## user_registry (`contracts/user_registry`)

The platform identity directory: wallet address → role (Landlord / Tenant /
Arbitrator) plus a reputation score (0..=100, neutral baseline 50). The
dispute contract reads it to verify an arbitrator before assignment, so a
random wallet cannot pose as one, and writes settlement outcomes back: the
larger-share party gains reputation, the other loses some. The registry
never moves funds.

| Function                                 | Effect                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `initialize(admin)`                      | One-time setup.                                                                         |
| `register_user(admin, user, role)`       | Registers a user with a role (starts at neutral reputation 50). Emits `UserRegistered`. |
| `set_reputation(admin, user, score)`     | Absolute reputation update (clamped 0..=100). Emits `ReputationUpdated`.                |
| `set_reputation_source(admin, source)`   | Authorizes a contract (the dispute contract) to call `adjust_reputation`.               |
| `adjust_reputation(caller, user, delta)` | Delta reputation change, source-gated; clamped 0..=100. Emits `ReputationUpdated`.      |
| `get_user(user)`                         | Public read helper.                                                                     |

Storage keys: `Admin`, `ReputationSource`, `User(Address)`.

## Cross-contract plan (phase 2)

`rental_agreement` will import the escrow and dispute clients via
`soroban_sdk::contractimport!` against the compiled WASM:

- `request_move_out` / `approve` → orchestrate state in both contracts
- `submit_evidence` → also record on the dispute contract when a dispute is open
- settlement → `escrow.release` split by `AgreementState` (full refund vs
  agreed deduction vs dispute resolution)

Cross-contract calls exist only where they change real state — never for show.
