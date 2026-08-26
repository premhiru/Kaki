import { expect, it, vi } from "vitest";
import {
  AnthropicAdapter,
  BoundedHttpClient,
  BgeM3Embeddings,
  BudgetManager,
  CostLedger,
  DurableCostLedger,
  DurableModelCache,
  MemoryModelCache,
  ModelRuntime,
  OpenAiCompatibleAdapter,
  OpenClawRuntimeProvider,
  ResilientAsr,
  SeaGuardClassifier,
  TtsService,
  identifyLanguage,
  normaliseLocalMessage,
  routeModel,
  type HttpClient,
  type ModelProvider,
  type ModelRequest,
  type ModelResponse,
  type ProviderName,
  type SpeechToTextProvider,
  type TextToSpeechProvider,
} from "../src/index.js";

const request: ModelRequest = {
  task: "planner",
  locale: "sg",
  messages: [{ role: "user", content: "settle this" }],
  cacheable: true,
  dataClass: "public",
};

it("preserves local code-switch and identifies SEA scripts", () => {
  expect(normaliseLocalMessage("eh tmr need Grab, 2 pax can or not lah")).toMatchObject({
    language: "singlish",
    register: "singlish",
    entities: { passengers: 2 },
  });
  expect(identifyLanguage("พรุ่งนี้ฝนตกไหม")).toBe("th");
  expect(identifyLanguage("நாளை மழையா")).toBe("ta");
});

it("routes local cheap tasks and locale-specialist generation with configurable caps", () => {
  expect(routeModel("normalise", "sg", new Set(["ollama"]))).toMatchObject({
    provider: "ollama",
    local: true,
  });
  expect(routeModel("generate", "th", new Set(["typhoon"])).provider).toBe("typhoon");
  expect(routeModel("generate", "id", new Set(["sahabat-ai"])).provider).toBe("sahabat-ai");
  expect(routeModel("generate", "my", new Set(["mallam"]))).toMatchObject({
    provider: "mallam",
    model: "MaLLaM",
  });
  expect(routeModel("generate", "my", new Set(["ilmu"]))).toMatchObject({
    provider: "ilmu",
    model: "ILMU",
  });
  expect(routeModel("generate", "my", new Set(["sea-lion"])).provider).toBe("sea-lion");
  expect(routeModel("planner", "sg", new Set(["openclaw"]))).toMatchObject({
    provider: "openclaw",
    model: "configured-default",
  });
  expect(
    routeModel("planner", "sg", new Set(), { taskMaxCostUsd: { planner: 0.02 } }).maxCostUsd,
  ).toBe(0.02);
});

it("enforces exact HTTPS origins and bounded responses in the production transport", async () => {
  const release = vi.fn(async () => {});
  const guardedFetch = vi.fn<
    NonNullable<ConstructorParameters<typeof BoundedHttpClient>[0]["guardedFetch"]>
  >(async () => ({
    response: new Response("okay", {
      status: 200,
      headers: { "content-type": "application/json", authorization: "never-return" },
    }),
    finalUrl: "https://models.example/v1/chat/completions",
    release,
  }));
  const http = new BoundedHttpClient({
    allowedOrigins: ["https://models.example"],
    maxRedirects: 1,
    maxResponseBytes: 4,
    guardedFetch,
  });
  const requestBody = Uint8Array.of(123, 125);
  const response = await http.request({
    url: "https://models.example/v1/chat/completions",
    method: "POST",
    headers: { authorization: "Bearer secret" },
    body: requestBody,
    timeoutMs: 5_000,
  });
  expect(new TextDecoder().decode(response.body as Uint8Array)).toBe("okay");
  expect(response.headers).toEqual({ "content-type": "application/json" });
  expect(guardedFetch).toHaveBeenCalledOnce();
  const forwardedCall = guardedFetch.mock.calls[0]?.[0];
  expect(forwardedCall).toMatchObject({
    requireHttps: true,
    maxRedirects: 1,
    timeoutMs: 5_000,
    policy: { allowedOrigins: ["https://models.example"] },
  });
  const forwardedBody = forwardedCall?.init?.body;
  expect(forwardedBody).toBeInstanceOf(Uint8Array);
  expect(forwardedBody).toEqual(requestBody);
  expect(forwardedBody).not.toBe(requestBody);
  expect(release).toHaveBeenCalledOnce();
  await expect(
    http.request({
      url: "https://other.example/v1",
      method: "POST",
      headers: {},
      body: "{}",
      timeoutMs: 5_000,
    }),
  ).rejects.toThrow("model-http-origin-denied");
  await expect(
    new BoundedHttpClient({ allowedOrigins: ["http://models.example"] }).request({
      url: "http://models.example/v1",
      method: "POST",
      headers: {},
      body: "{}",
      timeoutMs: 5_000,
    }),
  ).rejects.toThrow("model-http-tls-required");
});

