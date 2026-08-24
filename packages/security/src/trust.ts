import type { RiskCategory } from "@kaki/core";
import { containsPromptInjection } from "./redaction.js";

export type UntrustedSource =
  "whatsapp-text" | "image-ocr" | "pdf-text" | "vendor-reply" | "web-content";
export interface ContentAssessment {
  source: UntrustedSource;
  trusted: false;
  injectionDetected: boolean;
  signals: string[];
  content: string;
}
export function assessUntrustedContent(
  source: UntrustedSource,
  content: string,
): ContentAssessment {
  const signals: string[] = [];
  if (containsPromptInjection(content)) signals.push("instruction-override");
  if (
    /(?:transfer|pay|book|submit|message|send|upload).{0,40}(?:now|immediately|without approval|already approved)/iu.test(
      content,
    )
  )
    signals.push("side-effect-request");
  if (/(?:api key|password|otp|memory\.md|credentials?|cookies?)/iu.test(content))
    signals.push("secret-request");
  return { source, trusted: false, injectionDetected: signals.length > 0, signals, content };
}
export function enforceTrustBoundary(
  assessment: ContentAssessment,
  proposedRisk: RiskCategory,
  hasIndependentUserIntent: boolean,
): void {
  if (proposedRisk === "none" || proposedRisk === "data.read") return;
  if (!hasIndependentUserIntent || assessment.injectionDetected)
    throw new Error(`untrusted-content-side-effect-denied:${assessment.source}`);
}
