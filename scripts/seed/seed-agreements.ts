/**
 * Seed script — PHASE 1 STUB.
 *
 * Generates a demo agreements fixture (JSON) used by integration tests. In
 * phase 2 this will create real agreements on the rental_agreement contract
 * (testnet) and lock demo deposits via the escrow contract.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../tests/fixtures",
);

const fixture = {
  generatedAt: new Date().toISOString(),
  network: "testnet",
  agreements: [
    {
      id: "AG-1042",
      state: "ACTIVE",
      deposit: 30000,
      depositStatus: "LOCKED",
      createdAt: "2026-06-10T11:00:00.000Z",
    },
    {
      id: "AG-1017",
      state: "MOVE_OUT_REQUESTED",
      deposit: 50000,
      depositStatus: "LOCKED",
      createdAt: "2026-05-02T10:30:00.000Z",
    },
  ],
};

await mkdir(fixturesDir, { recursive: true });
await writeFile(path.join(fixturesDir, "agreements.seed.json"), JSON.stringify(fixture, null, 2));
console.log(`Wrote ${path.join(fixturesDir, "agreements.seed.json")}`);
