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
  channels: Record<string, unknown>;
}

export interface NormalisedLocaleMessage {
  intent: string;
  intentText: string;
  language: string;
  register: Register;
  codeSwitch: string[];
}
