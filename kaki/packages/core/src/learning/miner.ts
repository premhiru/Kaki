import { createHash } from "node:crypto";
import type {
  FailureAnnotation,
  LearningTrace,
  SkillProvenance,
  TimingProfile,
  TraceStep,
} from "./types.js";

export interface MinedTrace {
  steps: TraceStep[];
  selectorHints: Array<{
    action: string;
    target?: string;
    selector: NonNullable<TraceStep["selector"]>;
  }>;
  screenFingerprints: string[];
  timings: TimingProfile[];
  failure?: FailureAnnotation;
  provenance: SkillProvenance;
}

export function mineTrace(trace: LearningTrace, learnedAt = new Date().toISOString()): MinedTrace {
  const steps = compactSteps(trace.steps);
  const selectorHints = steps.flatMap((step) =>
    step.selector
      ? [
          {
            action: step.action,
            ...(step.target ? { target: step.target } : {}),
            selector: step.selector,
          },
        ]
      : [],
  );
  const screenFingerprints = unique(
    steps.flatMap((step) => (step.screenFingerprint ? [step.screenFingerprint] : [])),
  );
  const timings = timingProfiles(trace.steps);
  const failed = trace.steps.at(-1);
  return {
    steps,
    selectorHints,
    screenFingerprints,
    timings,
    ...(trace.outcome === "failure" && trace.failure
      ? {
          failure: {
            traceId: trace.id,
            message: trace.failure,
            ...(failed?.action ? { failedAction: failed.action } : {}),
            ...(failed?.target ? { failedTarget: failed.target } : {}),
            ...(failed?.screenshot ? { screenshot: failed.screenshot } : {}),
            recordedAt: trace.completedAt ?? learnedAt,
          },
        }
      : {}),
    provenance: {
      traceId: trace.id,
      outcome: trace.outcome,
      traceSha256: hashTrace(trace),
      learnedAt,
    },
  };
}

export function compactSteps(steps: readonly TraceStep[]): TraceStep[] {
  return steps
    .filter((step, index) => {
      const previous = steps[index - 1];
      if (step.action === "wait" && previous?.action === "wait") return false;
      if (step.action === "screenshot" && steps[index + 1]?.action === "screenshot") return false;
      return !(
        step.stable === true &&
        previous?.stable === true &&
        step.action === previous.action &&
        step.target === previous.target
      );
    })
    .map((step) => ({ ...step, ...(step.selector ? { selector: { ...step.selector } } : {}) }));
}

function timingProfiles(steps: readonly TraceStep[]): TimingProfile[] {
  const groups = new Map<string, number[]>();
  for (const step of steps)
    if (step.durationMs !== undefined)
      groups.set(step.action, [...(groups.get(step.action) ?? []), step.durationMs]);
  return [...groups.entries()]
    .map(([action, values]) => {
      const sorted = values.toSorted((a, b) => a - b);
      return {
        action,
        samples: sorted.length,
        medianMs: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
      };
    })
    .sort((a, b) => a.action.localeCompare(b.action));
}
function percentile(values: number[], fraction: number): number {
  return values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] ?? 0;
}
function hashTrace(trace: LearningTrace): string {
  return createHash("sha256").update(JSON.stringify(trace)).digest("hex");
}
function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
