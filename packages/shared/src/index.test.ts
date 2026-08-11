import { describe, expect, it } from "vitest";
import { EVENT_LABELS, formatINR, lifecycleIndex, shortAddress } from "./index";

describe("formatINR", () => {
  it("formats with Indian grouping", () => {
    expect(formatINR(30000)).toBe("₹30,000");
    expect(formatINR(1000000)).toBe("₹10,00,000");
  });
});

describe("shortAddress", () => {
  it("truncates long addresses", () => {
    expect(shortAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).toBe(
      "GABCDE…3456",
    );
  });
  it("leaves short addresses untouched", () => {
    expect(shortAddress("GABC")).toBe("GABC");
  });
});

describe("lifecycleIndex", () => {
  it("knows the state order", () => {
    expect(lifecycleIndex("CREATED")).toBe(0);
    expect(lifecycleIndex("CLOSED")).toBe(8);
  });
});

describe("EVENT_LABELS", () => {
  it("labels every canonical event", () => {
    expect(EVENT_LABELS.DepositLocked).toBe("Deposit locked in escrow");
  });
});
