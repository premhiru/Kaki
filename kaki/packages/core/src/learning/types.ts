export type TraceOutcome = "success" | "failure";

export interface TraceStep {
  readonly surface: "browser" | "phone" | "approval" | "api";
  readonly action: string;
  readonly target?: string;
  readonly durationMs?: number;
  readonly screenshot?: string;
  readonly selector?: {
    readonly kind: "role" | "label" | "text" | "test-id" | "css" | "a11y" | "coordinates";
    readonly value: string;
    readonly confidence?: number;
  };
  readonly screenFingerprint?: string;
  readonly stable?: boolean;
}

export interface LearningTrace {
  readonly id: string;
  readonly goal: string;
  readonly locale: string;
  readonly outcome: TraceOutcome;
  readonly steps: readonly TraceStep[];
  readonly failure?: string;
  readonly completedAt?: string;
  readonly source?: "browser" | "phone" | "fixture";
}

export interface FailureAnnotation {
  readonly traceId: string;
  readonly message: string;
  readonly failedAction?: string;
  readonly failedTarget?: string;
  readonly screenshot?: string;
  readonly recordedAt: string;
}
export interface SkillProvenance {
  readonly traceId: string;
  readonly outcome: TraceOutcome;
  readonly traceSha256: string;
  readonly learnedAt: string;
}
export interface TimingProfile {
  readonly action: string;
  readonly samples: number;
  readonly medianMs: number;
  readonly p95Ms: number;
}

export interface LearnedSkill {
  readonly id: string;
  readonly title: string;
  readonly locales: readonly string[];
  readonly version: number;
  readonly learnedFrom: readonly string[];
  readonly successfulSteps: readonly TraceStep[];
  readonly failureNotes: readonly string[];
  readonly failureAnnotations: readonly FailureAnnotation[];
  readonly selectorHints: readonly {
    readonly action: string;
    readonly target?: string;
    readonly selector: NonNullable<TraceStep["selector"]>;
  }[];
  readonly screenFingerprints: readonly string[];
  readonly timings: readonly TimingProfile[];
  readonly provenance: readonly SkillProvenance[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
