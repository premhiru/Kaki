import type { MediaRef, NormalisedInbound } from "./types.js";

export interface AudioFetcher {
  fetch(media: MediaRef): Promise<Uint8Array>;
}

export interface AsrResult {
  text: string;
  language: string;
  codeSwitch: string[];
  confidence: number;
}

export interface VoiceAsr {
  transcribe(input: { audio: Uint8Array; mimeType: string; channel: string }): Promise<AsrResult>;
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
