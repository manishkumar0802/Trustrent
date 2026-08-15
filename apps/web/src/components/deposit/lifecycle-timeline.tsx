import type { AgreementState } from "@trustrent/types";
import { LIFECYCLE_STEPS, lifecycleIndex } from "@trustrent/shared";
import { cn } from "@/lib/utils";
import { IconCheck } from "../icons";

/**
 * The deposit lifecycle, rendered as a timeline. Desktop shows a horizontal
 * rail; mobile collapses to a compact vertical list of milestones.
 */
export function LifecycleTimeline({
  current,
  disputed = false,
}: {
  current: AgreementState;
  /** When true, the DISPUTED milestone is treated as the active fork. */
  disputed?: boolean;
}) {
  const currentIndex = disputed ? lifecycleIndex("DISPUTED") : lifecycleIndex(current);

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-900">Deposit lifecycle</h2>
      <p className="mt-0.5 text-xs text-ink-400">
        The on-chain state machine — funds can only move along this path.
      </p>

      {/* Desktop rail */}
      <ol className="mt-5 hidden items-start gap-1 md:flex">
        {LIFECYCLE_STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.state} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-px flex-1",
                    i === 0 ? "bg-transparent" : done ? "bg-forest-700" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    done && "bg-forest-700 text-ivory-50",
                    active && "border-2 border-forest-700 bg-surface text-forest-800",
                    !done && !active && "border border-border bg-surface text-ink-300",
                  )}
                >
                  {done ? <IconCheck className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "h-px flex-1",
                    i === LIFECYCLE_STEPS.length - 1
                      ? "bg-transparent"
                      : done
                        ? "bg-forest-700"
                        : "bg-border",
                  )}
                />
              </div>
              <div className="px-1">
                <p
                  className={cn("text-xs font-medium", active ? "text-forest-800" : "text-ink-500")}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-[11px] leading-snug text-ink-300 lg:block">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile vertical list */}
      <ol className="mt-5 space-y-0 md:hidden">
        {LIFECYCLE_STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.state} className="relative flex gap-3 pb-4 last:pb-0">
              {i < LIFECYCLE_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px",
                    done ? "bg-forest-700" : "bg-border",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  done && "bg-forest-700 text-ivory-50",
                  active && "border-2 border-forest-700 bg-surface text-forest-800",
                  !done && !active && "border border-border bg-surface text-ink-300",
                )}
              >
                {done ? <IconCheck className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn("text-sm font-medium", active ? "text-forest-800" : "text-ink-700")}
                >
                  {step.label}
                </p>
                <p className="text-xs text-ink-400">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
