import { buildHandoff, type HandoffKind } from "@kaki/approval-node";
import type {
  EvidenceRef,
  JsonObject,
  SurfaceContext,
  SurfaceResult,
  SurfaceStep,
} from "@kaki/core";
import type { BrowserRunResult } from "./index.js";

export interface BrowserEvidenceStore {
  persist(
    context: Pick<SurfaceContext, "taskId" | "traceId" | "householdId" | "personId">,
    stepId: string,
    bytes: Uint8Array,
    label: string,
  ): Promise<EvidenceRef>;
}

/** Converts the browser's private runtime result at the canonical surface boundary. */
export async function browserRunToSurfaceResult(
  result: BrowserRunResult,
  step: SurfaceStep,
  context: SurfaceContext,
  evidenceStore?: BrowserEvidenceStore,
  verified = false,
): Promise<SurfaceResult> {
  if (!result.handoff) return { status: "done", output: result.data, verified };
  const evidence =
    result.screenshot && evidenceStore
      ? [await evidenceStore.persist(context, step.id, result.screenshot, result.handoff)]
      : [];
  const handoff = isHandoff(result.handoff) ? buildHandoff(result.handoff) : undefined;
  return {
    status: "need_approval",
    category: handoff?.category ?? step.riskCategory,
    materialFacts: materialFacts(step.input),
    evidence,
  };
}

function materialFacts(input: JsonObject | undefined): JsonObject {
  const value = input?.materialFacts;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}
function isHandoff(value: string): value is HandoffKind {
  return ["singpass", "otp", "bank-2fa", "paynow", "captcha"].includes(value);
}
