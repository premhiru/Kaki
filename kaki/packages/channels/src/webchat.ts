import {
  REACTION_EMOJI,
  type Channel,
  type InboundHandler,
  type NormalisedInbound,
  type OutboundMessage,
  type Reaction,
  type SendReceipt,
} from "./types.js";

export interface WebChatFrame {
  id: string;
  sessionId: string;
  personId?: string;
  text?: string;
  replyTo?: string;
  authenticated: boolean;
}

export interface WebChatTransport {
  start(onFrame: (frame: WebChatFrame) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(
    sessionId: string,
    payload: OutboundMessage | { reaction: string; messageId: string },
  ): Promise<{ messageId: string }>;
}

export class WebChatChannel implements Channel {
  readonly name = "webchat" as const;
  constructor(
    private readonly transport: WebChatTransport,
    private readonly onInbound: InboundHandler,
  ) {}

  async start(): Promise<void> {
    await this.transport.start(async (frame) => {
      await this.handle(frame);
    });
  }

  async stop(): Promise<void> {
    await this.transport.stop();
  }

  async handle(frame: WebChatFrame): Promise<boolean> {
    if (!frame.authenticated) return false;
    const message: NormalisedInbound = {
      id: frame.id,
      channel: this.name,
      from: { jid: frame.sessionId, ...(frame.personId ? { personId: frame.personId } : {}) },
      chat: { id: frame.sessionId, isGroup: false },
      ...(frame.text ? { text: frame.text } : {}),
      ...(frame.replyTo ? { replyTo: frame.replyTo } : {}),
    };
    await this.onInbound(message);
    return true;
  }

  async send(chatId: string, message: OutboundMessage): Promise<SendReceipt> {
    const receipt = await this.transport.send(chatId, message);
    return { messageId: receipt.messageId, sentAt: new Date() };
  }

  async react(chatId: string, messageId: string, reaction: Reaction): Promise<void> {
    await this.transport.send(chatId, { messageId, reaction: REACTION_EMOJI[reaction] });
  }
}
