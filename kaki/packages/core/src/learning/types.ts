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

type UnknownRecord = Record<string, unknown>;

const credentialPatterns: readonly RegExp[] = [
  /\b(?:password|passwd|pin|otp|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret)\s*[:=]\s*\S+/iu,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

export function parseLearningTrace(value: unknown): LearningTrace {
  const record = ownedRecord(value, "learning-trace-invalid");
  rejectExtra(record, [
    "id",
    "goal",
    "locale",
    "outcome",
    "steps",
    "failure",
    "completedAt",
    "source",
  ]);
  const outcome = requiredEnum(record.outcome, ["success", "failure"], "learning-outcome-invalid");
  const failure = optionalSafeText(record.failure, "learning-failure-invalid", 2048);
  if (outcome === "failure" && !failure) throw new Error("learning-failure-required");
  if (outcome === "success" && failure) throw new Error("learning-success-has-failure");
  const steps = unknownArray(record.steps, "learning-steps-invalid", 1000).map(parseTraceStep);
  return {
    id: requiredSafeText(record.id, "learning-trace-id-invalid", 128),
    goal: requiredSafeText(record.goal, "learning-goal-invalid", 4096),
    locale: requiredSafeText(record.locale, "learning-locale-invalid", 32),
    outcome,
    steps,
    ...(failure ? { failure } : {}),
    ...(record.completedAt === undefined
      ? {}
      : { completedAt: timestamp(record.completedAt, "learning-completed-at-invalid") }),
    ...(record.source === undefined
      ? {}
      : {
          source: requiredEnum(
            record.source,
            ["browser", "phone", "fixture"],
            "learning-source-invalid",
          ),
        }),
  };
}

export function parseLearnedSkill(value: unknown): LearnedSkill {
  const record = ownedRecord(value, "learned-skill-invalid");
  rejectExtra(record, [
    "id",
    "title",
    "locales",
    "version",
    "learnedFrom",
    "successfulSteps",
    "failureNotes",
    "failureAnnotations",
    "selectorHints",
    "screenFingerprints",
    "timings",
    "provenance",
    "createdAt",
    "updatedAt",
  ]);
  const successfulSteps = unknownArray(
    record.successfulSteps,
    "learned-skill-steps-invalid",
    1000,
  ).map(parseTraceStep);
  const failureAnnotations = unknownArray(
    record.failureAnnotations,
    "learned-skill-failures-invalid",
    1000,
  ).map((value) => {
    const annotation = ownedRecord(value, "learned-skill-failure-invalid");
    rejectExtra(annotation, [
      "traceId",
      "message",
      "failedAction",
      "failedTarget",
      "screenshot",
      "recordedAt",
    ]);
    const failedAction = optionalSafeText(
      annotation.failedAction,
      "learned-skill-action-invalid",
      256,
    );
    const failedTarget = optionalSafeText(
      annotation.failedTarget,
      "learned-skill-target-invalid",
      1024,
    );
    return {
      traceId: requiredSafeText(annotation.traceId, "learned-skill-trace-invalid", 128),
      message: requiredSafeText(annotation.message, "learned-skill-message-invalid", 2048),
      ...(failedAction ? { failedAction } : {}),
      ...(failedTarget ? { failedTarget } : {}),
      ...(annotation.screenshot === undefined
        ? {}
        : { screenshot: screenshotRef(annotation.screenshot) }),
      recordedAt: timestamp(annotation.recordedAt, "learned-skill-recorded-at-invalid"),
    };
  });
  const selectorHints = unknownArray(
    record.selectorHints,
    "learned-skill-selectors-invalid",
    2000,
  ).map((value) => {
    const hint = ownedRecord(value, "learned-skill-selector-invalid");
    rejectExtra(hint, ["action", "target", "selector"]);
    const target = optionalSafeText(hint.target, "learned-skill-target-invalid", 1024);
    return {
      action: requiredSafeText(hint.action, "learned-skill-action-invalid", 256),
      ...(target ? { target } : {}),
      selector: parseSelector(hint.selector),
    };
  });
  const timings = unknownArray(record.timings, "learned-skill-timings-invalid", 1000).map(
    (value) => {
      const timing = ownedRecord(value, "learned-skill-timing-invalid");
      rejectExtra(timing, ["action", "samples", "medianMs", "p95Ms"]);
      return {
        action: requiredSafeText(timing.action, "learned-skill-action-invalid", 256),
        samples: positiveInteger(timing.samples, "learned-skill-samples-invalid"),
        medianMs: nonnegativeNumber(timing.medianMs, "learned-skill-median-invalid"),
        p95Ms: nonnegativeNumber(timing.p95Ms, "learned-skill-p95-invalid"),
      };
    },
  );
  const provenance = unknownArray(record.provenance, "learned-skill-provenance-invalid", 2000).map(
    (value) => {
      const item = ownedRecord(value, "learned-skill-provenance-item-invalid");
      rejectExtra(item, ["traceId", "outcome", "traceSha256", "learnedAt"]);
      const traceSha256 = requiredSafeText(item.traceSha256, "learned-skill-sha-invalid", 64);
      if (!/^[a-f0-9]{64}$/u.test(traceSha256)) throw new Error("learned-skill-sha-invalid");
      return {
        traceId: requiredSafeText(item.traceId, "learned-skill-trace-invalid", 128),
        outcome: requiredEnum(item.outcome, ["success", "failure"], "learning-outcome-invalid"),
        traceSha256,
        learnedAt: timestamp(item.learnedAt, "learned-skill-learned-at-invalid"),
      };
    },
  );
  return {
    id: requiredSafeText(record.id, "learned-skill-id-invalid", 256),
    title: requiredSafeText(record.title, "learned-skill-title-invalid", 256),
    locales: safeStringArray(record.locales, "learned-skill-locales-invalid", 32),
    version: positiveInteger(record.version, "learned-skill-version-invalid"),
    learnedFrom: safeStringArray(record.learnedFrom, "learned-skill-traces-invalid", 2000),
    successfulSteps,
    failureNotes: safeStringArray(record.failureNotes, "learned-skill-notes-invalid", 1000),
    failureAnnotations,
    selectorHints,
    screenFingerprints: safeStringArray(
      record.screenFingerprints,
      "learned-skill-screens-invalid",
      2000,
    ),
    timings,
    provenance,
    createdAt: timestamp(record.createdAt, "learned-skill-created-at-invalid"),
    updatedAt: timestamp(record.updatedAt, "learned-skill-updated-at-invalid"),
  };
}

function parseTraceStep(value: unknown): TraceStep {
  const record = ownedRecord(value, "learning-step-invalid");
  rejectExtra(record, [
    "surface",
    "action",
    "target",
    "durationMs",
    "screenshot",
    "selector",
    "screenFingerprint",
    "stable",
  ]);
  if (record.stable !== undefined && typeof record.stable !== "boolean")
    throw new Error("learning-step-stable-invalid");
  const target = optionalSafeText(record.target, "learning-target-invalid", 1024);
  const screenFingerprint = optionalSafeText(
    record.screenFingerprint,
    "learning-screen-invalid",
    256,
  );
  return {
    surface: requiredEnum(
      record.surface,
      ["browser", "phone", "approval", "api"],
      "learning-surface-invalid",
    ),
    action: requiredSafeText(record.action, "learning-action-invalid", 256),
    ...(target ? { target } : {}),
    ...(record.durationMs === undefined
      ? {}
      : { durationMs: nonnegativeNumber(record.durationMs, "learning-duration-invalid") }),
    ...(record.screenshot === undefined ? {} : { screenshot: screenshotRef(record.screenshot) }),
    ...(record.selector === undefined ? {} : { selector: parseSelector(record.selector) }),
    ...(screenFingerprint ? { screenFingerprint } : {}),
    ...(record.stable === undefined ? {} : { stable: record.stable }),
  };
}

function parseSelector(value: unknown): NonNullable<TraceStep["selector"]> {
  const record = ownedRecord(value, "learning-selector-invalid");
  rejectExtra(record, ["kind", "value", "confidence"]);
  const confidence =
    record.confidence === undefined
      ? undefined
      : nonnegativeNumber(record.confidence, "learning-confidence-invalid");
  if (confidence !== undefined && confidence > 1) throw new Error("learning-confidence-invalid");
  return {
    kind: requiredEnum(
      record.kind,
      ["role", "label", "text", "test-id", "css", "a11y", "coordinates"],
      "learning-selector-kind-invalid",
    ),
    value: requiredSafeText(record.value, "learning-selector-value-invalid", 1024),
    ...(confidence === undefined ? {} : { confidence }),
  };
}

function screenshotRef(value: unknown): string {
  const ref = requiredSafeText(value, "learning-screenshot-reference-invalid", 512);
  if (
    !/^(?:fixture|artifact):\/\/[A-Za-z0-9._/-]+$/u.test(ref) &&
    !/^sha256:[a-f0-9]{64}$/u.test(ref)
  )
    throw new Error("learning-screenshot-reference-invalid");
  return ref;
}

function ownedRecord(value: unknown, code: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(code);
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
  const result: UnknownRecord = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(code);
    result[key] = descriptor.value;
  }
  return result;
}

