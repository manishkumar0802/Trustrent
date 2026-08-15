import type { Agreement } from "@trustrent/types";
import { formatINR, shortAddress } from "@trustrent/shared";
import { Button } from "../ui/button";
import { DepositStatusBadge } from "../ui/status-badge";
import { IconLock, IconShield, IconWallet } from "../icons";

/**
 * The security deposit is the hero concept. A tenant should immediately see:
 *
 *   SECURITY DEPOSIT  ₹30,000  LOCKED IN ESCROW
 */
export function DepositHero({
  agreement,
  role,
}: {
  agreement: Agreement;
  role: "landlord" | "tenant";
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Security deposit
            </span>
            <DepositStatusBadge status={agreement.depositStatus} />
          </div>

          <p className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            {formatINR(agreement.deposit.value)}
          </p>

          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2">
            <IconLock className="size-4 text-forest-700" />
            <span className="text-sm font-semibold text-forest-800">Locked in escrow</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            Held by the TrustRent escrow contract on Stellar{" "}
            <span className="font-medium text-ink-700">Testnet</span>. Only the contract can release
            it — neither side can withdraw unilaterally.
          </p>
        </div>

        <div className="shrink-0 space-y-3">
          {role === "tenant" ? (
            <>
              <Button size="lg" className="w-full sm:w-auto" title="Arrives in phase 2">
                Request move-out
              </Button>
              <p className="max-w-60 text-center text-[11px] leading-relaxed text-ink-300 sm:text-left">
                Phase 1 scaffold — on-chain actions are wired in phase 2.
              </p>
            </>
          ) : (
            <>
              <Button size="lg" className="w-full sm:w-auto" title="Arrives in phase 2">
                Review move-out
              </Button>
              <p className="max-w-60 text-center text-[11px] leading-relaxed text-ink-300 sm:text-left">
                Phase 1 scaffold — on-chain actions are wired in phase 2.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid divide-y divide-border border-t border-border bg-ivory-50/60 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-3 px-6 py-4">
          <IconHomeMini />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800">{agreement.property.name}</p>
            <p className="text-xs text-ink-400">
              {agreement.property.locality}, {agreement.property.city}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-4">
          <IconWallet className="size-4.5 shrink-0 text-ink-400" />
          <div>
            <p className="font-medium text-ink-800">{formatINR(agreement.rent.value)}</p>
            <p className="text-xs text-ink-400">Monthly rent</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-4">
          <IconShield className="size-4.5 shrink-0 text-ink-400" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800">
              {shortAddress(agreement.escrowContractId, 8, 6)}
            </p>
            <p className="text-xs text-ink-400">Escrow contract · testnet</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IconHomeMini() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4.5 shrink-0 text-ink-400"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
