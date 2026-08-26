import { describe, expect, it } from "vitest";
import { ApprovalEngine, MemoryApprovalLedger } from "../src/index.js";

describe("approval input boundary", () => {
  it("rejects the retired actorless numbered-reply shape", async () => {
    const engine = new ApprovalEngine(new MemoryApprovalLedger());
    const card = await engine.create({
      taskId: "task",
      householdId: "home",
      requestedByPersonId: "wei",
      title: "Book",
      summary: "Clinic",
      category: "booking",
    });
    await expect(Reflect.apply(engine.respond, engine, [card.id, "1"])).rejects.toThrow(
      "approval-decision-invalid",
    );
  });
});
