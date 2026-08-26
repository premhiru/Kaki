import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { defineSkill } from "../src/runner.js";

interface Catalogue {
  readonly skills: ReadonlyArray<{ scope: string; slug: string; id: string }>;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(readFileSync(join(root, "catalogue.json"), "utf8")) as Catalogue;

describe.each(catalogue.skills)("fixture runner $id", (skill) => {
  it("is deterministic and effect-free", async () => {
    const modulePath = join(root, skill.scope, skill.slug, "run.ts");
    const fixturePath = join(root, skill.scope, skill.slug, "fixtures", "happy.json");
    const run = defineSkill(pathToFileURL(modulePath).href, skill.id);
    const first = await run({ fixturePath });
    const second = await run({ fixturePath });
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      expect: {
        status: string;
        approval: string;
        actionIds: readonly string[];
        evidence: readonly string[];
      };
    };
    expect(second).toEqual(first);
    expect(first).toMatchObject({ skillId: skill.id, fixture: true, sideEffects: 0 });
    expect(first).toMatchObject(fixture.expect);
  });
});
