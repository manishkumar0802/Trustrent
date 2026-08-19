"use client";

import Link from "next/link";
import { formatINR } from "@trustrent/shared";
import { MOCK_AGREEMENTS, MOCK_EVENTS } from "@/data/mock-data";
import { StatusCards } from "@/components/deposit/status-cards";
import { ActivityFeed } from "@/components/deposit/activity-feed";
import { CurrentUserReputation } from "@/components/deposit/current-user-reputation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChevronRight, IconLock } from "@/components/icons";
import { AgreementStatusBadge } from "@/components/ui/status-badge";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { useRole } from "@/components/role-provider";

export default function DashboardPage() {
  const { role } = useRole();
  const primary = MOCK_AGREEMENTS[0];
  const activeParty = role === "landlord" ? primary.landlord : primary.tenant;
  const quickStats = [
    {
      label: "Deposit locked",
      value: formatINR(primary.deposit.value),
      detail: `${primary.property.name}`,
    },
    {
      label: "Status",
      value: primary.state === "ACTIVE" ? "Active" : "In progress",
      detail: "Escrow rules are in force",
    },
    {
      label: "Next step",
      value: role === "landlord"
        ? (primary.state === "ACTIVE" ? "Awaiting move-out" : "Review evidence")
        : (primary.state === "ACTIVE" ? "Submit evidence" : "Review outcome"),
      detail: role === "landlord" ? "You review and inspect" : "Keep the process transparent",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-400">Welcome back, {role === "landlord" ? "landlord" : "tenant"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {activeParty.name} · {primary.property.locality}
            </h1>
            <CurrentUserReputation landlord={primary.landlord} tenant={primary.tenant} />
          </div>
          <p className="mt-1 text-sm text-ink-400">
            {role === "landlord"
              ? "You manage deposits and review move-outs for your properties."
              : "Your security deposit is safe, visible and contract-controlled."}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <WalletConnectButton />
          {role === "landlord" ? (
            <>
              <Link href="/move-out">
                <Button variant="secondary" size="sm">
                  Review move-out
                </Button>
              </Link>
              <Link href="/disputes">
                <Button variant="primary" size="sm">
                  Disputes
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/move-out">
                <Button variant="secondary" size="sm">
                  Submit evidence
                </Button>
              </Link>
              <Link href="/disputes">
                <Button variant="primary" size="sm">
                  View disputes
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Link
          href={`/agreements/${primary.id}`}
          className="group block overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 text-ivory-50 shadow-card transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-pop"
        >
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-100 ring-1 ring-white/15">
                  <IconLock className="size-3" /> LOCKED IN ESCROW
                </span>
                <AgreementStatusBadge state={primary.state} />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatINR(primary.deposit.value)}
              </p>
              <p className="mt-1 text-sm text-zinc-200">Security deposit · {primary.property.name}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-100 transition-transform group-hover:translate-x-0.5">
              View agreement <IconChevronRight className="size-4" />
            </span>
          </div>
        </Link>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-300">
                {stat.label}
              </p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-ink-900">{stat.value}</p>
              <p className="mt-1 text-xs text-ink-400">{stat.detail}</p>
            </div>
          ))}
        </div>
      </div>

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
