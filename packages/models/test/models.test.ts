import { expect, it, vi } from "vitest";
import {
  AnthropicAdapter,
  BgeM3Embeddings,
  BudgetManager,
  CostLedger,
  MemoryModelCache,
  ModelRuntime,
  OpenAiCompatibleAdapter,
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
  expect(routeModel("generate", "th").provider).toBe("typhoon");
  expect(routeModel("generate", "id").provider).toBe("sahabat-ai");
  expect(
    routeModel("planner", "sg", new Set(), { taskMaxCostUsd: { planner: 0.02 } }).maxCostUsd,
  ).toBe(0.02);
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
  const anthropic = await new AnthropicAdapter(
    { apiKey: "secret", baseUrl: "https://fixture/v1" },
    http,
  ).complete("claude", request);
  expect(sea.text).toBe("sea ok");
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
