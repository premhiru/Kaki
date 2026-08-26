import type { LearnedSkillStore } from "./skill-store.js";
import type { LearnedSkill, LearningTrace } from "./types.js";
export interface ConsolidationResult {
  processed: number;
  skills: LearnedSkill[];
}
export class NightlyConsolidator {
  constructor(private readonly store: LearnedSkillStore) {}
  run(
    traces: readonly LearningTrace[],
    slugFor: (trace: LearningTrace) => string,
  ): ConsolidationResult {
    const groups = new Map<string, LearningTrace[]>();
    for (const trace of traces) {
      const slug = slugFor(trace);
      groups.set(slug, [...(groups.get(slug) ?? []), trace]);
    }
    const skills: LearnedSkill[] = [];
    for (const [slug, grouped] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const ordered = grouped.toSorted(
        (a, b) =>
          Number(a.outcome === "failure") - Number(b.outcome === "failure") ||
          a.steps.length - b.steps.length ||
          a.id.localeCompare(b.id),
      );
      let current: LearnedSkill | undefined;
      for (const trace of ordered) current = this.store.learn(slug, trace);
      if (current) skills.push(current);
    }
    return { processed: traces.length, skills };
  }
}
