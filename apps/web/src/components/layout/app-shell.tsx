"use client";

import type { ReactNode } from "react";
import { RoleProvider } from "../role-provider";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * App shell for authenticated/demo routes.
 * Desktop: sidebar + spacious content. Mobile: top bar + bottom navigation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <div className="min-h-dvh">
        <Topbar />
        <div className="mx-auto flex max-w-7xl">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </RoleProvider>
  );
}
