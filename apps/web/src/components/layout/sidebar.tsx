"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { RoleSwitcher } from "../role-switcher";
import { NAV_ICONS } from "./nav-icons";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-ivory-50/60 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-forest-700 text-ivory-50">
          <span className="text-sm font-bold tracking-tight">T</span>
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-ink-900">TrustRent</span>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-forest-100 text-forest-800"
                      : "text-ink-500 hover:bg-ivory-100 hover:text-ink-900",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.2]")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border px-4 py-4">
        <RoleSwitcher className="w-full justify-center" />
        <p className="px-1 text-[11px] leading-relaxed text-ink-300">
          Stellar <span className="font-medium text-ink-400">Testnet</span> · Phase 1 scaffold —
          on-chain actions land in phase 2.
        </p>
      </div>
    </aside>
  );
}
