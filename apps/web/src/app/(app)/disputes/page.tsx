"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconScale, IconChevronRight } from "@/components/icons";
import { formatINR, shortAddress } from "@trustrent/shared";
import { MOCK_AGREEMENTS } from "@/data/mock-data";
import { useDisputes } from "@/hooks";
import { useRole } from "@/components/role-provider";
import { updateDispute } from "@/services/disputes-store";

export default function DisputesPage() {
  const disputes = useDisputes();
  const { role } = useRole();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Disputes
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          When sides disagree, the deposit stays locked until the dispute
          resolves — by design.
        </p>
      </header>

      {disputes.length === 0 ? (
        <EmptyState
          icon={<IconScale className="size-8" />}
          title="No open disputes"
          description="No disputes have been filed yet. Open disputes appear here with their evidence, proposed deductions and resolution status."
        />
      ) : (
        <ul className="space-y-3">
          {disputes.map((dispute) => {
            const agreement = MOCK_AGREEMENTS.find(
              (a) => a.id === dispute.agreementId,
            );
            return (
              <li key={dispute.id}>
                <DisputeCard
                  dispute={dispute}
                  agreement={agreement}
                  role={role}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <ExplainCard
          n="1"
          title="Deposit stays locked"
          text="While a dispute is open, the escrow contract releases nothing to either side."
        />
        <ExplainCard
          n="2"
          title="Both sides submit evidence"
          text="References to off-chain files are recorded on-chain with submitter and timestamp."
        />
        <ExplainCard
          n="3"
          title="Resolution releases funds"
          text="Agreed deduction splits the deposit; amounts are released by the contract, not by hand."
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dispute Card                                                        */
/* ------------------------------------------------------------------ */

function DisputeCard({
  dispute,
  agreement,
  role,
}: {
  dispute: import("@trustrent/types").DisputeRecord;
  agreement?: import("@trustrent/types").Agreement;
  role: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOpened = dispute.state === "OPENED";
  const isUnderReview = dispute.state === "UNDER_REVIEW";
  const isResolved = dispute.state === "RESOLVED";
  const deposit = agreement?.deposit.value ?? 0;

  function handleAssignArbitrator() {
    updateDispute(dispute.id, {
      state: "UNDER_REVIEW",
      arbitrator: "GARBITRATOR00000000000000000006",
    });
  }

  function handleResolve() {
    updateDispute(dispute.id, {
      state: "RESOLVED",
      resolvedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink-900">
              {dispute.id}
            </h2>
            <DisputeStateBadge state={dispute.state} />
          </div>
          {agreement && (
            <Link
              href={`/agreements/${agreement.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
            >
              {agreement.property.name} · {agreement.id}
              <IconChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
        <div className="text-right">
          {dispute.proposedDeduction && (
            <div>
              <p className="text-xs text-ink-400">Proposed deduction</p>
              <p className="text-lg font-semibold tracking-tight text-danger-600">
                {formatINR(dispute.proposedDeduction.value)}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-500">{dispute.reason}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <span className="text-xs text-ink-400">
          Opened{" "}
          {new Date(dispute.openedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {dispute.arbitrator && (
          <span className="text-xs text-ink-400">
            Arbitrator: {shortAddress(dispute.arbitrator)}
          </span>
        )}
        {agreement && (
          <span className="text-xs text-ink-400">
            Deposit: {formatINR(deposit)}
          </span>
        )}
        {isResolved && dispute.resolvedAt && (
          <span className="text-xs text-ink-400">
            Resolved{" "}
            {new Date(dispute.resolvedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* ── Footer with expand + view details ── */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          {!isResolved && dispute.proposedDeduction && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-forest-700 hover:text-forest-800"
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
        <Link href={`/disputes/${dispute.id}`}>
          <Button variant="secondary" size="sm">
            View details <IconChevronRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* ── Expandable detail with actions ── */}
      {expanded && !isResolved && dispute.proposedDeduction && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-ivory-50/60 p-4 text-sm">
          {/* Breakdown */}
          <div>
            <p className="text-xs font-medium text-ink-400 mb-1.5">
              Breakdown
            </p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-ink-600">Tenant refund</span>
                <span className="font-medium text-ink-900">
                  {formatINR(deposit - dispute.proposedDeduction.value)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-600">Landlord receives</span>
                <span className="font-medium text-ink-900">
                  {formatINR(dispute.proposedDeduction.value)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-ink-600">Deposit locked</span>
                <span className="font-medium text-amber-600">
                  {formatINR(deposit)}
                </span>
              </div>
            </div>
          </div>

          {/* Status hint */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {isOpened && !dispute.arbitrator && (
              <>
                <span className="font-semibold">Action needed:</span> Assign an
                arbitrator to review the dispute.
              </>
            )}
            {isUnderReview && (
              <>
                <span className="font-semibold">In progress:</span> The
                arbitrator is reviewing evidence from both sides.
              </>
            )}
          </div>

          {/* Actions */}
          {isOpened && !dispute.arbitrator && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAssignArbitrator}>
                Assign arbitrator
              </Button>
            </div>
          )}

          {isUnderReview && (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateDispute(dispute.id, { state: "OPENED" })
                }
              >
                Reopen
              </Button>
              <Button size="sm" onClick={handleResolve}>
                Resolve dispute
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Resolved banner ── */}
      {isResolved && (
        <div className="mt-3 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
          Dispute resolved. The escrow has released the deposit according to the
          settlement terms.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function DisputeStateBadge({ state }: { state: string }) {
  const tones: Record<
    string,
    {
      label: string;
      tone: "forest" | "sage" | "amber" | "danger" | "neutral";
    }
  > = {
    OPENED: { label: "Opened", tone: "danger" },
    UNDER_REVIEW: { label: "Under review", tone: "amber" },
    RESOLVED: { label: "Resolved", tone: "sage" },
  };
  const meta = tones[state] ?? { label: state, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function ExplainCard({
  n,
  title,
  text,
}: {
  n: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <span className="flex size-6 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-600">
        {n}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{text}</p>
    </div>
  );
}
