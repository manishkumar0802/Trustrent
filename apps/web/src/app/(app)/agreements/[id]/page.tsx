"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRole } from "@/components/role-provider";
import { getMockAgreement, MOCK_DISPUTES } from "@/data/mock-data";
import { DepositHero } from "@/components/deposit/deposit-hero";
import { StatusCards } from "@/components/deposit/status-cards";
import { LifecycleTimeline } from "@/components/deposit/lifecycle-timeline";
import { EvidencePanel } from "@/components/deposit/evidence-panel";
import { ActivityFeed } from "@/components/deposit/activity-feed";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { IconArrowLeft, IconHome, IconScale, IconUser, IconChevronRight } from "@/components/icons";
import { MOCK_EVENTS, getMockReputation } from "@/data/mock-data";
import { formatINR, shortAddress } from "@trustrent/shared";
import type { Party } from "@trustrent/types";

export default function AgreementDetailPage() {
  const params = useParams<{ id: string }>();
  const { role } = useRole();
  const agreement = getMockAgreement(params.id);

  if (!agreement) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={<IconHome className="size-8" />}
          title="Agreement not found"
          description={`No agreement matches "${params.id}". Demo data covers AG-1042, AG-1017, AG-0982.`}
        />
      </div>
    );
  }

  const evidence = agreement.moveOut?.evidence ?? [];
  const dispute = MOCK_DISPUTES.find((d) => d.agreementId === agreement.id);

  return (
    <div className="space-y-8">
      <BackLink />

      <DepositHero agreement={agreement} role={role} />
      <StatusCards agreement={agreement} />

      <Card>
        <CardBody>
          <LifecycleTimeline current={agreement.state} disputed={agreement.state === "DISPUTED"} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Parties & reputation"
          subtitle="Roles and registry scores — outcomes adjust reputation"
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <PartyCard party={agreement.landlord} />
          <PartyCard party={agreement.tenant} />
        </CardBody>
      </Card>

      {/* Settlement info */}
      {agreement.settlement && (
        <Card>
          <CardHeader title="Settlement" subtitle="Deposit was released" />
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-800">
                  {agreement.settlement.type === "FULL_REFUND"
                    ? "Full refund"
                    : agreement.settlement.type === "PARTIAL_DEDUCTION"
                      ? "Partial deduction"
                      : "Dispute locked"}
                </p>
                <p className="text-xs text-ink-400">
                  Settled {new Date(agreement.settlement.settledAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-ivory-50/60 p-3 text-sm">
                <p className="text-ink-400">Tenant received</p>
                <p className="mt-1 font-semibold text-ink-900">{formatINR(agreement.settlement.tenantAmount.value)}</p>
              </div>
              <div className="rounded-lg border border-border bg-ivory-50/60 p-3 text-sm">
                <p className="text-ink-400">Landlord received</p>
                <p className="mt-1 font-semibold text-ink-900">{formatINR(agreement.settlement.landlordAmount.value)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Dispute info */}
      {dispute && (
        <Card>
          <CardHeader
            title="Active dispute"
            subtitle={`Filed ${new Date(dispute.openedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
            action={
              dispute.state === "RESOLVED" ? (
                <Badge tone="sage">Resolved</Badge>
              ) : dispute.state === "UNDER_REVIEW" ? (
                <Badge tone="amber">Under review</Badge>
              ) : (
                <Badge tone="danger">Opened</Badge>
              )
            }
          />
          <CardBody className="space-y-3">
            <p className="text-sm text-ink-500">{dispute.reason}</p>
            {dispute.proposedDeduction && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm">
                <p className="font-semibold text-danger-600">
                  Proposed deduction: {formatINR(dispute.proposedDeduction.value)}
                </p>
              </div>
            )}
            {dispute.arbitrator && (
              <p className="text-xs text-ink-400">
                Arbitrator: {shortAddress(dispute.arbitrator)}
              </p>
            )}
            <Link href="/disputes">
              <Button variant="secondary" size="sm">
                View dispute details <IconChevronRight className="size-3.5" />
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Move-out evidence" subtitle="References only — files live off-chain" />
          <CardBody>
            <EvidencePanel evidence={evidence} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Activity" subtitle="Contract events" />
          <CardBody>
            <ActivityFeed events={MOCK_EVENTS.filter((e) => e.agreementId === agreement.id)} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function PartyCard({ party }: { party: Party }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ivory-100 text-ink-400">
          <IconUser className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-800">{party.name}</p>
          <p className="truncate font-mono text-[11px] text-ink-400">{party.address}</p>
        </div>
      </div>
      <ReputationBadge score={getMockReputation(party.address)} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/agreements"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
    >
      <IconArrowLeft className="size-4" /> All agreements
    </Link>
  );
}
