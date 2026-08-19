"use client";

import Link from "next/link";
import { RoleSwitcher } from "../role-switcher";
import { ThemeToggle } from "../theme-toggle";
import { WalletConnectButton } from "../wallet-connect-button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-forest-700 text-ivory-50">
          <span className="text-xs font-bold">T</span>
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink-900">TrustRent</span>
      </Link>
      <div className="flex items-center gap-2">
        <WalletConnectButton errorAsDropdown showStatusHint={false} />
        <ThemeToggle />
        <RoleSwitcher />
      </div>
    </header>
  );
}
