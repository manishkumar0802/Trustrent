import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-ivory-50/60 px-6 py-12 text-center">
      {icon ? <div className="text-ink-300">{icon}</div> : null}
      <div>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        {description ? <p className="mt-1 text-sm text-ink-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
