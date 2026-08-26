export type LocaleCode = "sg" | "my" | "id" | "th" | "vn" | "ph" | "mm" | "kh";
export type Register =
  | "peer"
  | "elder"
  | "child"
  | "contractor"
  | "official"
  | "school"
  | "bank"
  | "employer";

export type LocaleModelPurpose =
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

export type ModelReference = `${string}/${string}`;

export interface LocaleChannelConfig {
  locale: LocaleCode;
  priority: string[];
  languages: string[];
  dataTools: string[];
  defaultModels: Partial<Record<LocaleModelPurpose, ModelReference[]>>;
  fixtureModeAvailable: boolean;
}

export interface LexiconEntry {
  term: string;
  normalised: string;
  category: string;
  languages: string[];
}

export interface LexiconFile {
  locale: LocaleCode;
  version: number;
  entries: LexiconEntry[];
}

export interface CalendarEvent {
  id: string;
  name: string;
  type: "public" | "school" | "religious" | "deadline" | "cultural";
  date?: string;
  rule?: string;
  advisory?: string;
}

export interface LocalePack {
  code: LocaleCode;
  persona: string;
  lexicon: LexiconFile;
  calendar: { locale: LocaleCode; timezone: string; events: CalendarEvent[] };
  formats: Record<string, unknown>;
  dietary: Record<string, unknown>;
  channels: LocaleChannelConfig;
}

export interface NormalisedLocaleMessage {
  intent: string;
  intentText: string;
  language: string;
  register: Register;
  codeSwitch: string[];
}
