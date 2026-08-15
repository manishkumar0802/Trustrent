# Contract events

Events are published with `env.events().publish((topic,), data)` where `topic`
is the event name as a `Symbol`. The frontend activity timeline consumes this
exact catalog (`CONTRACT_EVENT_NAMES` in `@trustrent/types`).

| Event                | Emitted by                | Data (phase 1)                                 | Meaning                               |
| -------------------- | ------------------------- | ---------------------------------------------- | ------------------------------------- |
| `AgreementCreated`   | rental_agreement          | `agreement_id`                                 | Agreement created by landlord         |
| `TenantJoined`       | rental_agreement          | `agreement_id`                                 | Tenant joined, agreement active       |
| `DepositLocked`      | escrow / rental_agreement | `agreement_id, amount`                         | Deposit funded into escrow            |
| `MoveOutRequested`   | rental_agreement          | `agreement_id`                                 | Tenant started the move-out flow      |
| `EvidenceSubmitted`  | rental_agreement          | `agreement_id, evidence_id`                    | Off-chain evidence reference recorded |
| `InspectionApproved` | rental_agreement          | `agreement_id`                                 | Landlord approved a clean move-out    |
| `DeductionProposed`  | dispute                   | `agreement_id, amount`                         | Landlord proposed a deduction         |
| `SettlementAccepted` | rental_agreement          | `agreement_id, tenant_amount, landlord_amount` | Deduction settlement agreed           |
| `DisputeOpened`      | dispute                   | `agreement_id`                                 | A dispute was opened                  |
| `DisputeResolved`    | dispute                   | `agreement_id, to_tenant, to_landlord`         | Dispute resolved with release amounts |
| `DepositReleased`    | escrow                    | `agreement_id, amount`                         | Funds released from the lock          |
| `AgreementClosed`    | rental_agreement          | `agreement_id`                                 | Lifecycle complete                    |

Topic/data payloads are phase-1 placeholders; they will be enriched (Address
actors, amounts in stroops) as contracts mature — keep the _names_ stable so
the UI timeline and indexed data keep working.
