import {
  REACTION_EMOJI,
  type Channel,
  type InboundHandler,
  type MediaRef,
  type NormalisedInbound,
  type OutboundMessage,
  type Reaction,
  type SendReceipt,
} from "./types.js";

export const TELEGRAM_COMMANDS = new Set([
  "status",
  "approve",
  "deny",
  "relink-wa",
  "journey",
  "household",
  "phone",
  "skills",
  "cron",
  "locale",
  "pause",
  "resume",
  "cost",
]);

export interface TelegramUpdate {
  updateId: number;
  message?: {
    id: number;
    chatId: string;
    fromId: string;
    isGroup: boolean;
    text?: string;
    voice?: MediaRef;
    photo?: MediaRef;
    document?: MediaRef;
    replyToMessageId?: number;
    date?: Date;
  };
  callbackQuery?: { id: string; fromId: string; chatId: string; messageId: number; data: string };
}

export interface TelegramTransport {
  start(onUpdate: (update: TelegramUpdate) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(chatId: string, message: OutboundMessage): Promise<{ messageId: string }>;
  react(chatId: string, messageId: string, emoji: string): Promise<void>;
  answerCallback(callbackId: string): Promise<void>;
}

export class TelegramChannel implements Channel {
  readonly name = "telegram" as const;

  constructor(
    private readonly transport: TelegramTransport,
    private readonly onInbound: InboundHandler,
    private readonly allowedUserIds: ReadonlySet<string>,
  ) {}

  async start(): Promise<void> {
    await this.transport.start(async (update) => {
      await this.handle(update);
    });
  }

  async stop(): Promise<void> {
    await this.transport.stop();
  }

  async handle(update: TelegramUpdate): Promise<boolean> {
    if (update.callbackQuery) {
      const callback = update.callbackQuery;
      if (!this.allowedUserIds.has(callback.fromId)) return false;
      await this.onInbound({
        id: `callback:${callback.id}`,
        channel: this.name,
        from: { jid: callback.fromId },
        chat: { id: callback.chatId, isGroup: false },
        text: callback.data,
        replyTo: String(callback.messageId),
      });
      await this.transport.answerCallback(callback.id);
      return true;
    }
    const raw = update.message;
    if (!raw || !this.allowedUserIds.has(raw.fromId)) return false;
    if (raw.text?.startsWith("/")) {
      const command = raw.text.slice(1).split(/[\s@]/u, 1)[0];
      if (!command || !TELEGRAM_COMMANDS.has(command)) return false;
    }
    const message: NormalisedInbound = {
      id: String(raw.id),
      channel: this.name,
      from: { jid: raw.fromId },
      chat: { id: raw.chatId, isGroup: raw.isGroup },
      ...(raw.text ? { text: raw.text } : {}),
      ...(raw.voice ? { audio: raw.voice } : {}),
      ...(raw.photo ? { image: raw.photo } : {}),
      ...(raw.document ? { doc: raw.document } : {}),
      ...(raw.replyToMessageId ? { replyTo: String(raw.replyToMessageId) } : {}),
      ...(raw.date ? { receivedAt: raw.date } : {}),
    };
    await this.onInbound(message);
    return true;
  }

  async send(chatId: string, message: OutboundMessage): Promise<SendReceipt> {
    const receipt = await this.transport.send(chatId, message);
    return { messageId: receipt.messageId, sentAt: new Date() };
  }

  async react(chatId: string, messageId: string, reaction: Reaction): Promise<void> {
    await this.transport.react(chatId, messageId, REACTION_EMOJI[reaction]);
  }
}
