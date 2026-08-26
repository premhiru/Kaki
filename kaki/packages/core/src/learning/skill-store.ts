import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { mineTrace } from "./miner.js";
import { parseLearnedSkill, parseLearningTrace } from "./types.js";
import type { LearnedSkill, TimingProfile } from "./types.js";

export class LearnedSkillStore {
  public constructor(
    private readonly root: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public learn(slug: string, input: unknown): LearnedSkill {
    validateSlug(slug);
    const trace = parseLearningTrace(input);
    const directory = join(this.root, slug);
    mkdirSync(directory, { recursive: true });
    const lock = join(directory, ".learning.lock");
    let descriptor: number;
    try {
      descriptor = openSync(lock, "wx");
    } catch {
      throw new Error(`learning-concurrent-update:${slug}`);
    }
    try {
      const existing = this.load(slug);
      if (existing?.learnedFrom.includes(trace.id)) return existing;
      const now = this.clock().toISOString();
      const mined = mineTrace(trace, now);
      const successfulSteps =
        trace.outcome === "success" &&
        (!existing || mined.steps.length <= existing.successfulSteps.length)
          ? mined.steps
          : (existing?.successfulSteps ?? []);
      const skill: LearnedSkill = {
        id: `learned.${slug}`,
        title: titleCase(slug),
        locales: unique([...(existing?.locales ?? []), trace.locale]),
        version: (existing?.version ?? 0) + 1,
        learnedFrom: unique([...(existing?.learnedFrom ?? []), trace.id]),
        successfulSteps,
        failureNotes: unique([
          ...(existing?.failureNotes ?? []),
          ...(mined.failure ? [mined.failure.message] : []),
        ]),
        failureAnnotations: [
          ...(existing?.failureAnnotations ?? []),
          ...(mined.failure ? [mined.failure] : []),
        ],
        selectorHints: uniqueBy(
          [...(existing?.selectorHints ?? []), ...mined.selectorHints],
          (item) =>
            `${item.action}:${item.target ?? ""}:${item.selector.kind}:${item.selector.value}`,
        ),
        screenFingerprints: unique([
          ...(existing?.screenFingerprints ?? []),
          ...mined.screenFingerprints,
        ]),
        timings: mergeTimings(existing?.timings ?? [], mined.timings),
        provenance: [...(existing?.provenance ?? []), mined.provenance],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      this.saveAtomic(slug, skill);
      return skill;
    } finally {
      closeSync(descriptor);
      rmSync(lock, { force: true });
    }
  }

  public load(slug: string): LearnedSkill | undefined {
    validateSlug(slug);
    try {
      return parseLearnedSkill(JSON.parse(readFileSync(this.jsonPath(slug), "utf8")) as unknown);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  private saveAtomic(slug: string, skill: LearnedSkill): void {
    const jsonPath = this.jsonPath(slug);
    const directory = dirname(jsonPath);
    const markdownPath = join(directory, "SKILL.md");
    const revision = join(directory, "revisions", `v${skill.version}`);
    mkdirSync(revision, { recursive: true });
    const json = `${JSON.stringify(skill, null, 2)}\n`;
    const markdown = renderSkill(skill);
    writeFileSync(join(revision, "skill.json"), json, { encoding: "utf8", flag: "wx" });
    writeFileSync(join(revision, "SKILL.md"), markdown, { encoding: "utf8", flag: "wx" });
    atomicWrite(jsonPath, json);
    atomicWrite(markdownPath, markdown);
    atomicWrite(join(directory, "CURRENT"), `${skill.version}\n`);
  }
  private jsonPath(slug: string): string {
    return join(this.root, slug, "skill.json");
  }
}

function atomicWrite(file: string, contents: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, contents, "utf8");
  renameSync(temporary, file);
}
function mergeTimings(
  previous: readonly TimingProfile[],
  current: readonly TimingProfile[],
): TimingProfile[] {
  const map = new Map(previous.map((item) => [item.action, item]));
  for (const item of current) {
    const old = map.get(item.action);
    map.set(
      item.action,
      old
        ? {
            action: item.action,
            samples: old.samples + item.samples,
            medianMs: Math.round(
              (old.medianMs * old.samples + item.medianMs * item.samples) /
                (old.samples + item.samples),
            ),
            p95Ms: Math.max(old.p95Ms, item.p95Ms),
          }
        : item,
    );
  }
  return [...map.values()].sort((a, b) => a.action.localeCompare(b.action));
}
function renderSkill(skill: LearnedSkill): string {
  const steps = skill.successfulSteps.length
    ? skill.successfulSteps
        .map(
          (step, index) =>
            `${index + 1}. On \`${step.surface}\`, ${step.action}${step.target ? ` \`${step.target}\`` : ""}${step.selector ? ` using ${step.selector.kind} \`${step.selector.value}\`` : ""}.`,
        )
        .join("\n")
    : "1. Retry from a fresh trace after addressing the failure notes.";
  const notes = skill.failureNotes.length
    ? skill.failureNotes.map((note) => `- ${note}`).join("\n")
    : "- None recorded.";
  return `---\nid: ${skill.id}\ntitle: ${skill.title}\nwhen_to_use: A matching learned household workflow is requested.\ninputs: [goal]\nsurfaces: [${unique(skill.successfulSteps.map((step) => step.surface)).join(", ")}]\napprovals: [policy]\nlocales: [${skill.locales.join(", ")}]\nlanguages: [auto]\nversion: ${skill.version}\nlearned_from: [${skill.learnedFrom.join(", ")}]\n---\n\n## Steps\n\n${steps}\n\n## Failure notes\n\n${notes}\n`;
}
function validateSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) throw new Error(`Invalid skill slug: ${slug}`);
}
function titleCase(slug: string): string {
  return slug.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [key(item), item])).values()];
}
