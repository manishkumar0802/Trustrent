/**
 * Simple reactive disputes store for the demo.
 *
 * Combines the static mock disputes with disputes filed at runtime (e.g. from
 * the move-out flow). Provides subscribe/add so any page can react to changes.
 */

import type { DisputeRecord } from "@trustrent/types";
import { MOCK_DISPUTES } from "@/data/mock-data";

type Listener = () => void;

const listeners = new Set<Listener>();

let disputes: DisputeRecord[] = [...MOCK_DISPUTES];

let nextId = MOCK_DISPUTES.length + 1;

function notify() {
  for (const fn of listeners) fn();
}

/** Get the current list of disputes (read-only snapshot). */
export function getDisputes(): readonly DisputeRecord[] {
  return disputes;
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribeDisputes(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** File a new dispute. Returns the created record. */
export function fileDispute(
  input: Omit<DisputeRecord, "id" | "state" | "openedAt">,
): DisputeRecord {
  const record: DisputeRecord = {
    ...input,
    id: `DSP-${String(nextId++).padStart(3, "0")}`,
    state: "OPENED",
    openedAt: new Date().toISOString(),
  };
  disputes = [record, ...disputes];
  notify();
  return record;
}

/** Update a dispute's state (e.g. accept, reject, resolve). */
export function updateDispute(
  id: string,
  patch: Partial<Pick<DisputeRecord, "state" | "resolvedAt">>,
): void {
  disputes = disputes.map((d) => (d.id === id ? { ...d, ...patch } : d));
  notify();
}
