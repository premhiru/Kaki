import type { HttpClient, ProviderName } from "./types.js";
export interface EmbeddingProvider {
  readonly name: ProviderName;
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
}
export class BgeM3Embeddings implements EmbeddingProvider {
  readonly model = "bge-m3";
  constructor(
    readonly name: Extract<ProviderName, "ollama" | "vllm">,
    private readonly baseUrl: string,
    private readonly http: HttpClient,
    private readonly apiKey?: string,
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.http.request({
      url: `${this.baseUrl.replace(/\/$/u, "")}/embeddings`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.model, input: texts }),
      timeoutMs: 60_000,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`embedding-http-${response.status}`);
    const parsed = JSON.parse(
      typeof response.body === "string" ? response.body : new TextDecoder().decode(response.body),
    ) as { data?: Array<{ embedding?: unknown }> };
    const vectors = parsed.data
      ?.map((item) => item.embedding)
      .filter(
        (item): item is number[] =>
          Array.isArray(item) && item.every((value) => typeof value === "number"),
      );
    if (!vectors || vectors.length !== texts.length) throw new Error("embedding-invalid-response");
    return vectors;
  }
}
