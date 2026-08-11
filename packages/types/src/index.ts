/**
 * TrustRent shared domain types.
 *
 * These interfaces mirror the on-chain state machine implemented by the
 * Soroban contracts (see `contracts/` and `ARCHITECTURE.md`). The web app, the
 * API and the blockchain client package all share this single source of truth.
 *
 * State names intentionally match the contract lifecycle:
 * CREATED → ACTIVE → MOVE_OUT_REQUESTED → EVIDENCE_SUBMITTED →
 * INSPECTION_PENDING → APPROVED / DISPUTED → SETTLEMENT → CLOSED
 */

export type Role = "landlord" | "tenant";

/* ------------------------------------------------------------------ */
/* Agreement lifecycle                                                 */
/* ------------------------------------------------------------------ */

export const AGREEMENT_STATES = [
  "CREATED",
  "ACTIVE",
  "MOVE_OUT_REQUESTED",
  "EVIDENCE_SUBMITTED",
  "INSPECTION_PENDING",
  "APPROVED",
  "DISPUTED",
  "SETTLEMENT",
  "CLOSED",
] as const;

export type AgreementState = (typeof AGREEMENT_STATES)[number];

export const MOVE_OUT_STAGES = [
  "REQUESTED",
  "EVIDENCE_SUBMITTED",
  "INSPECTION_PENDING",
  "APPROVED",
  "DISPUTED",
  "SETTLED",
] as const;

export type MoveOutStage = (typeof MOVE_OUT_STAGES)[number];

export const DISPUTE_STATES = ["OPENED", "UNDER_REVIEW", "RESOLVED"] as const;
export type DisputeState = (typeof DISPUTE_STATES)[number];

export const DEPOSIT_STATUSES = [
  "LOCKED",
  "PARTIALLY_RELEASED",
  "RELEASED",
  "DISPUTED",
] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const SETTLEMENT_TYPES = [
  "FULL_REFUND",
  "PARTIAL_DEDUCTION",
  "DISPUTE_LOCKED",
] as const;

export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

export const EVIDENCE_KINDS = [
  "FINAL_DUES",
  "ROOM_CONDITION",
  "DISPUTE_SUPPORT",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

/** Amount expressed in the smallest unit of a token; `currency` is a display hint only. */
export interface MoneyAmount {
  value: number;
  currency: "INR";
}

export interface Party {
  address: string; // Stellar public key (placeholder in phase 1)
  name: string;
  role: Role;
}

export interface Property {
  id: string;
  name: string;
  locality: string;
  city: string;
  rooms: number;
}

export interface EvidenceReference {
  id: string;
  agreementId: string;
  submitter: Role;
  kind: EvidenceKind;
  /** Content-address / hash of the payload stored OFF-chain. Never the file itself. */
  contentHash: string;
  storage: {
    provider: "local" | "ipfs" | "arweave" | "s3" | "other";
    uri: string;
  };
  submittedAt: string; // ISO 8601
}

export interface DeductionProposal {
  id: string;
  amount: MoneyAmount;
  reason: string;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED";
  proposedBy: Role;
  proposedAt: string;
}

export interface Settlement {
  type: SettlementType;
  tenantAmount: MoneyAmount;
  landlordAmount: MoneyAmount;
  settledAt: string;
}

export interface Agreement {
  id: string;
  state: AgreementState;
  property: Property;
  landlord: Party;
  tenant: Party;
  rent: MoneyAmount;
  deposit: MoneyAmount;
  /** Contract-visible deposit status (mirrors the escrow lock). */
  depositStatus: DepositStatus;
  escrowContractId: string; // testnet placeholder
  createdAt: string;
  moveOut?: {
    stage: MoveOutStage;
    requestedAt: string;
    evidence: EvidenceReference[];
  };
  deduction?: DeductionProposal;
  settlement?: Settlement;
}

export interface DisputeRecord {
  id: string;
  agreementId: string;
  initiator: Role;
  reason: string;
  state: DisputeState;
  proposedDeduction?: MoneyAmount;
  openedAt: string;
  resolvedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Contract events (consumed by the activity timeline)                 */
/* ------------------------------------------------------------------ */

/**
 * Canonical Soroban event names. Keep in sync with
 * `contracts/common/src/lib.rs` (`tr_common::events`).
 */
export const CONTRACT_EVENT_NAMES = [
  "AgreementCreated",
  "TenantJoined",
  "DepositLocked",
  "MoveOutRequested",
  "EvidenceSubmitted",
  "InspectionApproved",
  "DeductionProposed",
  "SettlementAccepted",
  "DisputeOpened",
  "DisputeResolved",
  "DepositReleased",
  "AgreementClosed",
] as const;

export type ContractEventName = (typeof CONTRACT_EVENT_NAMES)[number];

export interface ContractEvent {
  id: string;
  name: ContractEventName;
  agreementId: string;
  actor: Role;
  /** Ledger sequence / timestamp on-chain; ISO string off-chain. */
  timestamp: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Storage abstraction (off-chain evidence)                            */
/* ------------------------------------------------------------------ */

export interface StorageProvider {
  readonly id: "local" | "ipfs" | "arweave" | "s3" | "other";
  /** Upload a payload and return a content reference (CID/hash + URI). */
  put(
    payload: Blob | Uint8Array,
    meta?: Record<string, unknown>,
  ): Promise<EvidenceReference["storage"]>;
  /** Fetch a payload by its stored reference. */
  get(ref: EvidenceReference["storage"]): Promise<Blob>;
}
