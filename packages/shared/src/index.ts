import type { AgreementState, ContractEventName, DepositStatus, Role } from "@trustrent/types";

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

export interface LifecycleStep {
  state: AgreementState;
  label: string;
  description: string;
}

/** Ordered lifecycle — must mirror the on-chain state machine. */
export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    state: "CREATED",
    label: "Agreement created",
    description: "Landlord sets terms",
  },
  {
    state: "ACTIVE",
    label: "Active",
    description: "Tenant joined, deposit locked",
  },
  {
    state: "MOVE_OUT_REQUESTED",
    label: "Move-out requested",
    description: "Tenant notifies",
  },
  {
    state: "EVIDENCE_SUBMITTED",
    label: "Evidence submitted",
    description: "Final dues + condition",
  },
  {
    state: "INSPECTION_PENDING",
    label: "Inspection pending",
    description: "Landlord reviews",
  },
  { state: "APPROVED", label: "Approved", description: "Clean move-out" },
  { state: "DISPUTED", label: "Disputed", description: "Escrow stays locked" },
  {
    state: "SETTLEMENT",
    label: "Settlement",
    description: "Deposit split agreed",
  },
  { state: "CLOSED", label: "Closed", description: "Funds released, done" },
];

export const LIFECYCLE_STATE_ORDER: AgreementState[] = LIFECYCLE_STEPS.map((s) => s.state);

export function lifecycleIndex(state: AgreementState): number {
  const i = LIFECYCLE_STATE_ORDER.indexOf(state);
  return i === -1 ? 0 : i;
}

export function isActiveOrLater(state: AgreementState, target: AgreementState): boolean {
  return lifecycleIndex(state) >= lifecycleIndex(target);
}

/* ------------------------------------------------------------------ */
/* Event catalog                                                       */
/* ------------------------------------------------------------------ */

export const EVENT_LABELS: Record<ContractEventName, string> = {
  AgreementCreated: "Agreement created",
  TenantJoined: "Tenant joined",
  DepositLocked: "Deposit locked in escrow",
  MoveOutRequested: "Move-out requested",
  EvidenceSubmitted: "Evidence submitted",
  InspectionApproved: "Inspection approved",
  DeductionProposed: "Deduction proposed",
  SettlementAccepted: "Settlement accepted",
  DisputeOpened: "Dispute opened",
  DisputeResolved: "Dispute resolved",
  DepositReleased: "Deposit released",
  AgreementClosed: "Agreement closed",
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹30,000 style formatting (Indian digit grouping). */
export function formatINR(value: number): string {
  return `₹${inr.format(value)}`;
}

/** Shorten a Stellar address for display: GABCD…WXYZ */
export function shortAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Format an ISO timestamp for the activity feed. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Demo-safe guard: role-aware headline copy. */
export function roleLabel(role: Role): string {
  return role === "landlord" ? "Landlord" : "Tenant";
}
