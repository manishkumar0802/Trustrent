"use client";

import { useRole } from "./role-provider";
import { cn } from "@/lib/utils";
import type { Role } from "@trustrent/types";

const OPTIONS: { value: Role; label: string }[] = [
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
];

/**
 * Demo-only role switcher. In production the role is derived from the
 * authenticated Stellar account (see ARCHITECTURE.md → auth).
 */
export function RoleSwitcher({ className }: { className?: string }) {
  const { role, setRole } = useRole();

  return (
    <div
      role="tablist"
      aria-label="View as"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-ivory-100 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={role === opt.value}
          onClick={() => setRole(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            role === opt.value
              ? "bg-surface text-ink-900 shadow-card"
              : "text-ink-400 hover:text-ink-700",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
