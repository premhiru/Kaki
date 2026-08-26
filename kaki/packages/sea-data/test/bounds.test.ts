import { describe, expect, it } from "vitest";
import { createRegionalHandoff, RegionalCapabilityRouter } from "../src/index.js";

describe("regional model-visible bounds", () => {
  it("rejects unbounded provider facts and handoff fields", async () => {
    const router = new RegionalCapabilityRouter();
    router.register({
      ids: ["my.weather"],
      execute: async () => ({
        id: "my.weather",
        mode: "live",
        observedAt: "2026-08-26T00:00:00Z",
        source: "fixture",
        facts: { forecast: "x".repeat(1_001) },
      }),
    });

    await expect(
      router.execute({ id: "my.weather", operation: "read", parameters: {} }),
    ).rejects.toThrow("regional-provider-fact-too-large:forecast");
    expect(() => createRegionalHandoff("my.tng", { result: ["x".repeat(201)] })).toThrow(
      "regional-handoff-field-too-large:result",
    );
  });
});
