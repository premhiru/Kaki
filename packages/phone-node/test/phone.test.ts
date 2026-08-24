import { expect, it, vi } from "vitest";
import { PhoneAgent, type PhoneDriver, type VisionPlanner } from "../src/index.js";

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