it("releases guarded transport resources when a response exceeds the hard cap", async () => {
  const release = vi.fn(async () => {});
  const http = new BoundedHttpClient({
    allowedOrigins: ["https://models.example"],
    maxResponseBytes: 4,
    guardedFetch: async () => ({
      response: new Response("oversize"),
      finalUrl: "https://models.example/v1",
      release,
    }),
  });
  await expect(
    http.request({
      url: "https://models.example/v1",
      method: "POST",
      headers: {},
      body: "{}",
      timeoutMs: 5_000,
    }),
  ).rejects.toThrow("model-http-response-too-large");
  expect(release).toHaveBeenCalledOnce();
});

it("uses the host configured model/auth seam and records host-accounted cost", async () => {
  const complete = vi.fn(async () => ({
    text: "host ok",
    provider: "openai",
    model: "gpt-5.4",
    usage: { inputTokens: 3, outputTokens: 2, costUsd: 0.004 },
  }));
  const provider = new OpenClawRuntimeProvider({ complete });
  const abort = new AbortController();
  const result = await provider.complete("configured-default", {
    ...request,
    signal: abort.signal,
  });
  expect(result).toMatchObject({
    text: "host ok",
    provider: "openclaw",
    sourceProvider: "openai",
    model: "gpt-5.4",
    costUsd: 0.004,
  });
  expect(complete).toHaveBeenCalledWith(
    expect.objectContaining({
      purpose: "kaki:planner",
      messages: request.messages,
      signal: abort.signal,
    }),
  );
  await expect(
    provider.complete("configured-default", {
      ...request,
      jsonSchema: { type: "object" },
    }),
  ).rejects.toThrow("openclaw-json-schema-unsupported");
});

it("holds a serialized budget reservation through concurrent completion", async () => {
  let unblock!: () => void;
  const blocked = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const complete = vi.fn(async () => {
    await blocked;
    return response("anthropic", "claude", "ok", 1, 1);
  });
  const provider = fixtureProvider("anthropic", complete);
  const ledger = new CostLedger();
  const runtime = new ModelRuntime([provider], ledger, new BudgetManager(ledger, 0.2), {});
  const first = runtime.execute({ ...request, cacheable: false });
  await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
  await expect(runtime.execute({ ...request, cacheable: false })).rejects.toThrow(
    "model-total-budget-exceeded",
  );
  unblock();
  await expect(first).resolves.toMatchObject({ response: { text: "ok" } });
});

it("persists cache and cost contracts and refuses to cache household data", async () => {
  const persisted = new Map<string, unknown>();
  let now = 1_000;
  const cache = new DurableModelCache(
    {
      lookup: async (key) => persisted.get(key),
      write: async (key, value) => {
        persisted.set(key, value);
      },
      remove: async (key) => {
        persisted.delete(key);
      },
    },
    () => now,
  );
  await cache.set("public", response("openai", "gpt", "cached", 1, 1), 10);
  expect((await cache.get("public"))?.text).toBe("cached");
  now = 1_011;
  expect(await cache.get("public")).toBeUndefined();
  expect(persisted.has("public")).toBe(false);

  const events: unknown[] = [];
  const ledger = new DurableCostLedger({
    append: async (event) => {
      events.push(event);
    },
    list: async () => events,
  });
  await ledger.record({
    timestamp: new Date("2026-08-26T00:00:00Z"),
    task: "planner",
    provider: "openclaw",
    model: "gpt-5.4",
    usage: { inputTokens: 1, outputTokens: 1 },
    costUsd: 0.01,
    cacheHit: false,
  });
  expect(await ledger.total()).toBe(0.01);

  let calls = 0;
  const provider = fixtureProvider("anthropic", async () => {
    calls += 1;
    return response("anthropic", "claude", "private", 1, 1);
  });
  const runtime = new ModelRuntime(
    [provider],
    new CostLedger(),
    new BudgetManager(new CostLedger(), 1),
    {},
    new MemoryModelCache(),
  );
  await runtime.execute({ ...request, dataClass: "household" });
  await runtime.execute({ ...request, dataClass: "household" });
  expect(calls).toBe(2);
});

