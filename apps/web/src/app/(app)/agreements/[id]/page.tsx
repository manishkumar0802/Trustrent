"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRole } from "@/components/role-provider";
import { getMockAgreement } from "@/data/mock-data";
import { DepositHero } from "@/components/deposit/deposit-hero";
import { StatusCards } from "@/components/deposit/status-cards";
import { LifecycleTimeline } from "@/components/deposit/lifecycle-timeline";
import { EvidencePanel } from "@/components/deposit/evidence-panel";
import { ActivityFeed } from "@/components/deposit/activity-feed";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { IconArrowLeft, IconHome, IconUser } from "@/components/icons";
import { MOCK_EVENTS, getMockReputation } from "@/data/mock-data";
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
          description={`No agreement matches “${params.id}”. Demo data covers ${"AG-1042, AG-1017, AG-0982"}.`}
        />
      </div>
    );
  }

  const evidence = agreement.moveOut?.evidence ?? [];

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
          subtitle="Roles and registry scores — neutral baseline 50, outcomes adjust it"
        />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <PartyCard party={agreement.landlord} />
          <PartyCard party={agreement.tenant} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Move-out evidence" subtitle="References only — files live off-chain" />
          <CardBody>
            <EvidencePanel evidence={evidence} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Activity" subtitle="Soroban contract events · demo" />
          <CardBody>
            <ActivityFeed events={MOCK_EVENTS.filter((e) => e.agreementId === agreement.id)} />
          </CardBody>
        </Card>
      </div>

      <p className="text-center text-xs text-ink-300">
        Phase 1 scaffold — this page renders mock data. On-chain reads land in phase 2 via{" "}
        <code className="rounded bg-ivory-100 px-1 py-0.5 text-ink-500">@trustrent/blockchain</code>
        .
      </p>
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
