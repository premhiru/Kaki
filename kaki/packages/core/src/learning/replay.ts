import type { LearnedSkill, LearningTrace, TraceStep } from "./types.js";
export interface ReplayPlan {
  readonly skillId: string;
  readonly version: number;
  readonly steps: readonly TraceStep[];
  readonly expectedStepReduction: number;
}
export function planReplay(skill: LearnedSkill, originalStepCount: number): ReplayPlan {
  return {
    skillId: skill.id,
    version: skill.version,
    steps: skill.successfulSteps,
    expectedStepReduction: Math.max(0, originalStepCount - skill.successfulSteps.length),
  };
}
export function repeatUsesFewerSteps(trace: LearningTrace, skill: LearnedSkill): boolean {
  return skill.successfulSteps.length < trace.steps.length;
}
