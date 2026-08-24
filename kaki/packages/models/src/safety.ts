import type { ModelProvider, ModelRequest } from "./types.js";
export interface SafetyDecision {
  safe: boolean;
  categories: string[];
  reason: string;
}
export interface SafetyClassifier {
  classify(text: string, context: "household" | "external"): Promise<SafetyDecision>;
}
export class SeaGuardClassifier implements SafetyClassifier {
  constructor(
    private readonly provider: ModelProvider,
    private readonly model = "SEA-Guard",
  ) {}
  async classify(text: string, context: "household" | "external"): Promise<SafetyDecision> {
    const request: ModelRequest = {
      task: "safety",
      locale: "sg",
      messages: [
        {
          role: "system",
          content: "Classify SEA-language safety. Return JSON: safe, categories, reason.",
        },
        { role: "user", content: JSON.stringify({ context, text }) },
      ],
      maxOutputTokens: 200,
      temperature: 0,
    };
    const response = await this.provider.complete(this.model, request);
    const parsed = JSON.parse(response.text) as Record<string, unknown>;
    if (typeof parsed.safe !== "boolean") throw new Error("sea-guard-invalid-response");
    return {
      safe: parsed.safe,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.filter((item): item is string => typeof item === "string")
        : [],
      reason: typeof parsed.reason === "string" ? parsed.reason : "classified",
    };
  }
  async assertOutbound(text: string): Promise<void> {
    const decision = await this.classify(text, "external");
    if (!decision.safe)
      throw new Error(`unsafe-outbound:${decision.categories.join(",") || "unspecified"}`);
  }
}
