/**
 * Deploy orchestration — PHASE 1 STUB.
 *
 * Deliberately does not fake a deployment: it validates configuration and
 * prints the plan. The next phase replaces the printed plan with real
 * stellar-cli invocations (or a Stellar SDK-driven deployer) for:
 *
 *   1. rental_agreement  (deploy + initialize)
 *   2. escrow            (deploy + initialize)
 *   3. dispute           (deploy + initialize)
 *   4. write contract IDs into the apps' env files / a registry
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
TrustRent deploy plan (phase 1 stub — nothing was deployed)

  network        : ${network}
  rpc            : ${rpcUrl}
  passphrase     : ${passphrase}
  signing account: ${secret.slice(0, 6)}… (${secret.length} chars)

Steps (next phase):
  1. stellar contract build
  2. deploy rental_agreement.wasm
  3. deploy escrow.wasm
  4. deploy dispute.wasm
  5. initialize each contract and wire cross-contract addresses
  6. write contract IDs to apps/*/.env

See scripts/deployment/README.md for current stellar-cli commands.
`);
