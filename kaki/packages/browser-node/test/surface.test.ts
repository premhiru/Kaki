import { describe, expect, it } from "vitest";
import { browserRunToSurfaceResult } from "../src/index.js";

describe("canonical browser surface boundary", () => {
  it("uses deterministic step facts for a PayNow handoff", async () => {
    const result = await browserRunToSurfaceResult(
      { data: {}, handoff: "paynow" },
      {
        id: "pay",
        surface: "browser",
        action: "run",
        riskCategory: "money.transfer",
        idempotencyKey: "key",
        timeoutMs: 1000,
        dryRun: false,
        input: {
          materialFacts: { merchant: "vendor", amount: { currency: "SGD", minorUnits: 5000 } },
        },
      },
      {
        protocolVersion: "1.0.0",
        taskId: "task",
        traceId: "trace",
        householdId: "home",
        capabilityToken: "fixture",
        signal: AbortSignal.timeout(1000),
      },
    );
    expect(result).toMatchObject({
      status: "need_approval",
      category: "money.transfer",
      materialFacts: { merchant: "vendor" },
    });
  });
});
