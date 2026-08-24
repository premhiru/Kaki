import { createHmac, timingSafeEqual } from "node:crypto";
import {
  REACTION_EMOJI,
  type Channel,
  type ChannelName,
  type InboundHandler,
  type MediaRef,
  type NormalisedInbound,
  type OutboundMessage,
  type Reaction,
  type SendReceipt,
} from "@kaki/channels";

export type ExtraChannelName = Extract<
  ChannelName,
  "line" | "zalo" | "viber" | "messenger" | "wechat"
>;

export interface RawWebhook {
  id: string;
  senderId: string;
  chatId: string;
  isGroup?: boolean;
  text?: string;
  timestamp?: number;
  replyTo?: string;
  attachments?: Array<{
    type: "image" | "audio" | "document";
    url: string;
    mimeType?: string;
    fileName?: string;
  }>;
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface RegionalTransport {
  start(onWebhook: (webhook: RawWebhook) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(chatId: string, message: OutboundMessage): Promise<{ messageId: string }>;
  react?(chatId: string, messageId: string, emoji: string): Promise<void>;
}

export interface RegionalChannelOptions {
  transport: RegionalTransport;
  onInbound: InboundHandler;
  verifyWebhook: (signature: string, body: string) => boolean;
}

export abstract class RegionalWebhookChannel implements Channel {
  abstract readonly name: ExtraChannelName;
  constructor(protected readonly options: RegionalChannelOptions) {}

  verify(signature: string, body: string): boolean {
    return this.options.verifyWebhook(signature, body);
  }

  async start(): Promise<void> {
    await this.options.transport.start(async (webhook) =>
      this.options.onInbound(this.normalise(webhook)),
    );
  }

  async stop(): Promise<void> {
    await this.options.transport.stop();
  }

  normalise(webhook: RawWebhook): NormalisedInbound {
    const image = attachment(webhook, "image", "image/jpeg");
    const audio = attachment(webhook, "audio", "audio/ogg");
    const doc = attachment(webhook, "document", "application/octet-stream");
    return {
      id: webhook.id,
      channel: this.name,
      from: { jid: webhook.senderId },
      chat: { id: webhook.chatId, isGroup: webhook.isGroup ?? webhook.chatId !== webhook.senderId },
      ...(webhook.text ? { text: webhook.text } : {}),
      ...(image ? { image } : {}),
      ...(audio ? { audio } : {}),
      ...(doc ? { doc } : {}),
      ...(webhook.location ? { location: webhook.location } : {}),
      ...(webhook.replyTo ? { replyTo: webhook.replyTo } : {}),
      ...(webhook.timestamp ? { receivedAt: new Date(webhook.timestamp) } : {}),
    };
  }

  async send(chatId: string, message: OutboundMessage): Promise<SendReceipt> {
    const receipt = await this.options.transport.send(chatId, message);
    return { messageId: receipt.messageId, sentAt: new Date() };
  }

  async react(chatId: string, messageId: string, reaction: Reaction): Promise<void> {
    if (this.options.transport.react)
      await this.options.transport.react(chatId, messageId, REACTION_EMOJI[reaction]);
    else
      await this.options.transport.send(chatId, {
        text: REACTION_EMOJI[reaction],
        replyTo: messageId,
      });
  }
}

export class LineChannel extends RegionalWebhookChannel {
  readonly name = "line" as const;
}
export class ZaloChannel extends RegionalWebhookChannel {
  readonly name = "zalo" as const;
}
export class ViberChannel extends RegionalWebhookChannel {
  readonly name = "viber" as const;
}
export class MessengerChannel extends RegionalWebhookChannel {
  readonly name = "messenger" as const;
}
export class WeChatChannel extends RegionalWebhookChannel {
  readonly name = "wechat" as const;
}

export function createFixtureTransport(): RegionalTransport & {
  sent: Array<{ chatId: string; message: OutboundMessage }>;
} {
  const sent: Array<{ chatId: string; message: OutboundMessage }> = [];
  return {
    sent,
    async start() {},
    async stop() {},
    async send(chatId, message) {
      sent.push({ chatId, message });
      return { messageId: `fixture:${chatId}:${sent.length}` };
    },
  };
}

/** LINE-compatible HMAC-SHA256 verifier. Use hex-prefixed for Meta's sha256= signature. */
export function hmacVerifier(
  secret: string,
  encoding: "base64" | "hex-prefixed" = "base64",
): (signature: string, body: string) => boolean {
  if (!secret) throw new Error("webhook-secret-required");
  return (signature, body) => {
    const digest = createHmac("sha256", secret)
      .update(body)
      .digest(encoding === "base64" ? "base64" : "hex");
    const expected = encoding === "hex-prefixed" ? `sha256=${digest}` : digest;
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  };
}

function attachment(
  webhook: RawWebhook,
  type: "image" | "audio" | "document",
  fallbackMime: string,
): MediaRef | undefined {
  const found = webhook.attachments?.find((item) => item.type === type);
  if (!found) return undefined;
  return {
    url: found.url,
    mimeType: found.mimeType ?? fallbackMime,
    ...(found.fileName ? { fileName: found.fileName } : {}),
  };
}
