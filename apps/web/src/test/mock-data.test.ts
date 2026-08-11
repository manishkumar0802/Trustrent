import { describe, expect, it } from "vitest";
import { AGREEMENT_STATES } from "@trustrent/types";
import { MOCK_AGREEMENTS, MOCK_EVENTS } from "@/data/mock-data";

describe("mock data", () => {
  it("uses only valid agreement states", () => {
    for (const agreement of MOCK_AGREEMENTS) {
      expect(AGREEMENT_STATES).toContain(agreement.state);
    }
  });

  it("keeps deposits positive", () => {
    for (const agreement of MOCK_AGREEMENTS) {
      expect(agreement.deposit.value).toBeGreaterThan(0);
    }
  });

  it("links every event to the primary agreement", () => {
    for (const event of MOCK_EVENTS) {
      expect(event.agreementId).toBe("AG-1042");
    }
  });
});
