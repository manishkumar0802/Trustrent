import type { EvidenceReference, StorageProvider } from "@trustrent/types";

/**
 * Off-chain evidence storage abstraction.
 *
 * Files (photos, PDFs, utility bills) are NEVER stored on-chain. The contract
 * records only a content reference (hash/CID + provider URI). This module is
 * the seam where a real provider (IPFS, Arweave, S3, Storj — chosen via the
 * Gravity Index in phase 2) plugs in; see docs/storage.md.
 *
 * Phase 1 ships a `local` in-memory provider so the UI flow is demonstrable
 * without any external service. `put`/`get` signatures match the
 * `StorageProvider` interface in @trustrent/types.
 */

class LocalMemoryProvider implements StorageProvider {
  readonly id = "local" as const;
  private store = new Map<string, { payload: Uint8Array; uri: string }>();

  async put(
    payload: Blob | Uint8Array,
    meta?: Record<string, unknown>,
  ): Promise<EvidenceReference["storage"]> {
    const bytes =
      payload instanceof Blob
        ? new Uint8Array(await payload.arrayBuffer())
        : payload;
    const hash = await sha256Hex(bytes);
    const uri = `local://${hash}?name=${encodeURIComponent(String(meta?.name ?? "evidence"))}`;
    this.store.set(uri, { payload: bytes, uri });
    return { provider: "local", uri };
  }

  async get(ref: EvidenceReference["storage"]): Promise<Blob> {
    const entry = this.store.get(ref.uri);
    if (!entry) throw new Error(`Evidence not found: ${ref.uri}`);
    return new Blob([toArrayBuffer(entry.payload)]);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for non-secure contexts — dev only.
  let hash = 5381;
  for (const b of bytes) hash = (hash * 33) ^ b;
  return `dev-${(hash >>> 0).toString(16)}`;
}

/** Copy into a plain ArrayBuffer accepted by the DOM Blob and Web Crypto APIs. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Single instance for the demo app. Replace with a provider factory in phase 2. */
export const evidenceStorage: StorageProvider = new LocalMemoryProvider();
