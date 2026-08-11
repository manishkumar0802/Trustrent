import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "forest" | "sage" | "amber" | "danger" | "neutral";

const tones: Record<BadgeTone, string> = {
  forest: "bg-forest-100 text-forest-800",
  sage: "bg-sage-100 text-sage-600",
  amber: "bg-amber-100 text-amber-600",
  danger: "bg-danger-100 text-danger-600",
  neutral: "bg-ivory-100 text-ink-500",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small colored dot used next to status text. */
export function StatusDot({ tone = "neutral" }: { tone?: BadgeTone }) {
  const dot: Record<BadgeTone, string> = {
    forest: "bg-forest-600",
    sage: "bg-sage-500",
    amber: "bg-amber-500",
    danger: "bg-danger-600",
    neutral: "bg-ink-300",
  };
  return <span aria-hidden className={cn("inline-block size-1.5 rounded-full", dot[tone])} />;
}