function rejectExtra(record: UnknownRecord, allowed: readonly string[]): void {
  const extra = Object.keys(record).find((key) => !allowed.includes(key));
  if (extra) throw new Error(`learning-field-rejected:${extra}`);
}

function requiredSafeText(value: unknown, code: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(code);
  if (credentialPatterns.some((pattern) => pattern.test(value)))
    throw new Error("learning-secret-rejected");
  return maskIdentifiers(value);
}

function optionalSafeText(value: unknown, code: string, max: number): string | undefined {
  return value === undefined ? undefined : requiredSafeText(value, code, max);
}

function safeStringArray(value: unknown, code: string, max: number): string[] {
  return unknownArray(value, code, max).map((item) => requiredSafeText(item, code, 2048));
}

function unknownArray(value: unknown, code: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(code);
  return value;
}

function requiredEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  code: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error(code);
  return value;
}

function timestamp(value: unknown, code: string): string {
  const result = requiredSafeText(value, code, 64);
  if (!Number.isFinite(Date.parse(result))) throw new Error(code);
  return result;
}

function positiveInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error(code);
  return Number(value);
}

function nonnegativeNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(code);
  return value;
}

function maskIdentifiers(text: string): string {
  return text
    .replace(
      /\b([STFGM])\d{7}([A-Z])\b/giu,
      (_match, prefix: string, suffix: string) =>
        `${prefix.toUpperCase()}***${suffix.toUpperCase()}`,
    )
    .replace(/\b([A-Z])\d{7}\b/gu, (_match, prefix: string) => `${prefix}***`)
    .replace(/\b(?:\d[ -]?){12,19}\b/gu, (match) => `****${match.replace(/\D/gu, "").slice(-4)}`);
}
