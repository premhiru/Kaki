export type ModelTask =
  | "planner"
  | "tool"
  | "vision"
  | "normalise"
  | "generate"
  | "safety"
  | "embedding"
  | "heartbeat"
  | "asr"
  | "tts";
export type Locale = "sg" | "my" | "id" | "th" | "vn" | "ph" | "mm" | "kh";
export type ProviderName =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "ollama"
  | "vllm"
  | "sea-lion"
  | "typhoon"
  | "sahabat-ai"
  | "sea-guard"
  | "meralion";

export interface ModelRoute {
  provider: ProviderName;
  model: string;
  maxCostUsd: number;
  local: boolean;
  fallback?: ModelRoute;
}
export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}
export interface ModelRequest {
  task: ModelTask;
  locale: Locale;
  messages: ModelMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  cacheable?: boolean;
  metadata?: Record<string, string>;
}
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
export interface ModelResponse {
  text: string;
  model: string;
  provider: ProviderName;
  usage: TokenUsage;
  finishReason?: string;
}
export interface ModelProvider {
  readonly name: ProviderName;
  complete(model: string, request: ModelRequest): Promise<ModelResponse>;
}
export interface HttpRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: Uint8Array | string;
  timeoutMs: number;
}
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}
export interface HttpClient {
  request(request: HttpRequest): Promise<HttpResponse>;
}
