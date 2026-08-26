import type { HouseholdDirectory } from "./directory.js";
import type { TrustedLocalQrSink } from "./local-qr.js";
import { ChannelSessionGuard, type SessionFailure } from "./session-guard.js";
import {
  REACTION_EMOJI,
  type AlertSink,
  type Channel,
  type InboundHandler,
  type MediaRef,
  type NormalisedInbound,
  type OutboundMessage,
  type Reaction,
  type SendReceipt,
} from "./types.js";

export interface WhatsAppRawMessage {
  id: string;
  senderJid: string;
  chatId: string;
  isGroup: boolean;
  fromMe?: boolean;
  text?: string;
  audio?: MediaRef;
  image?: MediaRef;
  document?: MediaRef;
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  quotedMessageId?: string;
  mentionedJids?: string[];
  receivedAt?: Date;
}

export interface WhatsAppConnectionEvent {
  state: "connecting" | "open" | "closed";
  reason?: SessionFailure;
  retryAfterMs?: number;
}

export interface WhatsAppTransport {
  connect(options: {
    authDirectory: string;
    onMessage: (message: WhatsAppRawMessage) => Promise<void>;
    onConnection: (event: WhatsAppConnectionEvent) => Promise<void>;
    onQr: (qr: string) => Promise<void>;
  }): Promise<void>;
  disconnect(): Promise<void>;
  send(chatId: string, message: OutboundMessage): Promise<{ messageId: string }>;
  react(chatId: string, messageId: string, emoji: string): Promise<void>;
  setTyping(chatId: string, active: boolean): Promise<void>;
  markRead?(chatId: string, messageId: string): Promise<void>;
  setPresence?(presence: "available" | "unavailable"): Promise<void>;
}

export interface OutboundGate {
  beforeSend(input: {
    chatId: string;
    household: boolean;
  }): Promise<{ allowed: boolean; delayMs?: number; reason?: string }>;
}

export interface WhatsAppOptions {
  transport: WhatsAppTransport;
  authDirectory: string;
  directory: HouseholdDirectory;
  onInbound: InboundHandler;
  alerts: AlertSink;
  qrSink?: TrustedLocalQrSink;
  assistantJid?: string;
  requireMentionInGroups?: boolean;
  outboundGate?: OutboundGate;
  sleep?: (milliseconds: number) => Promise<void>;
  schedule?: (callback: () => void, milliseconds: number) => unknown;
}

export class WhatsAppChannel implements Channel {
  readonly name = "whatsapp" as const;
  readonly #guard: ChannelSessionGuard;
  readonly #sleep: (milliseconds: number) => Promise<void>;
  readonly #schedule: (callback: () => void, milliseconds: number) => unknown;
  #stopped = true;

  constructor(private readonly options: WhatsAppOptions) {
    this.#guard = new ChannelSessionGuard("WhatsApp", options.alerts);
    this.#sleep =
      options.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.#schedule =
      options.schedule ?? ((callback, milliseconds) => setTimeout(callback, milliseconds));
  }

  session() {
    return this.#guard.snapshot();
  }

  async start(): Promise<void> {
    this.#stopped = false;
    await this.connectTransport();
  }

  private async connectTransport(): Promise<void> {
    this.#guard.connecting();
    await this.options.transport.connect({
      authDirectory: this.options.authDirectory,
      onMessage: async (message) => {
        await this.handle(message);
      },
      onConnection: async (event) => {
        if (event.state === "connecting") this.#guard.connecting();
        else if (event.state === "open") this.#guard.linked();
        else {
          const snapshot = await this.#guard.fail(event.reason ?? "network", event.retryAfterMs);
          if (snapshot.retryAt) {
            const delay = Math.max(0, snapshot.retryAt.getTime() - Date.now());
            this.#schedule(() => {
              if (this.#stopped) return;
              if (snapshot.lastFailure === "rate-limit") this.#guard.linked();
              else void this.connectTransport();
            }, delay);
          }
        }
      },
      onQr: async (qr) => {
        const published = await this.options.qrSink?.publish(qr);
        await this.options.alerts.alert("WhatsApp QR ready; open the local relink wizard", {
          channel: "whatsapp",
          command: "kaki wa relink",
          ...(published
            ? { localPath: published.localPath, expiresAt: published.expiresAt }
            : { reason: "trusted-local-qr-surface-unavailable" }),
        });
      },
    });
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    this.#guard.stop();
    await this.options.transport.disconnect();
  }

  async handle(raw: WhatsAppRawMessage): Promise<boolean> {
    if (raw.fromMe) return false;
    const identity = this.options.directory.resolve(raw.senderJid, raw.chatId);
    if (!identity.accepted) return false;
    if (
      raw.isGroup &&
      this.options.requireMentionInGroups === true &&
      this.options.assistantJid &&
      !raw.mentionedJids?.includes(this.options.assistantJid) &&
      raw.quotedMessageId === undefined
    )
      return false;

    const message: NormalisedInbound = {
      id: raw.id,
      channel: this.name,
      from: { jid: raw.senderJid, ...(identity.personId ? { personId: identity.personId } : {}) },
      chat: { id: raw.chatId, isGroup: raw.isGroup },
      ...(raw.text ? { text: raw.text } : {}),
      ...(raw.audio ? { audio: raw.audio } : {}),
      ...(raw.image ? { image: raw.image } : {}),
      ...(raw.document ? { doc: raw.document } : {}),
      ...(raw.location ? { location: raw.location } : {}),
      ...(raw.quotedMessageId ? { replyTo: raw.quotedMessageId } : {}),
      ...(raw.receivedAt ? { receivedAt: raw.receivedAt } : {}),
    };
    await this.options.onInbound(message);
    await this.options.transport.markRead?.(raw.chatId, raw.id);
    return true;
  }

  async send(chatId: string, message: OutboundMessage): Promise<SendReceipt> {
    if (this.#guard.snapshot().outboundPaused) throw new Error("whatsapp-outbound-paused");
    const identity = this.options.directory.resolve(chatId, chatId);
    const decision = await this.options.outboundGate?.beforeSend({
      chatId,
      household: Boolean(identity.householdId),
    });
    if (decision && !decision.allowed)
      throw new Error(`whatsapp-send-denied:${decision.reason ?? "policy"}`);
    if (decision?.delayMs) {
      await this.options.transport.setPresence?.("available");
      await this.options.transport.setTyping(chatId, true);
      await this.#sleep(decision.delayMs);
      await this.options.transport.setTyping(chatId, false);
    }
    const rendered = renderWhatsAppButtons(message);
    const receipt = await this.options.transport.send(chatId, rendered);
    return { messageId: receipt.messageId, sentAt: new Date() };
  }

  /** Use for new vendor threads so replies remain bound to the originating household. */
  async sendForHousehold(
    householdId: string,
    chatId: string,
    message: OutboundMessage,
  ): Promise<SendReceipt> {
    this.options.directory.markOutboundThread(chatId, householdId);
    return this.send(chatId, message);
  }

  async react(chatId: string, messageId: string, reaction: Reaction): Promise<void> {
    await this.options.transport.react(chatId, messageId, REACTION_EMOJI[reaction]);
  }
}

export function renderWhatsAppButtons(message: OutboundMessage): OutboundMessage {
  if (!message.buttons?.length) return message;
  const body = message.text ?? message.markdownLite ?? "Choose one:";
  const choices = message.buttons
    .map((button, index) => `${index + 1}. ${button.label}`)
    .join("\n");
  const { buttons: _buttons, markdownLite: _markdownLite, ...rest } = message;
  return { ...rest, text: `${body}\n\n${choices}\n\nReply with the number.` };
}
