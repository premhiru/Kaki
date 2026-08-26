import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const required = [
  "grab-ride",
  "grab-food",
  "foodpanda",
  "simplygo",
  "parents-gateway",
  "healthhub-app",
  "bank-app-readonly",
  "touch-n-go",
  "gcash",
  "momo",
  "generic-app-task",
] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");

describe.each(required)("phone skill %s", (slug) => {
  it("has agentskills-compatible metadata and a valid fixture", () => {
    const playbook = readFileSync(join(root, slug, "SKILL.md"), "utf8");
    for (const field of [
      "id",
      "title",
      "when_to_use",
      "inputs",
      "surfaces",
      "approvals",
      "locales",
      "languages",
      "version",
    ]) {
      expect(playbook).toMatch(new RegExp(`^${field}:`, "mu"));
    }
    expect(playbook).toContain("phone");
    const fixture = JSON.parse(
      readFileSync(join(root, slug, "fixtures", "happy.json"), "utf8"),
    ) as {
      goal?: unknown;
      screens?: unknown;
      expect?: { terminal?: unknown };
    };
    expect(typeof fixture.goal).toBe("string");
    expect(Array.isArray(fixture.screens)).toBe(true);
    expect(["done", "need_approval"]).toContain(fixture.expect?.terminal);
  });
});
