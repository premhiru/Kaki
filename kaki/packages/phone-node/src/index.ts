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

  async execute(taskId: string, goal: string): Promise<VisionDecision> {
    const history: VisionDecision[] = [];
    let lastSignature = "";
    let previousScreenshot: Uint8Array | undefined;
    let stalls = 0;
    for (let step = 0; step < this.stepBudget; step += 1) {
      const screenshot = await this.driver.screenshot();
      const accessibilityTree = await this.driver.dumpUi();
      const snapshot: PhoneSnapshot = {
        screenshot,
        capturedAt: new Date().toISOString(),
        ...(accessibilityTree ? { accessibilityTree } : {}),
      };
      const decision = await this.planner.decide({ snapshot, goal, history });
      validateDecision(decision);
      await this.traces.append(taskId, snapshot, decision);
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
        stalls = 0;
      } else await this.driver.act(decision.action);
    }
    return {
      observation: "Step budget exhausted",
      progress: "Stopped safely",
      action: { type: "fail", target: "step-budget" },
      confidence: 1,
    };
  }
}

export function validateDecision(decision: VisionDecision): void {
  if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1)
    throw new Error("invalid-confidence");
  if (!decision.observation || !decision.progress) throw new Error("invalid-vision-decision");
  const approvalSurface = `${decision.observation} ${decision.progress} ${String(decision.action.target)}`;
  if (
    /\b(pay|confirm|book|order|submit|transfer|top[ -]?up|consent)\b/iu.test(approvalSurface) &&
    decision.action.type === "tap"
  )
    throw new Error("approval-checkpoint-required");
}

export function parseVisionDecision(value: unknown): VisionDecision {
  if (!value || typeof value !== "object") throw new Error("invalid-vision-json");
  const decision = value as VisionDecision;
  validateDecision(decision);
  const allowed = new Set([
    "tap",
    "long_press",
    "swipe",
    "type",
    "key",
    "launch",
    "wait",
    "scroll_to",
    "done",
    "need_approval",
    "fail",
  ]);
  if (!allowed.has(decision.action.type)) throw new Error("invalid-action-type");
  return decision;
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
export * from "./daemon.js";
export * from "./trace-store.js";
export * from "./surface.js";
