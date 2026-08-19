"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDisputes } from "@/hooks";
import { MOCK_AGREEMENTS } from "@/data/mock-data";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconScale } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINR, shortAddress } from "@trustrent/shared";
import { useRole } from "@/components/role-provider";
import { updateDispute } from "@/services/disputes-store";
import type { DisputeRecord } from "@trustrent/types";

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const disputes = useDisputes();
  const { role } = useRole();
  const dispute = disputes.find((d) => d.id === params.id);

  if (!dispute) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={<IconScale className="size-8" />}
          title="Dispute not found"
          description={`No dispute matches "${params.id}". It may have been removed or the ID is incorrect.`}
        />
      </div>
    );
  }

  const agreement = MOCK_AGREEMENTS.find((a) => a.id === dispute.agreementId);
  const deposit = agreement?.deposit.value ?? 0;

  return (
    <div className="space-y-6">
      <BackLink />

      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {dispute.id}
            </h1>
            <DisputeStateBadge state={dispute.state} />
          </div>
          {agreement && (
            <Link
              href={`/agreements/${agreement.id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
            >
              {agreement.property.name} · {agreement.id}
            </Link>
          )}
          <p className="mt-1 text-sm text-ink-400">
            Filed {new Date(dispute.openedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {role === "landlord" ? "Landlord" : "Tenant"} view
          </p>
        </div>
        {dispute.proposedDeduction && (
          <div className="text-right">
            <p className="text-xs text-ink-400">Proposed deduction</p>
            <p className="text-2xl font-semibold tracking-tight text-danger-600">
              {formatINR(dispute.proposedDeduction.value)}
            </p>
          </div>
        )}
      </header>

      {/* ── Timeline ── */}
      <Card>
        <CardBody>
          <DisputeTimeline dispute={dispute} />
        </CardBody>
      </Card>

      {/* ── Main content grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: breakdown + reason */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reason */}
          <Card>
            <CardHeader title="Dispute reason" subtitle="Filed by tenant" />
            <CardBody>
              <p className="text-sm text-ink-600">{dispute.reason}</p>
            </CardBody>
          </Card>

          {/* Financial breakdown */}
          {dispute.proposedDeduction && (
            <Card>
              <CardHeader title="Financial breakdown" subtitle="How the deposit would be split" />
              <CardBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-ivory-50/60 p-4 text-center">
                    <p className="text-xs text-ink-400">Total deposit</p>
                    <p className="mt-1 text-xl font-semibold text-ink-900">{formatINR(deposit)}</p>
                  </div>
                  <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 text-center">
                    <p className="text-xs text-forest-600">Tenant refund</p>
                    <p className="mt-1 text-xl font-semibold text-forest-800">
                      {formatINR(deposit - dispute.proposedDeduction.value)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-center">
                    <p className="text-xs text-danger-600">Landlord receives</p>
                    <p className="mt-1 text-xl font-semibold text-danger-700">
                      {formatINR(dispute.proposedDeduction.value)}
                    </p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex h-3">
                    <div
                      className="bg-forest-500 transition-all"
                      style={{ width: `${((deposit - dispute.proposedDeduction.value) / deposit) * 100}%` }}
                    />
                    <div
                      className="bg-danger-500 transition-all"
                      style={{ width: `${(dispute.proposedDeduction.value / deposit) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between px-3 py-2 text-xs text-ink-400">
                    <span>Tenant {Math.round(((deposit - dispute.proposedDeduction.value) / deposit) * 100)}%</span>
                    <span>Landlord {Math.round((dispute.proposedDeduction.value / deposit) * 100)}%</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right column: arbitrator + actions */}
        <div className="space-y-6">
          {/* Arbitrator */}
          <Card>
            <CardHeader title="Arbitrator" subtitle="Independent reviewer" />
            <CardBody>
              {dispute.arbitrator ? (
                <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                    <IconScale className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">Assigned</p>
                    <p className="truncate font-mono text-[11px] text-ink-400">
                      {shortAddress(dispute.arbitrator)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No arbitrator assigned yet. Assign one to begin the review.
                </div>
              )}
            </CardBody>
          </Card>

          {/* Deposit status */}
          <Card>
            <CardHeader title="Escrow status" />
            <CardBody>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <p className="font-semibold">Deposit locked</p>
                <p className="mt-1">
                  {formatINR(deposit)} remains in escrow until this dispute is
                  resolved.
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader title="Actions" subtitle="Manage this dispute" />
            <CardBody className="space-y-3">
              {dispute.state === "OPENED" && !dispute.arbitrator && (
                <Button
                  className="w-full"
                  onClick={() =>
                    updateDispute(dispute.id, {
                      state: "UNDER_REVIEW",
                      arbitrator: "GARBITRATOR00000000000000000006",
                    })
                  }
                >
                  Assign arbitrator
                </Button>
              )}

              {dispute.state === "UNDER_REVIEW" && (
                <>
                  <Button
                    className="w-full"
                    onClick={() =>
                      updateDispute(dispute.id, {
                        state: "RESOLVED",
                        resolvedAt: new Date().toISOString(),
                      })
                    }
                  >
                    Resolve dispute
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      updateDispute(dispute.id, { state: "OPENED" })
                    }
                  >
                    Reopen dispute
                  </Button>
                </>
              )}

              {dispute.state === "RESOLVED" && (
                <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
                  This dispute has been resolved.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function DisputeTimeline({ dispute }: { dispute: DisputeRecord }) {
  const steps = [
    {
      label: "Opened",
      done: true,
      date: dispute.openedAt,
    },
    {
      label: "Arbitrator assigned",
      done: !!dispute.arbitrator,
      date: dispute.arbitrator ? dispute.openedAt : undefined,
    },
    {
      label: "Under review",
      done: dispute.state === "UNDER_REVIEW" || dispute.state === "RESOLVED",
      date: dispute.state !== "OPENED" ? dispute.openedAt : undefined,
    },
    {
      label: "Resolved",
      done: dispute.state === "RESOLVED",
      date: dispute.resolvedAt,
    },
  ];

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <span
              className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? "bg-forest-600 text-white"
                  : "border-2 border-border bg-surface text-ink-400"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <span className="mt-1.5 text-[11px] font-medium text-ink-500 whitespace-nowrap">
              {step.label}
            </span>
            {step.date && (
              <span className="mt-0.5 text-[10px] text-ink-300">
                {new Date(step.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-8 sm:w-12 ${
                step.done && steps[i + 1].done
                  ? "bg-forest-500"
                  : step.done
                    ? "bg-forest-300"
                    : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function DisputeStateBadge({ state }: { state: string }) {
  const tones: Record<string, { label: string; tone: "forest" | "sage" | "amber" | "danger" | "neutral" }> = {
    OPENED: { label: "Opened", tone: "danger" },
    UNDER_REVIEW: { label: "Under review", tone: "amber" },
    RESOLVED: { label: "Resolved", tone: "sage" },
  };
  const meta = tones[state] ?? { label: state, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function BackLink() {
  return (
    <Link
      href="/disputes"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
    >
      <IconArrowLeft className="size-4" /> All disputes
    </Link>
  );
}
