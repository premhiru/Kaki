export type PhoneAction =
  | { type: "tap" | "long_press" | "scroll_to"; target: string | [number, number] }
  | { type: "swipe"; target: [number, number, number, number] }
  | { type: "type"; target: string; value: string }
  | { type: "key" | "launch" | "wait"; target: string }
  | { type: "done" | "need_approval" | "fail"; target: string };

export interface VisionDecision {
  observation: string;
  progress: string;
  action: PhoneAction;
  confidence: number;
}

export interface PhoneSnapshot {
  screenshot: Uint8Array;
  accessibilityTree?: string;
  capturedAt: string;
}
export interface PhoneDriver {
  screenshot(): Promise<Uint8Array>;
  dumpUi(): Promise<string | undefined>;
  act(action: PhoneAction): Promise<void>;
  backToHome(): Promise<void>;
}
export interface VisionPlanner {
  decide(input: {
    snapshot: PhoneSnapshot;
    goal: string;
    history: VisionDecision[];
  }): Promise<VisionDecision>;
}
export interface TraceSink {
  append(taskId: string, snapshot: PhoneSnapshot, decision: VisionDecision): Promise<void>;
}

export class PhoneAgent {
  constructor(
    private readonly driver: PhoneDriver,
    private readonly planner: VisionPlanner,
    private readonly traces: TraceSink,
    private readonly stepBudget = 40,
  ) {}

  async execute(
    taskId: string,
    goal: string,
    assertCurrent: () => void = () => {},
  ): Promise<VisionDecision> {
    const history: VisionDecision[] = [];
    let lastSignature = "";
    let previousScreenshot: Uint8Array | undefined;
    let stalls = 0;
    for (let step = 0; step < this.stepBudget; step += 1) {
      assertCurrent();
      const screenshot = await this.driver.screenshot();
      assertCurrent();
      const accessibilityTree = await this.driver.dumpUi();
      assertCurrent();
      const snapshot: PhoneSnapshot = {
        screenshot,
        capturedAt: new Date().toISOString(),
        ...(accessibilityTree ? { accessibilityTree } : {}),
      };
      const decision = await this.planner.decide({ snapshot, goal, history });
      assertCurrent();
      validateDecision(decision, accessibilityTree);
      await this.traces.append(taskId, snapshot, decision);
      assertCurrent();
      history.push(decision);
      if (["done", "need_approval", "fail"].includes(decision.action.type)) return decision;
      const signature = `${decision.observation}:${decision.action.type}:${String(decision.action.target)}`;
      const unchangedScreen = previousScreenshot
        ? screenshotDifference(previousScreenshot, screenshot) < 0.01
        : false;
      stalls = signature === lastSignature && unchangedScreen ? stalls + 1 : 0;
      lastSignature = signature;
      previousScreenshot = screenshot;
      if (stalls >= 2) {
        await this.driver.act({ type: "key", target: "BACK" });
        assertCurrent();
        const lastLaunch = history.findLast((item) => item.action.type === "launch");
        if (lastLaunch) await this.driver.act(lastLaunch.action);
        assertCurrent();
        stalls = 0;
      } else {
        await this.driver.act(decision.action);
        assertCurrent();
      }
    }
    return {
      observation: "Step budget exhausted",
      progress: "Stopped safely",
      action: { type: "fail", target: "step-budget" },
      confidence: 1,
    };
  }
}

export function validateDecision(decision: VisionDecision, observedScreen = ""): void {
  if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1)
    throw new Error("invalid-confidence");
  if (!decision.observation || !decision.progress) throw new Error("invalid-vision-decision");
  const approvalSurface = `${observedScreen} ${decision.observation} ${decision.progress} ${String(decision.action.target)}`;
  if (
    /\b(pay|confirm|book|order|submit|transfer|top[ -]?up|consent)\b/iu.test(approvalSurface) &&
    decision.action.type === "tap"
  )
    throw new Error("approval-checkpoint-required");
}

export function parseVisionDecision(value: unknown): VisionDecision {
  if (typeof value !== "object" || value === null) throw new Error("invalid-vision-json");
  if (
    !("observation" in value) ||
    typeof value.observation !== "string" ||
    !("progress" in value) ||
    typeof value.progress !== "string" ||
    !("confidence" in value) ||
    typeof value.confidence !== "number" ||
    !("action" in value)
  )
    throw new Error("invalid-vision-decision");
  const decision: VisionDecision = {
    observation: value.observation,
    progress: value.progress,
    confidence: value.confidence,
    action: parsePhoneAction(value.action),
  };
  validateDecision(decision);
  return decision;
}

function parsePhoneAction(value: unknown): PhoneAction {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    typeof value.type !== "string" ||
    !("target" in value)
  )
    throw new Error("invalid-action");

  if (value.type === "swipe") {
    if (!isSwipeTarget(value.target)) throw new Error("invalid-swipe-target");
    return { type: value.type, target: value.target };
  }
  if (value.type === "tap" || value.type === "long_press") {
    if (typeof value.target !== "string" && !isPointTarget(value.target))
      throw new Error("invalid-point-target");
    return { type: value.type, target: value.target };
  }
  if (typeof value.target !== "string" || !value.target.trim())
    throw new Error("invalid-action-target");
  if (value.type === "type") {
    if (!("value" in value) || typeof value.value !== "string")
      throw new Error("invalid-type-value");
    return { type: value.type, target: value.target, value: value.value };
  }
  if (
    value.type === "key" ||
    value.type === "launch" ||
    value.type === "wait" ||
    value.type === "scroll_to" ||
    value.type === "done" ||
    value.type === "need_approval" ||
    value.type === "fail"
  )
    return { type: value.type, target: value.target };
  throw new Error("invalid-action-type");
}

function isPointTarget(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item: unknown) => typeof item === "number" && Number.isFinite(item))
  );
}

function isSwipeTarget(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item: unknown) => typeof item === "number" && Number.isFinite(item))
  );
}

function screenshotDifference(previous: Uint8Array, current: Uint8Array): number {
  if (previous.byteLength !== current.byteLength || previous.byteLength === 0) return 1;
  let changed = 0;
  for (let index = 0; index < previous.byteLength; index += 1) {
    if (previous[index] !== current[index]) changed += 1;
  }
  return changed / previous.byteLength;
}

export * from "./adb-transport.js";
export * from "./companion-transport.js";
export * from "./daemon.js";
export * from "./trace-store.js";
export * from "./surface.js";
