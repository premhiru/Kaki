import type { ModelProvider, ModelRequest, ModelResponse } from "./types.js";

export interface OpenClawLlmCompletionOwner {
  complete(input: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    purpose?: string;
  }): Promise<{
    text: string;
    provider: string;
    model: string;
    usage: {
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
    };
  }>;
}

/** Uses OpenClaw's configured model and auth owner without exposing credentials to Kaki. */
export class OpenClawRuntimeProvider implements ModelProvider {
  readonly name = "openclaw" as const;

  constructor(private readonly owner: OpenClawLlmCompletionOwner) {}

  async complete(_model: string, request: ModelRequest): Promise<ModelResponse> {
    if (request.jsonSchema) throw new Error("openclaw-json-schema-unsupported");
    const result = await this.owner.complete({
      messages: request.messages.map((message) => ({
        role: message.role === "tool" ? "user" : message.role,
        content:
          message.role === "tool"
            ? `[Tool result${message.name ? `: ${message.name}` : ""}]\n${message.content}`
            : message.content,
      })),
      ...(request.maxOutputTokens === undefined ? {} : { maxTokens: request.maxOutputTokens }),
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      purpose: `kaki:${request.task}`,
      ...(request.signal ? { signal: request.signal } : {}),
    });
    if (
      typeof result.text !== "string" ||
      result.text.length > 4_000_000 ||
      typeof result.model !== "string" ||
      result.model.length < 1 ||
      result.model.length > 256 ||
      typeof result.provider !== "string" ||
      result.provider.length < 1 ||
      result.provider.length > 256
    ) {
      throw new Error("openclaw-model-response-invalid");
    }
    const costUsd = finiteNonNegative(result.usage.costUsd);
    return {
      text: result.text,
      model: result.model,
      provider: this.name,
      sourceProvider: result.provider,
      usage: {
        inputTokens: nonNegativeInteger(result.usage.inputTokens),
        outputTokens: nonNegativeInteger(result.usage.outputTokens),
      },
      ...(costUsd === undefined ? {} : { costUsd }),
    };
  }
}

function nonNegativeInteger(value: number | undefined): number {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}

function finiteNonNegative(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
