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

  it("projects verified completion and explicit failure without inventing evidence", () => {
    const step = {
      id: "ride",
      surface: "phone" as const,
      action: "grab-ride",
      riskCategory: "booking" as const,
      idempotencyKey: "key",
      timeoutMs: 1_000,
      dryRun: false,
    };
    expect(
      phoneDecisionToSurfaceResult(
        {
          observation: "Receipt visible",
          progress: "Complete",
          action: { type: "done", target: "receipt" },
          confidence: 0.95,
        },
        step,
        [
          {
            id: "redacted-frame",
            kind: "screen",
            label: "Redacted receipt",
            redacted: true,
            createdAt: "2026-08-26T00:00:00Z",
            audience: { kind: "household" },
          },
        ],
        true,
      ),
    ).toMatchObject({
      status: "done",
      verified: true,
      output: { observation: "Receipt visible", confidence: 0.95 },
      evidence: [{ id: "redacted-frame" }],
    });
    expect(
      phoneDecisionToSurfaceResult(
        {
          observation: "App changed",
          progress: "Stopped",
          action: { type: "fail", target: "button-missing" },
          confidence: 1,
        },
        step,
      ),
    ).toMatchObject({
      status: "failed",
      error: { code: "phone-action-failed", message: "button-missing", retryable: false },
    });
    expect(() =>
      phoneDecisionToSurfaceResult(
        {
          observation: "Continue",
          progress: "Working",
          action: { type: "key", target: "BACK" },
          confidence: 1,
        },
        step,
      ),
    ).toThrow("not-terminal");
  });

  it("uses an empty approval fact set when the step has no trusted material facts", () => {
    const result = phoneDecisionToSurfaceResult(
      {
        observation: "Confirm",
        progress: "Waiting",
        action: { type: "need_approval", target: "Confirm" },
        confidence: 1,
      },
      {
        id: "ride",
        surface: "phone",
        action: "grab-ride",
        riskCategory: "booking",
        idempotencyKey: "key",
        timeoutMs: 1_000,
        dryRun: false,
        input: { materialFacts: [] },
      },
    );
    expect(result).toMatchObject({ status: "need_approval", materialFacts: {} });
  });
});
