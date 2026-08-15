import type { Metadata } from "next";
import Link from "next/link";
import { formatINR } from "@trustrent/shared";
import { MOCK_AGREEMENTS, MOCK_EVENTS } from "@/data/mock-data";
import { StatusCards } from "@/components/deposit/status-cards";
import { ActivityFeed } from "@/components/deposit/activity-feed";
import { CurrentUserReputation } from "@/components/deposit/current-user-reputation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { IconChevronRight, IconLock } from "@/components/icons";
import { AgreementStatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const primary = MOCK_AGREEMENTS[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-ink-400">Welcome back</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {primary.tenant.name} · {primary.property.locality}
          </h1>
          <CurrentUserReputation landlord={primary.landlord} tenant={primary.tenant} />
        </div>
        <p className="mt-1 text-sm text-ink-400">
          Your security deposit is safe, visible and contract-controlled.
        </p>
      </header>

      {/* Deposit summary — the hero concept */}
      <Link
        href={`/agreements/${primary.id}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-forest-800 text-ivory-50 shadow-card transition-shadow hover:shadow-pop"
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-700/70 px-2.5 py-1 text-[11px] font-medium text-forest-100">
                <IconLock className="size-3" /> LOCKED IN ESCROW
              </span>
              <AgreementStatusBadge state={primary.state} />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {formatINR(primary.deposit.value)}
            </p>
            <p className="mt-1 text-sm text-forest-100/80">
              Security deposit · {primary.property.name}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-forest-100 transition-transform group-hover:translate-x-0.5">
            View agreement <IconChevronRight className="size-4" />
          </span>
        </div>
      </Link>

      <StatusCards agreement={primary} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Recent activity"
            subtitle="On-chain events (Soroban) — demo data in phase 1"
          />
          <CardBody>
            <ActivityFeed events={MOCK_EVENTS} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Your agreements" subtitle="Demo data · phase 1" />
          <CardBody className="space-y-3">
            {MOCK_AGREEMENTS.slice(0, 3).map((agreement) => (
              <Link
                key={agreement.id}
                href={`/agreements/${agreement.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-ink-300 hover:bg-ivory-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {agreement.property.name}
                  </p>
                  <p className="text-xs text-ink-400">
                    {agreement.id} · {formatINR(agreement.deposit.value)} deposit
                  </p>
                </div>
                <AgreementStatusBadge state={agreement.state} />
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