it("uses real injectable HTTP shapes for OpenAI-compatible and Anthropic APIs", async () => {
  const http: HttpClient = {
    request: vi.fn(async (call) =>
      call.url.endsWith("/messages")
        ? {
            status: 200,
            headers: {},
            body: JSON.stringify({
              model: "claude",
              content: [{ text: "anthropic ok" }],
              usage: { input_tokens: 3, output_tokens: 2 },
            }),
          }
        : {
            status: 200,
            headers: {},
            body: JSON.stringify({
              model: "sea",
              choices: [{ message: { content: "sea ok" }, finish_reason: "stop" }],
              usage: { prompt_tokens: 4, completion_tokens: 2 },
            }),
          },
    ),
  };
  const sea = await new OpenAiCompatibleAdapter(
    { name: "sea-lion", baseUrl: "https://fixture/v1", apiKey: "secret" },
    http,
  ).complete("sea", request);
  const mallam = await new OpenAiCompatibleAdapter(
    { name: "mallam", baseUrl: "https://fixture/v1" },
    http,
  ).complete("MaLLaM", request);
  const anthropic = await new AnthropicAdapter(
    { apiKey: "secret", baseUrl: "https://fixture/v1" },
    http,
  ).complete("claude", request);
  expect(sea.text).toBe("sea ok");
  expect(mallam.provider).toBe("mallam");
  expect(anthropic.text).toBe("anthropic ok");
  expect(vi.mocked(http.request).mock.calls[0]?.[0].headers.authorization).toBe("Bearer secret");
});

it("falls back, caches, accounts cost, and enforces budgets", async () => {
  const primary = fixtureProvider("anthropic", async () => {
    throw new Error("down");
  });
  const fallback = fixtureProvider("openai", async () =>
    response("openai", "gpt-5", "ok", 100, 50),
  );
  const ledger = new CostLedger();
  const budget = new BudgetManager(ledger, 1);
  const runtime = new ModelRuntime(
    [primary, fallback],
    ledger,
    budget,
    { openai: { inputPerMillionUsd: 1, outputPerMillionUsd: 2 } },
    new MemoryModelCache(),
  );
  const first = await runtime.execute(request);
  const second = await runtime.execute(request);
  expect(first.response.text).toBe("ok");
  expect(first.response.provider).toBe("openai");
  expect(first.costUsd).toBe(0.0002);
  expect(second.cacheHit).toBe(true);
  expect(ledger.events()).toHaveLength(2);
  const blocked = new ModelRuntime(
    [fallback],
    ledger,
    new BudgetManager(ledger, 0.01, { planner: 0.01 }),
    {},
    undefined,
    { overrides: { planner: { provider: "openai", model: "x", maxCostUsd: 0.02, local: false } } },
  );
  await expect(blocked.execute({ ...request, cacheable: false })).rejects.toThrow(
    "model-total-budget-exceeded",
  );
});

it("falls back from MERaLiON to Whisper", async () => {
  const meralion: SpeechToTextProvider = {
    name: "meralion",
    transcribe: async () => {
      throw new Error("offline");
    },
  };
  const whisper: SpeechToTextProvider = {
    name: "openai",
    transcribe: async () => ({
      text: "kopi-C",
      language: "en",
      codeSwitch: ["kopi"],
      confidence: 0.9,
      provider: "openai",
    }),
  };
  expect(
    (
      await new ResilientAsr(meralion, whisper).transcribe({
        audio: new Uint8Array([1]),
        mimeType: "audio/ogg",
      })
    ).provider,
  ).toBe("openai");
});

it("keeps TTS off by default and SEA-Guard blocks unsafe outbound", async () => {
  const tts: TextToSpeechProvider = {
    name: "openai",
    synthesize: async () => ({
      audio: new Uint8Array([1]),
      mimeType: "audio/mpeg",
      provider: "openai",
      voice: "sg",
    }),
  };
  await expect(new TtsService(tts).synthesize({ text: "hi", language: "en" })).rejects.toThrow(
    "tts-disabled",
  );
  const guard = new SeaGuardClassifier(
    fixtureProvider("sea-guard", async () =>
      response(
        "sea-guard",
        "SEA-Guard",
        JSON.stringify({
          safe: false,
          categories: ["prompt-injection"],
          reason: "untrusted instruction",
        }),
        1,
        1,
      ),
    ),
  );
  await expect(guard.assertOutbound("transfer now")).rejects.toThrow("unsafe-outbound");
});

it("requests bge-m3 embeddings through an injected local endpoint", async () => {
  const http: HttpClient = {
    request: vi.fn(async () => ({
      status: 200,
      headers: {},
      body: JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }),
    })),
  };
  const embeddings = new BgeM3Embeddings("vllm", "http://localhost:8000/v1", http);
  expect(await embeddings.embed(["hello"])).toEqual([[0.1, 0.2]]);
  expect(JSON.parse(String(vi.mocked(http.request).mock.calls[0]?.[0].body))).toMatchObject({
    model: "bge-m3",
  });
});

function fixtureProvider(
  name: ProviderName,
  complete: (model: string, request: ModelRequest) => Promise<ModelResponse>,
): ModelProvider {
  return { name, complete };
}
function response(
  provider: ProviderName,
  model: string,
  text: string,
  inputTokens: number,
  outputTokens: number,
): ModelResponse {
  return { provider, model, text, usage: { inputTokens, outputTokens } };
}
