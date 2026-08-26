import type { MediaRef, NormalisedInbound } from "./types.js";

export interface AudioFetcher {
  fetch(media: MediaRef): Promise<Uint8Array>;
}

export interface AsrResult {
  text: string;
  language: string;
  codeSwitch: string[];
  confidence: number;
  provider?: string;
  model?: string;
}

export interface VoiceAsr {
  transcribe(input: { audio: Uint8Array; mimeType: string; channel: string }): Promise<AsrResult>;
}

export interface NamedVoiceAsr extends VoiceAsr {
  readonly provider: string;
  readonly model: string;
}

/** MERaLiON-first routing with an explicit Whisper fallback and no silent transcript fabrication. */
export class FallbackVoiceAsr implements VoiceAsr {
  constructor(
    private readonly primary: NamedVoiceAsr,
    private readonly fallback: NamedVoiceAsr,
  ) {}

  async transcribe(input: {
    audio: Uint8Array;
    mimeType: string;
    channel: string;
  }): Promise<AsrResult> {
    try {
      return withOwner(await this.primary.transcribe(input), this.primary);
    } catch (primaryError) {
      try {
        return withOwner(await this.fallback.transcribe(input), this.fallback);
      } catch (fallbackError) {
        throw new AggregateError(
          [primaryError, fallbackError],
          `voice-asr-failed:${this.primary.provider}/${this.primary.model},${this.fallback.provider}/${this.fallback.model}`,
        );
      }
    }
  }
}

export interface VoiceTts {
  synthesize(input: { text: string; locale: string; voice: string }): Promise<MediaRef>;
}

export class VoiceReplyPipeline {
  constructor(
    private readonly tts: VoiceTts,
    private readonly options: {
      enabled: boolean;
      voices: Readonly<Record<string, string>>;
      defaultVoice: string;
    },
  ) {}

  async render(text: string, locale: string): Promise<MediaRef | undefined> {
    if (!this.options.enabled) return undefined;
    if (!text.trim()) throw new Error("empty-tts-text");
    return this.tts.synthesize({
      text,
      locale,
      voice: this.options.voices[locale] ?? this.options.defaultVoice,
    });
  }
}

export interface VoiceNoteResult extends AsrResult {
  message: NormalisedInbound;
}

export class VoiceNotePipeline {
  constructor(
    private readonly fetcher: AudioFetcher,
    private readonly asr: VoiceAsr,
  ) {}

  async process(message: NormalisedInbound): Promise<VoiceNoteResult | undefined> {
    if (!message.audio) return undefined;
    if (!isSupportedVoiceMime(message.audio.mimeType))
      throw new Error(`unsupported-voice-mime:${message.audio.mimeType}`);
    const audio = message.audio.data ?? (await this.fetcher.fetch(message.audio));
    if (audio.byteLength === 0) throw new Error("empty-voice-note");
    const transcript = await this.asr.transcribe({
      audio,
      mimeType: message.audio.mimeType,
      channel: message.channel,
    });
    return { ...transcript, message: { ...message, text: transcript.text } };
  }
}

export function isSupportedVoiceMime(mimeType: string): boolean {
  const normalised = mimeType.toLowerCase().split(";", 1)[0];
  return (
    normalised === "audio/ogg" ||
    normalised === "audio/opus" ||
    normalised === "audio/mpeg" ||
    normalised === "audio/mp4"
  );
}

function withOwner(result: AsrResult, owner: NamedVoiceAsr): AsrResult {
  if (!result.text.trim()) throw new Error(`empty-asr-transcript:${owner.provider}/${owner.model}`);
  return { ...result, provider: owner.provider, model: owner.model };
}
