import { cn } from "@/lib/utils";
import { IconCheck } from "../icons";

export interface StepperStep {
  id: string;
  label: string;
}

/**
 * Compact horizontal stepper. Completed steps show a check; the current step
 * is highlighted in forest green.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: StepperStep[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                done && "bg-forest-700 text-ivory-50",
                active && "border-2 border-forest-700 text-forest-800",
                !done && !active && "border border-border bg-surface text-ink-300",
              )}
            >
              {done ? <IconCheck className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                active ? "text-ink-900" : done ? "text-ink-500" : "text-ink-300",
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn("h-px flex-1", i < current ? "bg-forest-700" : "bg-border")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
