# Off-chain evidence storage

## Principle

Images, PDFs and other evidence are **never** stored on-chain. The Soroban
contracts record only a reference:

- `content_hash` — content-addressed hash of the payload
- `submitter` — who submitted it
- `submitted_at` — ledger timestamp
- `kind` — final dues / room condition / dispute support

This keeps on-chain storage tiny, makes evidence tamper-evident (any change
breaks the hash), and lets us swap providers freely.

## Abstraction

`StorageProvider` (in `@trustrent/types`) defines the contract:

```ts
interface StorageProvider {
  id: "local" | "ipfs" | "arweave" | "s3" | "other";
  put(payload: Blob | Uint8Array, meta?): Promise<{ provider, uri }>;
  get(ref): Promise<Blob>;
}
```

- Web: `apps/web/src/services/evidence-storage.ts` — ships a `local` in-memory
  provider for phase 1.
- API: will expose an ingest endpoint behind the same interface.
- Contracts: receive the `content_hash` + `uri` string and store them.

## Provider selection (phase 2)

Chosen via the Gravity Index at integration time — candidates are IPFS
(public pinning services), Arweave (permanent storage), Storj/S3 (private
buckets with signed URLs). Selection criteria:

- cost per GB and retention
- public-read vs gated access for dispute review
- verifiability (content addressing) for on-chain hashing
- regional/latency constraints for a property-management product

## UI clarity

The UI must always communicate that the blockchain stores the *proof*, not
the file. The evidence panel in the agreement detail page does this explicitly.
