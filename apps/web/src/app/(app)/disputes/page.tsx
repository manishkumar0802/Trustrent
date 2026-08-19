"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconScale, IconChevronRight } from "@/components/icons";
import { formatINR, shortAddress } from "@trustrent/shared";
import { MOCK_AGREEMENTS } from "@/data/mock-data";
import { useDisputes } from "@/hooks";

export default function DisputesPage() {
  const disputes = useDisputes();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Disputes</h1>
        <p className="mt-1 text-sm text-ink-400">
          When sides disagree, the deposit stays locked until the dispute resolves — by design.
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
            const agreement = MOCK_AGREEMENTS.find((a) => a.id === dispute.agreementId);
            return (
              <li key={dispute.id}>
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
                      Opened {new Date(dispute.openedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {dispute.arbitrator && (
                      <span className="text-xs text-ink-400">
                        Arbitrator: {shortAddress(dispute.arbitrator)}
                      </span>
                    )}
                    {agreement && (
                      <span className="text-xs text-ink-400">
                        Deposit: {formatINR(agreement.deposit.value)}
                      </span>
                    )}
                  </div>
                </div>
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

function DisputeStateBadge({ state }: { state: string }) {
  const tones: Record<string, { label: string; tone: "forest" | "sage" | "amber" | "danger" | "neutral" }> = {
    OPENED: { label: "Opened", tone: "danger" },
    UNDER_REVIEW: { label: "Under review", tone: "amber" },
    RESOLVED: { label: "Resolved", tone: "sage" },
  };
  const meta = tones[state] ?? { label: state, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function ExplainCard({ n, title, text }: { n: string; title: string; text: string }) {
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
