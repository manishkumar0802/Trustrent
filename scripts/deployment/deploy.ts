/**
 * Deploy orchestration — validation + deploy runbook.
 *
 * This keeps the workflow safe for local development and CI while documenting the
 * exact contract deployment sequence needed for the demo and submission.
 */
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

const network = process.env.SOROBAN_NETWORK ?? "testnet";
if (network !== "testnet") {
  console.error(`Refusing to deploy: SOROBAN_NETWORK="${network}" — development is Testnet only.`);
  process.exit(1);
}

const rpcUrl = required("SOROBAN_RPC_URL");
const passphrase = required("SOROBAN_NETWORK_PASSPHRASE");
const secret = required("SOROBAN_SECRET_KEY");

console.log(`
TrustRent deploy plan (submission-ready runbook)

  network         : ${network}
  rpc             : ${rpcUrl}
  passphrase      : ${passphrase}
  signing account : ${secret.slice(0, 6)}… (${secret.length} chars)

Required steps:
  1. cargo test --workspace
  2. stellar contract build
  3. deploy rental_agreement.wasm
  4. deploy escrow.wasm
  5. deploy dispute.wasm
  6. initialize each contract and wire cross-contract addresses
  7. write contract IDs to app env/config for the live demo
  8. record deployment address and transaction hash in the README

Current docs:
  - scripts/deployment/README.md
  - README.md

This script intentionally validates config and prints the exact deploy plan
without performing a live network action until a funded testnet wallet and
stellar-cli are configured for the actual submission.
`);
