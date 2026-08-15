import type { Metadata } from "next";
import Link from "next/link";
import { formatINR, lifecycleIndex } from "@trustrent/shared";
import { MOCK_AGREEMENTS } from "@/data/mock-data";
import { AgreementStatusBadge } from "@/components/ui/status-badge";
import { IconChevronRight } from "@/components/icons";
import type { Agreement } from "@trustrent/types";

export const metadata: Metadata = { title: "Agreements" };

export default function AgreementsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Agreements</h1>
          <p className="mt-1 text-sm text-ink-400">
            Rental agreements with escrow-locked security deposits.
          </p>
        </div>
        <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink-400">
          Demo data · phase 1
        </span>
      </header>

      <ul className="space-y-3">
        {MOCK_AGREEMENTS.map((agreement) => (
          <AgreementRow key={agreement.id} agreement={agreement} />
        ))}
      </ul>
    </div>
  );
}

function AgreementRow({ agreement }: { agreement: Agreement }) {
  const progress = Math.round((lifecycleIndex(agreement.state) / 8) * 100);

  return (
    <li>
      <Link
        href={`/agreements/${agreement.id}`}
        className="block rounded-2xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink-900">{agreement.property.name}</h2>
              <AgreementStatusBadge state={agreement.state} />
            </div>
            <p className="mt-1 text-sm text-ink-400">
              {agreement.property.locality}, {agreement.property.city} · {agreement.id}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-tight text-ink-900">
              {formatINR(agreement.deposit.value)}
            </p>
            <p className="text-xs text-ink-400">deposit · {formatINR(agreement.rent.value)}/mo</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-100">
            <div className="h-full rounded-full bg-forest-700" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-ink-500">{progress}% of lifecycle</span>
          <IconChevronRight className="size-4 text-ink-300" />
        </div>
      </Link>
    </li>
  );
}
