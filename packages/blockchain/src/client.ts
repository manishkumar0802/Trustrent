import type { Agreement, DisputeRecord, EvidenceReference } from "@trustrent/types";
import { getNetworkConfig, type NetworkConfig } from "./config";

/**
 * TrustRent Soroban client.
 *
 * PHASE 1 — this is a *typed stub*, intentionally not wired to the network.
 * Every method throws `NotImplementedError` so it is impossible to mistake it
 * for a working integration. The web UI is driven by mock data until phase 2.
 *
 * PHASE 2 — implementation plan (see packages/blockchain/README.md):
 *   1. Add `@stellar/stellar-sdk` (the successor to soroban-client).
 *   2. Generate typed contract clients from the compiled WASM specs with
 *      `soroban contract bindings typescript` (soroban-cli 22.x).
 *   3. Point them at `this.network.rpcUrl` and sign with a testnet keypair.
 *   4. Replace the `NotImplementedError` bodies with real calls, keeping this
 *      exact interface so callers (web + api) never change.
 */

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented in phase 1. See packages/blockchain/README.md`);
    this.name = "NotImplementedError";
  }
}

export interface TrustRentClientOptions {
  network?: NetworkConfig;
  contractIds?: {
    agreement?: string;
    escrow?: string;
    dispute?: string;
  };
}

export class TrustRentClient {
  readonly network: NetworkConfig;
  readonly contractIds: NonNullable<TrustRentClientOptions["contractIds"]>;

  constructor(options: TrustRentClientOptions = {}) {
    this.network = options.network ?? getNetworkConfig();
    this.contractIds = {
      agreement: options.contractIds?.agreement,
      escrow: options.contractIds?.escrow,
      dispute: options.contractIds?.dispute,
    };
  }

  /** Read an agreement from the rental_agreement contract. */
  async getAgreement(id: string): Promise<Agreement> {
    throw new NotImplementedError("TrustRentClient.getAgreement");
  }

  /** Create an agreement on the rental_agreement contract. */
  async createAgreement(input: {
    landlord: string;
    propertyRef: string;
    rent: number;
    deposit: number;
  }): Promise<{ agreementId: string }> {
    throw new NotImplementedError("TrustRentClient.createAgreement");
  }

  /** Join an agreement as the tenant (rental_agreement.join). */
  async joinAgreement(agreementId: string, tenant: string): Promise<void> {
    throw new NotImplementedError("TrustRentClient.joinAgreement");
  }

  /** Lock the deposit into the escrow contract (escrow.lock). */
  async lockDeposit(agreementId: string, amount: number): Promise<void> {
    throw new NotImplementedError("TrustRentClient.lockDeposit");
  }

  /** Request move-out (rental_agreement.request_move_out). */
  async requestMoveOut(agreementId: string): Promise<void> {
    throw new NotImplementedError("TrustRentClient.requestMoveOut");
  }

  /** Store an off-chain evidence reference on-chain (rental_agreement.submit_evidence). */
  async submitEvidence(evidence: EvidenceReference): Promise<void> {
    throw new NotImplementedError("TrustRentClient.submitEvidence");
  }

  /** Open a dispute (dispute.open). */
  async openDispute(agreementId: string, initiator: string, reason: string): Promise<void> {
    throw new NotImplementedError("TrustRentClient.openDispute");
  }

  /** Read a dispute record (dispute.get). */
  async getDispute(agreementId: string): Promise<DisputeRecord> {
    throw new NotImplementedError("TrustRentClient.getDispute");
  }
}
