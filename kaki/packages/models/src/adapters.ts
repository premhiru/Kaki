import {
  asFiniteNumber,
  asOptionalRecord,
  readStringValue,
} from "openclaw/plugin-sdk/string-coerce-runtime";
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
    | "openai"
    | "openrouter"
    | "ollama"
    | "vllm"
    | "sea-lion"
    | "typhoon"
    | "sahabat-ai"
    | "mallam"
    | "ilmu"
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
    const message = requireProviderObject(choice.message);
    const usage = requireProviderObject(body.usage);
    const finishReason = readStringValue(choice.finish_reason);
    return {
      text: requireProviderString(message.content),
      model: readStringValue(body.model) ?? model,
      provider: this.name,
      usage: {
        inputTokens: asFiniteNumber(usage.prompt_tokens) ?? 0,
        outputTokens: asFiniteNumber(usage.completion_tokens) ?? 0,
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
    const usage = requireProviderObject(body.usage);
    const finishReason = readStringValue(body.stop_reason);
    return {
      text: requireProviderString(content.text),
      model: readStringValue(body.model) ?? model,
      provider: this.name,
      usage: {
        inputTokens: asFiniteNumber(usage.input_tokens) ?? 0,
        outputTokens: asFiniteNumber(usage.output_tokens) ?? 0,
      },
      ...(finishReason ? { finishReason } : {}),
    };
  }
}

function parseJson(value: Uint8Array | string): Record<string, unknown> {
  return requireProviderObject(
    JSON.parse(typeof value === "string" ? value : new TextDecoder().decode(value)) as unknown,
  );
}
function requireProviderObject(value: unknown): Record<string, unknown> {
  const record = asOptionalRecord(value);
  if (!record) throw new Error("provider-invalid-object");
  return record;
}
function firstObject(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || !value[0]) throw new Error("provider-invalid-array");
  return requireProviderObject(value[0]);
}
function requireProviderString(value: unknown): string {
  const text = readStringValue(value);
  if (text === undefined) throw new Error("provider-invalid-string");
  return text;
}
