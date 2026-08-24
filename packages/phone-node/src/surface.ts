import type { EvidenceRef, JsonObject, SurfaceResult, SurfaceStep } from "@kaki/core";
import type { VisionDecision } from "./index.js";

/** Converts a terminal vision decision without trusting model text to set approval facts or risk. */
export function phoneDecisionToSurfaceResult(
  decision: VisionDecision,
  step: SurfaceStep,
  evidence: readonly EvidenceRef[] = [],
  verified = false,
): SurfaceResult {
  switch (decision.action.type) {
    case "done":
      return {
        status: "done",
        output: {
          observation: decision.observation,
          progress: decision.progress,
          confidence: decision.confidence,
        },
        verified,
        evidence,
      };
    case "need_approval":
      return {
        status: "need_approval",
        category: step.riskCategory,
        materialFacts: materialFacts(step.input),
        evidence,
      };
    case "fail":
      return {
        status: "failed",
        error: {
          code: "phone-action-failed",
          kind: "external_changed",
          message: decision.action.target,
          retryable: false,
        },
      };
    default:
      throw new Error("phone-surface-result-not-terminal");
  }
}
function materialFacts(input: JsonObject | undefined): JsonObject {
  const value = input?.materialFacts;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}
