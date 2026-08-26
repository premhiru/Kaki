import { expect, it, vi } from "vitest";
import {
  PhoneAgent,
  parseVisionDecision,
  validateDecision,
  type PhoneDriver,
  type VisionDecision,
  type VisionPlanner,
} from "../src/index.js";

it("stops at approval before confirming a Grab ride", async () => {
  const act = vi.fn();
  const driver: PhoneDriver = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => "Fare $18.20 Confirm booking",
    act,
    backToHome: vi.fn(),
  };
  const planner: VisionPlanner = {
    decide: async () => ({
      observation: "Fare $18.20, confirm booking screen",
      progress: "Ride details filled",
      action: { type: "need_approval", target: "Confirm booking for SGD 18.20" },
      confidence: 0.99,
    }),
  };
  const result = await new PhoneAgent(driver, planner, { append: async () => undefined }).execute(
    "grab-1",
    "Book Grab to Raffles Place",
  );
  expect(result.action.type).toBe("need_approval");
  expect(act).not.toHaveBeenCalled();
});

it("recovers a stalled screen with BACK and the last launch action", async () => {
  const act = vi.fn(async () => {});
  const driver: PhoneDriver = {
    screenshot: async () => new Uint8Array([1, 1, 1]),
    dumpUi: async () => "Loading",
    act,
    backToHome: vi.fn(),
  };
  let step = 0;
  const planner: VisionPlanner = {
    decide: async () => {
      step += 1;
      if (step <= 3)
        return {
          observation: "Still loading",
          progress: "Waiting",
          action: { type: "launch", target: "com.example.app" },
          confidence: 0.8,
        };
      return {
        observation: "Ready",
        progress: "Complete",
        action: { type: "done", target: "result" },
        confidence: 1,
      };
    },
  };
  await expect(
    new PhoneAgent(driver, planner, { append: vi.fn() }, 5).execute("task", "open app"),
  ).resolves.toMatchObject({ action: { type: "done" } });
  expect(act).toHaveBeenCalledWith({ type: "key", target: "BACK" });
  expect(act).toHaveBeenLastCalledWith({ type: "launch", target: "com.example.app" });
});

it("stops safely at the step budget and revalidates authority around awaited work", async () => {
  const assertCurrent = vi.fn();
  const driver: PhoneDriver = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => undefined,
    act: vi.fn(),
    backToHome: vi.fn(),
  };
  const planner: VisionPlanner = {
    decide: async () => ({
      observation: "Continue",
      progress: "One step",
      action: { type: "key", target: "TAB" },
      confidence: 0.5,
    }),
  };
  const result = await new PhoneAgent(driver, planner, { append: vi.fn() }, 1).execute(
    "task",
    "goal",
    assertCurrent,
  );
  expect(result).toMatchObject({
    observation: "Step budget exhausted",
    action: { type: "fail", target: "step-budget" },
  });
  expect(assertCurrent.mock.calls.length).toBeGreaterThanOrEqual(5);
});

it("validates every model action shape and blocks confirmation taps", () => {
  const valid: VisionDecision[] = [
    decision({ type: "swipe", target: [1, 2, 3, 4] }),
    decision({ type: "tap", target: [1, 2] }),
    decision({ type: "long_press", target: "Menu" }),
    decision({ type: "type", target: "Search", value: "kopi" }),
    decision({ type: "key", target: "BACK" }),
    decision({ type: "scroll_to", target: "Checkout" }),
    decision({ type: "need_approval", target: "Confirm" }),
  ];
  for (const value of valid) expect(parseVisionDecision(value)).toEqual(value);
  for (const value of [
    null,
    { observation: "x", progress: "x" },
    decision({ type: "swipe", target: [1, 2] } as never),
    decision({ type: "tap", target: [1, Number.NaN] }),
    decision({ type: "key", target: "" }),
    decision({ type: "type", target: "field" } as never),
    decision({ type: "unknown", target: "x" } as never),
  ]) {
    expect(() => parseVisionDecision(value)).toThrow();
  }
  expect(() => validateDecision(decision({ type: "tap", target: "Confirm" }), "Pay now")).toThrow(
    "approval-checkpoint-required",
  );
  expect(() => validateDecision({ ...valid[0]!, confidence: 2 })).toThrow("invalid-confidence");
  expect(() => validateDecision({ ...valid[0]!, observation: "" })).toThrow(
    "invalid-vision-decision",
  );
});

function decision(action: VisionDecision["action"]): VisionDecision {
  return { observation: "Observed", progress: "In progress", action, confidence: 0.8 };
}
