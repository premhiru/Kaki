import { describe, expect, it, vi } from "vitest";
import {
  HttpAsrAdapter,
  ResilientAsr,
  SeaGuardClassifier,
  TtsService,
  type HttpClient,
  type ModelProvider,
  type SpeechToTextProvider,
  type TextToSpeechProvider,
} from "../src/index.js";

const transcript = (provider: "meralion" | "openai", text = "settled", confidence = 0.9) => ({
  text,
  language: "en",
  codeSwitch: [],
  confidence,
  provider,
});

describe("speech provider boundaries", () => {
  it("keeps a confident MERaLiON transcript and falls back for blank or uncertain speech", async () => {
    const whisper = {
      name: "openai",
      transcribe: vi.fn(async () => transcript("openai")),
    } satisfies SpeechToTextProvider;
    const confident = {
      name: "meralion",
      transcribe: vi.fn(async () => transcript("meralion")),
    } satisfies SpeechToTextProvider;
    expect(
      (
        await new ResilientAsr(confident, whisper).transcribe({
          audio: new Uint8Array(),
          mimeType: "audio/ogg",
        })
      ).provider,
    ).toBe("meralion");
    expect(whisper.transcribe).not.toHaveBeenCalled();

    for (const primary of [
      { name: "meralion", transcribe: async () => transcript("meralion", "   ") },
      { name: "meralion", transcribe: async () => transcript("meralion", "unclear", 0.34) },
    ] satisfies SpeechToTextProvider[]) {
      expect(
        (
          await new ResilientAsr(primary, whisper).transcribe({
            audio: new Uint8Array([1]),
            mimeType: "audio/ogg",
          })
        ).provider,
      ).toBe("openai");
    }
  });

  it("forwards synthesis only after the operator enables TTS", async () => {
    const provider = {
      name: "openai",
      synthesize: vi.fn(async () => ({
        audio: new Uint8Array([1, 2]),
        mimeType: "audio/mpeg",
        provider: "openai" as const,
        voice: "sg",
      })),
    } satisfies TextToSpeechProvider;
    const output = await new TtsService(provider, true).synthesize({
      text: "can",
      language: "en",
      format: "mp3",
    });
    expect(output.voice).toBe("sg");
    expect(provider.synthesize).toHaveBeenCalledWith({
      text: "can",
      language: "en",
      format: "mp3",
    });
  });

  it("forms a bounded multipart request and validates provider responses", async () => {
    const request = vi.fn<HttpClient["request"]>(async () => ({
      status: 200,
      headers: {},
      body: new TextEncoder().encode(JSON.stringify({ text: "kopi C", code_switch: ["kopi", 3] })),
    }));
    const adapter = new HttpAsrAdapter("meralion", "MERaLiON-2", "https://asr.test/", {
      request,
    } satisfies HttpClient);
    await expect(
      adapter.transcribe({
        audio: new Uint8Array([7, 8]),
        mimeType: "audio/ogg",
        languageHint: "sg",
      }),
    ).resolves.toMatchObject({
      text: "kopi C",
      language: "sg",
      codeSwitch: ["kopi"],
      confidence: 1,
    });
    const sent = request.mock.calls[0]![0];
    expect(sent.url).toBe("https://asr.test/audio/transcriptions");
    expect(sent.headers).not.toHaveProperty("authorization");
    expect(new TextDecoder().decode(sent.body as Uint8Array)).toContain('filename="voice.ogg"');

    const failure = new HttpAsrAdapter("openai", "whisper", "https://asr.test", {
      request: async () => ({ status: 429, headers: {}, body: "rate limited" }),
    });
    await expect(
      failure.transcribe({ audio: new Uint8Array(), mimeType: "audio/ogg" }),
    ).rejects.toThrow("openai-asr-http-429");
    const invalid = new HttpAsrAdapter("openai", "whisper", "https://asr.test", {
      request: async () => ({ status: 200, headers: {}, body: JSON.stringify({ language: "en" }) }),
    });
    await expect(
      invalid.transcribe({ audio: new Uint8Array(), mimeType: "audio/ogg" }),
    ).rejects.toThrow("asr-invalid-response");
  });
});

describe("SEA-Guard response boundary", () => {
  const provider = (text: string): ModelProvider => ({
    name: "openai",
    complete: async (model) => ({
      provider: "openai",
      model,
      text,
      usage: { inputTokens: 1, outputTokens: 1 },
    }),
  });

  it("accepts safe output while filtering malformed optional fields", async () => {
    const guard = new SeaGuardClassifier(
      provider(JSON.stringify({ safe: true, categories: ["ok", 4] })),
    );
    await expect(guard.classify("hello", "household")).resolves.toEqual({
      safe: true,
      categories: ["ok"],
      reason: "classified",
    });
    await expect(guard.assertOutbound("hello")).resolves.toBeUndefined();
  });

  it("uses an explicit unspecified category and rejects malformed classifier output", async () => {
    const unsafe = new SeaGuardClassifier(provider(JSON.stringify({ safe: false })));
    await expect(unsafe.assertOutbound("unsafe")).rejects.toThrow("unsafe-outbound:unspecified");
    await expect(
      new SeaGuardClassifier(provider(JSON.stringify({ safe: "yes" }))).classify("x", "external"),
    ).rejects.toThrow("sea-guard-invalid-response");
  });
});
