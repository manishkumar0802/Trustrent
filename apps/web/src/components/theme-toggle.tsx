"use client";

import { useTheme } from "./theme-provider";
import { IconMoon, IconSun } from "./icons";
import { cn } from "@/lib/utils";

/** Light/dark toggle button (shadcn-style icon button). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-500 shadow-card transition-colors hover:bg-ivory-100 hover:text-ink-900",
        className,
      )}
    >
      {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
    </button>
  );
}
