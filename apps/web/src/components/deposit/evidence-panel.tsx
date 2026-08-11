import type { EvidenceReference } from "@trustrent/types";
import { shortAddress } from "@trustrent/shared";
import { IconFile, IconShield } from "../icons";

/**
 * Evidence is stored OFF-chain; the chain keeps only the reference
 * (content hash + provider URI + submitter + timestamp). This panel makes
 * that distinction explicit to the user.
 */
export function EvidencePanel({ evidence }: { evidence: EvidenceReference[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-ink-400">
        No evidence submitted yet. Evidence references appear here once the move-out flow starts.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {evidence.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-ivory-50/60 px-4 py-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
            <IconFile className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink-800">{kindLabel(item.kind)}</p>
              <span className="shrink-0 text-[11px] text-ink-300">id {item.id}</span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-ink-400" title={item.contentHash}>
              {shortAddress(item.contentHash, 14, 10)}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-300">
              <IconShield className="size-3" />
              File stored off-chain · on-chain keeps only this reference
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function kindLabel(kind: EvidenceReference["kind"]): string {
  switch (kind) {
    case "FINAL_DUES":
      return "Final dues";
    case "ROOM_CONDITION":
      return "Room condition";
    case "DISPUTE_SUPPORT":
      return "Dispute support";
  }
}
