import type {
  HttpClient,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ProviderName,
} from "./types.js";

export interface OpenAiCompatibleConfig {
  name: Extract<
    ProviderName,
    "openai" | "openrouter" | "ollama" | "vllm" | "sea-lion" | "typhoon" | "sahabat-ai"
  >;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/** Real OpenAI-compatible HTTP path shared by hosted and local SEA providers. */
export class OpenAiCompatibleAdapter implements ModelProvider {
  readonly name: OpenAiCompatibleConfig["name"];
  constructor(
    private readonly config: OpenAiCompatibleConfig,
    private readonly http: HttpClient,
  ) {
    this.name = config.name;
  }
  async complete(model: string, request: ModelRequest): Promise<ModelResponse> {
    const response = await this.http.request({
      url: `${this.config.baseUrl.replace(/\/$/u, "")}/chat/completions`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
        ...this.config.headers,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        ...(request.maxOutputTokens ? { max_tokens: request.maxOutputTokens } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.jsonSchema
          ? {
              response_format: {
                type: "json_schema",
                json_schema: { name: "kaki_response", schema: request.jsonSchema, strict: true },
              },
            }
          : {}),
      }),
      timeoutMs: this.config.timeoutMs ?? 60_000,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`${this.name}-http-${response.status}`);
    const body = parseJson(response.body);
    const choice = firstObject(body.choices);
    const message = asObject(choice.message);
    const usage = asObject(body.usage);
    const finishReason = optionalString(choice.finish_reason);
    return {
      text: asString(message.content),
      model: optionalString(body.model) ?? model,
      provider: this.name,
      usage: {
        inputTokens: optionalNumber(usage.prompt_tokens) ?? 0,
        outputTokens: optionalNumber(usage.completion_tokens) ?? 0,
      },
      ...(finishReason ? { finishReason } : {}),
    };
  }
}

export interface AnthropicConfig {
  baseUrl?: string;
  apiKey: string;
  version?: string;
  timeoutMs?: number;
}
export class AnthropicAdapter implements ModelProvider {
  readonly name = "anthropic" as const;
  constructor(
    private readonly config: AnthropicConfig,
    private readonly http: HttpClient,
  ) {}
  async complete(model: string, request: ModelRequest): Promise<ModelResponse> {
    const system = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const messages = request.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));
    const response = await this.http.request({
      url: `${(this.config.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/u, "")}/messages`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": this.config.version ?? "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens ?? 1024,
        ...(system ? { system } : {}),
        messages,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      }),
      timeoutMs: this.config.timeoutMs ?? 60_000,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`anthropic-http-${response.status}`);
    const body = parseJson(response.body);
    const content = firstObject(body.content);
    const usage = asObject(body.usage);
    const finishReason = optionalString(body.stop_reason);
    return {
      text: asString(content.text),
      model: optionalString(body.model) ?? model,
      provider: this.name,
      usage: {
        inputTokens: optionalNumber(usage.input_tokens) ?? 0,
        outputTokens: optionalNumber(usage.output_tokens) ?? 0,
      },
      ...(finishReason ? { finishReason } : {}),
    };
  }
}

function parseJson(value: Uint8Array | string): Record<string, unknown> {
  return asObject(
    JSON.parse(typeof value === "string" ? value : new TextDecoder().decode(value)) as unknown,
  );
}
function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("provider-invalid-object");
  return value as Record<string, unknown>;
}
function firstObject(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || !value[0]) throw new Error("provider-invalid-array");
  return asObject(value[0]);
}
function asString(value: unknown): string {
  if (typeof value !== "string") throw new Error("provider-invalid-string");
  return value;
}
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
