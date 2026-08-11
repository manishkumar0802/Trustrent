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
│   phase 1: typed stub → phase 2: @stellar/stellar-sdk│
└──────────────────────────┬───────────────────────────┘
                           │ Soroban RPC (Testnet)
                           ▼
┌──────────────────────────────────────────────────────┐
│                 Soroban contracts                    │
│  ┌──────────────────┐   ┌──────────────────┐         │
│  │ rental_agreement │◄─►│     escrow       │         │
│  │ lifecycle +      │   │ holds deposit,   │         │
│  │ orchestration    │   │ releases funds   │         │
│  └────────┬─────────┘   └──────────────────┘         │
│           │ cross-contract calls (phase 2)           │
│  ┌────────▼─────────┐                                │
│  │     dispute      │  records, deductions,          │
│  │                  │  resolution → settlement       │
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
- **`tr-common`** (Rust) — contract types + event-name constants shared by the
  three Soroban contracts.

---

## 2. Contract responsibilities

| Contract | Responsibility |
| --- | --- |
| `rental_agreement` | Agreement lifecycle (`create → join → … → close`), move-out state, evidence references, settlement coordination, landlord/tenant role semantics. |
| `escrow` | Holds the deposit, tracks locked/released amounts, prevents unauthorized withdrawal, supports partial release. Phase 2 adds real token transfer. |
| `dispute` | Dispute state, proposed deductions, resolution with explicit release amounts that become escrow settlement instructions. |

Cross-contract calls (phase 2) exist only where they change real state:
move-out approval touches escrow, dispute resolution splits the deposit,
settlement coordinates both.

---

## 3. Data flow

1. **Landlord creates** an agreement on `rental_agreement` → `AgreementCreated`.
2. **Tenant joins** → `TenantJoined`; agreement becomes `ACTIVE`.
3. **Tenant funds** the deposit → `escrow.lock` → `DepositLocked`. Funds are now
   contract-controlled; no party can withdraw unilaterally.
4. **Move-out requested** → `MoveOutRequested`. Evidence references
   (final dues, room condition) are recorded on-chain as hashes → `EvidenceSubmitted`.
5. **Inspection** → landlord reviews evidence → `InspectionPending` → approve
   (`InspectionApproved`) or dispute (`DisputeOpened`).
6. **Settlement**:
   - Full refund → escrow releases full deposit to tenant → `DepositReleased`.
   - Agreed deduction → partial release to both parties (`SettlementAccepted`).
   - Dispute → deposit stays **locked** until `DisputeResolved` instructs the split.
7. **Closed** → `AgreementClosed`.

The frontend renders this as the deposit lifecycle timeline and activity feed.

---

## 4. State machine

```
                  ┌──────────────┐
   landlord       │   CREATED    │
   creates ──────►│              │
                  └──────┬───────┘
                         │ tenant joins
                  ┌──────▼───────┐
                  │    ACTIVE    │◄───── deposit locked
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
   │   APPROVED    │         │   DISPUTED    │ (deposit stays locked)
   └───────┬───────┘         └───────┬───────┘
           │                         │ resolved
           │                  ┌──────▼───────┐
           │                  │  SETTLEMENT  │
           └─────────────────►│ (release split)│
                              └──────┬───────┘
                                     ▼
                              ┌───────────────┐
                              │    CLOSED     │
                              └───────────────┘
```

Transitions are enforced by the contracts; illegal transitions return errors
(see contract unit tests for the enforced matrix).

---

## 5. On-chain vs off-chain data

**On-chain (Soroban storage):**

- agreement metadata (parties, rent, deposit amounts in smallest token units)
- lifecycle state, move-out stage
- evidence **references**: `content_hash`, `uri`, submitter, timestamp, kind
- dispute records, proposed deductions, settlement instructions
- deposit lock state (locked / partially released / released / disputed)

**Off-chain (pluggable storage):**

- images, PDFs, bills, room-condition photos — via a `StorageProvider`
  abstraction (`local` in phase 1; IPFS/Arweave/S3 candidates for phase 2,
  chosen through the Gravity Index)

The UI always makes this explicit: *the blockchain stores the proof, not the
file.*

---

## 6. Event architecture

Contracts publish canonical events consumed by the frontend activity timeline
and future indexers:

`AgreementCreated · TenantJoined · DepositLocked · MoveOutRequested ·
EvidenceSubmitted · InspectionApproved · DeductionProposed ·
SettlementAccepted · DisputeOpened · DisputeResolved · DepositReleased ·
AgreementClosed`

The catalog lives once in `tr_common::events` (Rust) and
`@trustrent/types` (TS) to prevent drift. Full table: `docs/events.md`.

---

## 7. Security assumptions

- **Escrow neutrality** — the contract, not either party, controls funds.
  Phase 2 moves real tokens and enforces `require_auth` per role.
- **Authorization is phase 2** — phase-1 placeholders deliberately omit
  `require_auth`; no funds move, so nothing can be stolen. This is explicit,
  not an oversight.
- **Cross-contract trust** — escrow will authorize only `rental_agreement` as
  the caller for `release`; dispute resolutions route through the agreement
  contract so a single orchestrator defines settlement.
- **Evidence integrity** — content-addressed hashes make tampering detectable;
  files themselves never enter the ledger.
- **Testnet-only during development** — deploy scripts refuse non-testnet
  networks (see `scripts/deployment`).
- **Known limitations (phase 1)**: no real token transfers, no auth, mock UI
  data, placeholder contract addresses.

---

## 8. Repo layout

```
apps/       web (Next.js), api (Fastify)
contracts/  Soroban Cargo workspace: common, rental_agreement, escrow, dispute
packages/   types, shared, blockchain (TS)
scripts/    deployment, seed
tests/      integration + fixtures
docs/       contracts, events, storage, testing, roadmap
.github/    workflows/ci.yml
```

See `README.md` for getting started.
