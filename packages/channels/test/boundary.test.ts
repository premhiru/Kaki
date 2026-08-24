import { describe, expect, it } from "vitest";
import {
  fromCoreOutbound,
  toCoreDeliveryReceipt,
  toCoreInbound,
  type ChannelBlobStore,
} from "../src/index.js";

const blobs: ChannelBlobStore = {
  async persist(media) {
    return {
      blobId: "blob-1",
      mimeType: media.mimeType,
      sha256: "abc",
      ...(media.fileName ? { fileName: media.fileName } : {}),
    };
  },
  async materialise(media) {
    return {
      url: `blob://${media.blobId}`,
      mimeType: media.mimeType,
      ...(media.fileName ? { fileName: media.fileName } : {}),
    };
  },
};

describe("canonical channel boundary", () => {
  it("persists inline provider media before creating a core inbound message", async () => {
    const message = await toCoreInbound(
      {
        id: "m1",
        channel: "whatsapp",
        from: { jid: "mum@wa", personId: "mum" },
        chat: { id: "family", isGroup: true },
        audio: { data: new Uint8Array([1]), mimeType: "audio/ogg" },
        replyTo: "m0",
      },
      blobs,
    );
    expect(message).toMatchObject({
      audio: { blobId: "blob-1", sha256: "abc" },
      replyTo: { id: "m0", channel: "whatsapp" },
    });
    expect(message.audio).not.toHaveProperty("data");
  });
  it("materialises core content only inside the channel adapter", async () => {
    const plan = await fromCoreOutbound(
      {
        idempotencyKey: "delivery-1",
        chatId: "family",
        content: [
          { kind: "text", text: "Done" },
          {
            kind: "buttons",
            prompt: "Confirm?",
            buttons: [{ id: "yes", label: "Yes" }],
            fallback: "numbered_reply",
          },
          { kind: "reaction", targetMessageId: "m1", reaction: "done" },
        ],
      },
      blobs,
    );
    expect(plan.message).toMatchObject({
      text: "Done\nConfirm?",
      buttons: [{ id: "yes", label: "Yes" }],
    });
    expect(plan.reactions).toEqual([{ messageId: "m1", reaction: "done" }]);
    expect(
      toCoreDeliveryReceipt("whatsapp", {
        messageId: "provider-1",
        sentAt: new Date("2026-08-24T00:00:00Z"),
      }),
    ).toMatchObject({ providerMessageId: "provider-1", acceptedAt: "2026-08-24T00:00:00.000Z" });
  });
});
