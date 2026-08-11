import type { AgreementState, DepositStatus } from "@trustrent/types";
import { Badge, type BadgeTone } from "./badge";

const STATE_META: Record<AgreementState, { label: string; tone: BadgeTone }> = {
  CREATED: { label: "Created", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "forest" },
  MOVE_OUT_REQUESTED: { label: "Move-out requested", tone: "amber" },
  EVIDENCE_SUBMITTED: { label: "Evidence submitted", tone: "amber" },
  INSPECTION_PENDING: { label: "Inspection pending", tone: "amber" },
  APPROVED: { label: "Approved", tone: "forest" },
  DISPUTED: { label: "Disputed", tone: "danger" },
  SETTLEMENT: { label: "Settlement", tone: "sage" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export function AgreementStatusBadge({ state }: { state: AgreementState }) {
  const meta = STATE_META[state];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const DEPOSIT_META: Record<DepositStatus, { label: string; tone: BadgeTone }> = {
  LOCKED: { label: "Locked in escrow", tone: "forest" },
  PARTIALLY_RELEASED: { label: "Partially released", tone: "amber" },
  RELEASED: { label: "Released", tone: "sage" },
  DISPUTED: { label: "Disputed", tone: "danger" },
};

export function DepositStatusBadge({ status }: { status: DepositStatus }) {
  const meta = DEPOSIT_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
