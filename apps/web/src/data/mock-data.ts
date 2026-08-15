import type { Agreement, ContractEvent } from "@trustrent/types";

/**
 * PHASE 1 DEMO DATA — intentionally separate from any on-chain state.
 * The blockchain client (@trustrent/blockchain) is a stub that throws; this
 * data exists so the design system and routes are real and reviewable.
 * Delete when TrustRentClient is wired in phase 2.
 */

export const ESCROW_CONTRACT_ID = "CCQJZ6MOVE3UPPERESCROWDEMO000001";

export const MOCK_AGREEMENTS: Agreement[] = [
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
      name: "Prince kumar",
      role: "landlord",
    },
    tenant: {
      address: "GTENMEHTA0000000000000000000002",
      name: "Manish Kumar",
      role: "tenant",
    },
    rent: { value: 18000, currency: "INR" },
    deposit: { value: 30000, currency: "INR" },
    depositStatus: "LOCKED",
    escrowContractId: ESCROW_CONTRACT_ID,
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
    escrowContractId: ESCROW_CONTRACT_ID,
    createdAt: "2026-05-02T10:30:00.000Z",
    moveOut: {
      stage: "EVIDENCE_SUBMITTED",
      requestedAt: "2026-07-20T08:12:00.000Z",
      evidence: [
        {
          id: "EV-201",
          agreementId: "AG-1017",
          submitter: "tenant",
          kind: "FINAL_DUES",
          contentHash: "QmZ9f3kXp1vR8tW2cAbD5eFgHiJkLmNoPqRsTuVwXyZ",
          storage: {
            provider: "ipfs",
            uri: "ipfs://QmZ9f3kXp1vR8tW2cAbD5eFgHiJkLmNoPqRsTuVwXyZ",
          },
          submittedAt: "2026-07-21T09:00:00.000Z",
        },
        {
          id: "EV-202",
          agreementId: "AG-1017",
          submitter: "tenant",
          kind: "ROOM_CONDITION",
          contentHash: "QmW2dR4yT7uI9oP2aS5dF8gH1jK4lM7nQ0rT3uV6wX",
          storage: {
            provider: "ipfs",
            uri: "ipfs://QmW2dR4yT7uI9oP2aS5dF8gH1jK4lM7nQ0rT3uV6wX",
          },
          submittedAt: "2026-07-21T09:05:00.000Z",
        },
      ],
    },
  },
  {
    id: "AG-0982",
    state: "CLOSED",
    property: {
      id: "P-03",
      name: "Lake View Studio",
      locality: "Whitefield",
      city: "Bengaluru",
      rooms: 0,
    },
    landlord: {
      address: "GALNDSHARMA00000000000000000001",
      name: "Priya Sharma",
      role: "landlord",
    },
    tenant: {
      address: "GTENVERMA00000000000000000000005",
      name: "Ishita Verma",
      role: "tenant",
    },
    rent: { value: 15000, currency: "INR" },
    deposit: { value: 30000, currency: "INR" },
    depositStatus: "RELEASED",
    escrowContractId: ESCROW_CONTRACT_ID,
    createdAt: "2026-01-15T09:00:00.000Z",
    moveOut: {
      stage: "SETTLED",
      requestedAt: "2026-04-01T07:45:00.000Z",
      evidence: [],
    },
    settlement: {
      type: "FULL_REFUND",
      tenantAmount: { value: 30000, currency: "INR" },
      landlordAmount: { value: 0, currency: "INR" },
      settledAt: "2026-04-20T14:00:00.000Z",
    },
  },
];

/** Activity timeline for the primary demo agreement (AG-1042). */
export const MOCK_EVENTS: ContractEvent[] = [
  {
    id: "EVT-01",
    name: "AgreementCreated",
    agreementId: "AG-1042",
    actor: "landlord",
    timestamp: "2026-06-10T11:00:00.000Z",
    data: { rent: 18000, deposit: 30000 },
  },
  {
    id: "EVT-02",
    name: "TenantJoined",
    agreementId: "AG-1042",
    actor: "tenant",
    timestamp: "2026-06-11T16:20:00.000Z",
  },
  {
    id: "EVT-03",
    name: "DepositLocked",
    agreementId: "AG-1042",
    actor: "tenant",
    timestamp: "2026-06-12T10:05:00.000Z",
    data: { amount: 30000, escrow: ESCROW_CONTRACT_ID },
  },
];

export function getMockAgreement(id: string): Agreement | undefined {
  return MOCK_AGREEMENTS.find((a) => a.id === id);
}
