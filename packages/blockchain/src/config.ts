/**
 * Stellar network configuration.
 *
 * Development targets the Stellar Testnet only — never mainnet.
 * Values come from the environment (see apps/web/.env.example and
 * apps/api/.env.example). `NEXT_PUBLIC_` prefixed vars are inlined into the
 * browser bundle by Next.js.
 */

export const NETWORKS = {
  testnet: {
    id: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  // futurenet intentionally omitted — the team standardizes on testnet.
} as const;

export type NetworkId = keyof typeof NETWORKS;

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

export interface NetworkConfig {
  id: NetworkId;
  rpcUrl: string;
  networkPassphrase: string;
  horizonUrl: string;
}

/**
 * Resolve the active network configuration. Defaults to testnet with the
 * canonical public RPC so the app works out of the box in development.
 */
export function getNetworkConfig(): NetworkConfig {
  const requested = (readEnv("SOROBAN_NETWORK") ??
    readEnv("NEXT_PUBLIC_SOROBAN_NETWORK") ??
    "testnet") as NetworkId;

  const base = NETWORKS[requested] ?? NETWORKS.testnet;

  return {
    ...base,
    rpcUrl:
      readEnv("SOROBAN_RPC_URL") ??
      readEnv("NEXT_PUBLIC_SOROBAN_RPC_URL") ??
      base.rpcUrl,
    networkPassphrase:
      readEnv("SOROBAN_NETWORK_PASSPHRASE") ??
      readEnv("NEXT_PUBLIC_NETWORK_PASSPHRASE") ??
      base.networkPassphrase,
  };
}
