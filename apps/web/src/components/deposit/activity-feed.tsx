import type { ComponentType } from "react";
import type { ContractEvent, ContractEventName } from "@trustrent/types";
import { EVENT_LABELS, formatTimestamp } from "@trustrent/shared";
import { cn } from "@/lib/utils";
import {
  IconAlert,
  IconCheck,
  IconFile,
  IconKey,
  IconLock,
  IconMoveOut,
  IconScale,
  IconShield,
  IconWallet,
} from "../icons";

const EVENT_ICONS: Partial<Record<ContractEventName, ComponentType<{ className?: string }>>> = {
  AgreementCreated: IconKey,
  TenantJoined: IconUser,
  DepositLocked: IconLock,
  MoveOutRequested: IconMoveOut,
  EvidenceSubmitted: IconFile,
  InspectionApproved: IconCheck,
  DeductionProposed: IconScale,
  SettlementAccepted: IconWallet,
  DisputeOpened: IconAlert,
  DisputeResolved: IconCheck,
  DepositReleased: IconWallet,
  AgreementClosed: IconShield,
};

const EVENT_TONE: Partial<Record<ContractEventName, string>> = {
  DepositLocked: "text-forest-700 bg-forest-100",
  DisputeOpened: "text-danger-600 bg-danger-100",
  MoveOutRequested: "text-amber-600 bg-amber-100",
  InspectionApproved: "text-forest-700 bg-forest-100",
};

/**
 * Consumes the same event catalog the Soroban contracts emit
 * (tr_common::events / docs/events.md) — phase 1 shows demo events.
 */
export function ActivityFeed({ events }: { events: ContractEvent[] }) {
  return (
    <ol className="space-y-0">
      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.name] ?? IconShield;
        const tone = EVENT_TONE[event.name] ?? "text-ink-400 bg-ivory-100";
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[13px] top-8 h-[calc(100%-1.75rem)] w-px bg-border"
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                tone,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-ink-800">{EVENT_LABELS[event.name]}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {event.actor === "tenant" ? "Tenant" : "Landlord"} ·{" "}
                {formatTimestamp(event.timestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
