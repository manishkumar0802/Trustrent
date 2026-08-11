import type { ReactNode } from "react";
import type { Agreement } from "@trustrent/types";
import { formatINR } from "@trustrent/shared";
import { IconCheck, IconClock, IconShield } from "../icons";

/**
 * Three compact trust signals rendered under the deposit hero:
 *   ✓ Agreement active · ✓ Rent status · ✓ Deposit protected
 */
export function StatusCards({ agreement }: { agreement: Agreement }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatusCard
        icon={<IconCheck className="size-4 text-forest-700" />}
        label="Agreement"
        value={agreement.state === "ACTIVE" ? "Active" : "In progress"}
        note={`Since ${new Date(agreement.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`}
      />
      <StatusCard
        icon={<IconClock className="size-4 text-amber-600" />}
        label="Rent status"
        value={`${formatINR(agreement.rent.value)} / month`}
        note="Paid · due 1st of month"
      />
      <StatusCard
        icon={<IconShield className="size-4 text-forest-700" />}
        label="Deposit"
        value="Protected"
        note="Escrow-locked · contract-controlled release"
      />
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          {label}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-400">{note}</p>
    </div>
  );
}
