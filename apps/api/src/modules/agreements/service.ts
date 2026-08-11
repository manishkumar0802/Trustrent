import type { Agreement } from "@trustrent/types";
import type { FastifyBaseLogger } from "fastify";

/**
 * AgreementService — clean service layer. Phase 1 returns the same demo
 * agreements the web app renders, clearly marked as mock data.
 *
 * PHASE 2 SEAM: `AgreementRepository` will read from the Soroban contracts via
 * @trustrent/blockchain (or a Postgres cache). Nothing else in the API should
 * change when that happens.
 */
export interface AgreementRepository {
  list(): Promise<Agreement[]>;
  getById(id: string): Promise<Agreement | undefined>;
}

export class MockAgreementRepository implements AgreementRepository {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async list(): Promise<Agreement[]> {
    this.logger.warn("MockAgreementRepository.list — replace with on-chain reads in phase 2");
    return MOCK_AGREEMENTS;
  }

  async getById(id: string): Promise<Agreement | undefined> {
    this.logger.warn("MockAgreementRepository.getById — replace with on-chain reads in phase 2");
    return MOCK_AGREEMENTS.find((a) => a.id === id);
  }
}

// Shared demo fixture — keep in sync with apps/web/src/data/mock-data.ts.
const MOCK_AGREEMENTS: Agreement[] = [
  {
    id: "AG-1042",
    state: "ACTIVE",
    property: {
      id: "P-01",
      name: "Greenview Apartments · 1BHK",
      locality: "Indiranagar",
      city: "Bengaluru",
      rooms: 1,
    },
    landlord: {
      address: "GALNDSHARMA00000000000000000001",
      name: "Priya Sharma",
      role: "landlord",
    },
    tenant: {
      address: "GTENMEHTA0000000000000000000002",
      name: "Arjun Mehta",
      role: "tenant",
    },
    rent: { value: 18000, currency: "INR" },
    deposit: { value: 30000, currency: "INR" },
    depositStatus: "LOCKED",
    escrowContractId: "CCQJZ6MOVE3UPPERESCROWDEMO000001",
    createdAt: "2026-06-10T11:00:00.000Z",
  },
  {
    id: "AG-1017",
    state: "MOVE_OUT_REQUESTED",
    property: {
      id: "P-02",
      name: "Sunrise Residency · 2BHK",
      locality: "Koramangala",
      city: "Bengaluru",
      rooms: 2,
    },
    landlord: {
      address: "GALNDKUMAR0000000000000000000003",
      name: "Ravi Kumar",
      role: "landlord",
    },
    tenant: {
      address: "GTENRAO0000000000000000000000004",
      name: "Neha Rao",
      role: "tenant",
    },
    rent: { value: 25000, currency: "INR" },
    deposit: { value: 50000, currency: "INR" },
    depositStatus: "LOCKED",
    escrowContractId: "CCQJZ6MOVE3UPPERESCROWDEMO000001",
    createdAt: "2026-05-02T10:30:00.000Z",
    moveOut: {
      stage: "EVIDENCE_SUBMITTED",
      requestedAt: "2026-07-20T08:12:00.000Z",
      evidence: [],
    },
  },
];
