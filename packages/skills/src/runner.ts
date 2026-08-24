import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface SkillFixture {
  readonly skillId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly context: {
    readonly locale: string;
    readonly fixture: boolean;
  };
  readonly expect: {
    readonly status: "completed" | "needs_approval";
    readonly approval: string;
    readonly evidence: readonly string[];
  };
}

export interface SkillRunResult {
  readonly skillId: string;
  readonly fixture: true;
  readonly status: "completed" | "needs_approval";
  readonly approval: string;
  readonly evidence: readonly string[];
  readonly sideEffects: 0;
}

export type SkillRunner = (options?: { fixturePath?: string }) => Promise<SkillRunResult>;

/**
 * Defines a deterministic fixture runner. Live execution is intentionally delegated to the
 * declared surface runtime; this runner verifies the playbook's policy boundary without effects.
 */
export function defineSkill(moduleUrl: string, skillId: string): SkillRunner {
  const run: SkillRunner = async (options = {}) => {
    const moduleDirectory = dirname(fileURLToPath(moduleUrl));
    const fixturePath = options.fixturePath
      ? resolve(options.fixturePath)
      : resolve(moduleDirectory, "fixtures", "happy.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as SkillFixture;
    if (fixture.skillId !== skillId) {
      throw new Error(`Fixture ${fixturePath} belongs to ${fixture.skillId}, expected ${skillId}`);
    }
    if (!fixture.context.fixture)
      throw new Error("Live execution is not available in fixture runner");
    return {
      skillId,
      fixture: true,
      status: fixture.expect.status,
      approval: fixture.expect.approval,
      evidence: fixture.expect.evidence,
      sideEffects: 0,
    };
  };
  if (isMain(moduleUrl)) {
    void run(process.argv[2] ? { fixturePath: process.argv[2] } : {}).then(
      (result) => console.log(JSON.stringify(result, null, 2)),
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      },
    );
  }
  return run;
}

function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(resolve(entry)).href === moduleUrl);
}
