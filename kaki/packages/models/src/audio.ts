import type { HttpClient, ProviderName } from "./types.js";

export interface AsrInput {
  audio: Uint8Array;
  mimeType: string;
  fileName?: string;
  languageHint?: string;
}
export interface AsrTranscript {
  text: string;
  language: string;
  codeSwitch: string[];
  confidence: number;
  provider: "meralion" | "openai";
}
export interface SpeechToTextProvider {
  readonly name: "meralion" | "openai";
  transcribe(input: AsrInput): Promise<AsrTranscript>;
}
export class ResilientAsr {
  constructor(
    private readonly meralion: SpeechToTextProvider,
    private readonly whisper: SpeechToTextProvider,
  ) {}
  async transcribe(input: AsrInput): Promise<AsrTranscript> {
    try {
      const result = await this.meralion.transcribe(input);
      if (result.text.trim() && result.confidence >= 0.35) return result;
    } catch {
      // MERaLiON is preferred, but provider failures deliberately fall through to Whisper.
    }
    return this.whisper.transcribe(input);
  }
}

export interface TtsInput {
  text: string;
  language: string;
  voice?: string;
  format?: "mp3" | "opus";
}
export interface TtsOutput {
  audio: Uint8Array;
  mimeType: string;
  provider: ProviderName;
  voice: string;
}
export interface TextToSpeechProvider {
  readonly name: ProviderName;
  synthesize(input: TtsInput): Promise<TtsOutput>;
}
export class TtsService {
  constructor(
    private readonly provider: TextToSpeechProvider,
    private readonly enabled = false,
  ) {}
  async synthesize(input: TtsInput): Promise<TtsOutput> {
    if (!this.enabled) throw new Error("tts-disabled");
    return this.provider.synthesize(input);
  }
}

/** OpenAI-compatible transcription endpoint used for MERaLiON and Whisper deployments. */
export class HttpAsrAdapter implements SpeechToTextProvider {
  constructor(
    readonly name: "meralion" | "openai",
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly http: HttpClient,
    private readonly apiKey?: string,
  ) {}
  async transcribe(input: AsrInput): Promise<AsrTranscript> {
    const boundary = "----kaki-asr-boundary";
    const chunks = [
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${this.model}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.fileName ?? "voice.ogg"}"\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    ];
    const prefix = new TextEncoder().encode(chunks.join(""));
    const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(prefix.length + input.audio.length + suffix.length);
    body.set(prefix);
    body.set(input.audio, prefix.length);
    body.set(suffix, prefix.length + input.audio.length);
    const response = await this.http.request({
      url: `${this.baseUrl.replace(/\/$/u, "")}/audio/transcriptions`,
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body,
      timeoutMs: 120_000,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`${this.name}-asr-http-${response.status}`);
    const parsed = JSON.parse(
      typeof response.body === "string" ? response.body : new TextDecoder().decode(response.body),
    ) as Record<string, unknown>;
    if (typeof parsed.text !== "string") throw new Error("asr-invalid-response");
    return {
      text: parsed.text,
      language:
        typeof parsed.language === "string" ? parsed.language : (input.languageHint ?? "unknown"),
      codeSwitch: Array.isArray(parsed.code_switch)
        ? parsed.code_switch.filter((item): item is string => typeof item === "string")
        : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 1,
      provider: this.name,
    };
  }
}
