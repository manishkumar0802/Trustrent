/** Minimal typed environment access. Never exposes secrets to the client. */
export interface ApiConfig {
  port: number;
  soroban: {
    network: string;
    rpcUrl: string;
    networkPassphrase: string;
  };
  storageProvider: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    port: Number(env.PORT ?? 4000),
    soroban: {
      network: env.SOROBAN_NETWORK ?? "testnet",
      rpcUrl: env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
      networkPassphrase: env.SOROBAN_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
    },
    storageProvider: env.STORAGE_PROVIDER ?? "local",
  };
}
