import type {
  DeliveryReceipt as CoreDeliveryReceipt,
  InboundMessage,
  MediaRef as CoreMediaRef,
  OutboundContent,
  OutboundMessage as CoreOutboundMessage,
} from "@kaki/core";
import type { MediaRef, NormalisedInbound, OutboundMessage, SendReceipt } from "./types.js";

export interface ChannelBlobStore {
  persist(media: MediaRef): Promise<CoreMediaRef>;
  materialise(media: CoreMediaRef): Promise<MediaRef>;
}

export async function toCoreInbound(
  message: NormalisedInbound,
  blobs: ChannelBlobStore,
): Promise<InboundMessage> {
  const [audio, image, document] = await Promise.all([
    message.audio ? blobs.persist(message.audio) : undefined,
    message.image ? blobs.persist(message.image) : undefined,
    message.doc ? blobs.persist(message.doc) : undefined,
  ]);
  return {
    id: message.id,
    channel: message.channel,
    from: message.from,
    chat: message.chat,
    ...(message.text ? { text: message.text } : {}),
    ...(audio ? { audio } : {}),
    ...(image ? { image } : {}),
    ...(document ? { doc: { ...document } } : {}),
    ...(message.location
      ? {
          location: {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            ...(message.location.name ? { label: message.location.name } : {}),
            ...(message.location.address ? { address: message.location.address } : {}),
          },
        }
      : {}),
    ...(message.replyTo ? { replyTo: { id: message.replyTo, channel: message.channel } } : {}),
  };
}

export interface ChannelOutboundPlan {
  readonly chatId: string;
  readonly message?: OutboundMessage;
  readonly reactions: readonly {
    readonly messageId: string;
    readonly reaction: "working" | "done" | "need-user" | "remove";
  }[];
}
export async function fromCoreOutbound(
  message: CoreOutboundMessage,
  blobs: ChannelBlobStore,
): Promise<ChannelOutboundPlan> {
  const legacy: OutboundMessage = {};
  const reactions: { messageId: string; reaction: "working" | "done" | "need-user" | "remove" }[] =
    [];
  for (const content of message.content) await applyContent(content, legacy, reactions, blobs);
  if (message.replyTo) legacy.replyTo = message.replyTo.id;
  return {
    chatId: message.chatId,
    ...(Object.keys(legacy).length ? { message: legacy } : {}),
    reactions,
  };
}
async function applyContent(
  content: OutboundContent,
  message: OutboundMessage,
  reactions: { messageId: string; reaction: "working" | "done" | "need-user" | "remove" }[],
  blobs: ChannelBlobStore,
): Promise<void> {
  switch (content.kind) {
    case "text":
      message.text = message.text ? `${message.text}\n${content.text}` : content.text;
      return;
    case "markdown_lite":
      message.markdownLite = message.markdownLite
        ? `${message.markdownLite}\n${content.text}`
        : content.text;
      return;
    case "image":
      message.image = await blobs.materialise(content.media);
      return;
    case "document":
      message.doc = await blobs.materialise(content.media);
      return;
    case "buttons":
      message.text = message.text ? `${message.text}\n${content.prompt}` : content.prompt;
      message.buttons = content.buttons.map(({ id, label }) => ({ id, label }));
      return;
    case "reaction":
      reactions.push({
        messageId: content.targetMessageId,
        reaction: content.reaction === "need_user" ? "need-user" : content.reaction,
      });
  }
}
export function toCoreDeliveryReceipt(
  channel: CoreDeliveryReceipt["channel"],
  receipt: SendReceipt,
): CoreDeliveryReceipt {
  return {
    channel,
    providerMessageId: receipt.messageId,
    acceptedAt: receipt.sentAt.toISOString(),
    deduplicated: false,
  };
}
