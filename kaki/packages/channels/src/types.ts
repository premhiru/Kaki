export type ChannelName =
  | "whatsapp"
  | "telegram"
  | "webchat"
  | "line"
  | "zalo"
  | "viber"
  | "messenger"
  | "wechat";

export interface MediaRef {
  url?: string;
  data?: Uint8Array;
  mimeType: string;
  fileName?: string;
  durationSeconds?: number;
}

export interface LocationRef {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface NormalisedInbound {
  id: string;
  channel: ChannelName;
  from: { jid: string; personId?: string };
  chat: { id: string; isGroup: boolean };
  text?: string;
  audio?: MediaRef;
  image?: MediaRef;
  doc?: MediaRef;
  location?: LocationRef;
  replyTo?: string;
  receivedAt?: Date;
}

export type Reaction = "working" | "done" | "need-user";
export const REACTION_EMOJI: Readonly<Record<Reaction, string>> = {
  working: "⏳",
  done: "✅",
  "need-user": "❓",
};

export interface OutboundMessage {
  text?: string;
  markdownLite?: string;
  audio?: MediaRef;
  image?: MediaRef;
  doc?: MediaRef;
  buttons?: Array<{ id: string; label: string }>;
  replyTo?: string;
}

export interface SendReceipt {
  messageId: string;
  sentAt: Date;
}

export interface Channel {
  readonly name: ChannelName;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(chatId: string, message: OutboundMessage): Promise<SendReceipt>;
  react(chatId: string, messageId: string, reaction: Reaction): Promise<void>;
}

export type InboundHandler = (message: NormalisedInbound) => Promise<void>;

export interface AlertSink {
  alert(message: string, details?: Record<string, unknown>): Promise<void>;
}
