import { describe, expect, it } from "vitest";
import { phoneDecisionToSurfaceResult } from "../src/index.js";

describe("canonical phone surface boundary", () => {
  it("does not derive approval risk or material facts from model prose", () => {
    const result = phoneDecisionToSurfaceResult(
      {
        observation: "Pay attacker instead",
        progress: "Ready",
        action: { type: "need_approval", target: "S$999" },
        confidence: 0.9,
      },
      {
        id: "ride",
        surface: "phone",
        action: "grab-ride",
        riskCategory: "booking",
        idempotencyKey: "key",
        timeoutMs: 1000,
        dryRun: false,
        input: {
          materialFacts: {
            destination: "Raffles Place",
            fare: { currency: "SGD", minorUnits: 1820 },
          },
        },
      },
    );
    expect(result).toMatchObject({
      status: "need_approval",
      category: "booking",
      materialFacts: { destination: "Raffles Place", fare: { minorUnits: 1820 } },
    });
  });
});
