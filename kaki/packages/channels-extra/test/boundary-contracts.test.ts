import { createHmac } from "node:crypto";
import { HouseholdDirectory } from "@kaki/channels";
import { describe, expect, it, vi } from "vitest";
import {
  LineChannel,
  MessengerChannel,
  hmacVerifier,
  type RegionalTransport,
  type SignedRegionalWebhook,
} from "../src/index.js";

function transport(overrides: Partial<RegionalTransport> = {}) {
  let receive: ((webhook: SignedRegionalWebhook) => Promise<void>) | undefined;
  const value: RegionalTransport & {
    emit(webhook: SignedRegionalWebhook): Promise<void>;
  } = {
    start: vi.fn(async (handler: (webhook: SignedRegionalWebhook) => Promise<void>) => {
      receive = handler;
    }),
    stop: vi.fn(async () => undefined),
    send: vi.fn(async () => ({ messageId: "sent-1" })),
    ...overrides,
    async emit(webhook) {
      if (!receive) throw new Error("transport-not-started");
      await receive(webhook);
    },
  };
  return value;
}

describe("regional webhook lifecycle", () => {
  it("does not bind a transport when the channel is disabled but still delegates stop", async () => {
    const fixture = transport();
    const channel = new LineChannel({
      enabled: false,
      transport: fixture,
      onInbound: vi.fn(),
      verifyWebhook: vi.fn(),
      directory: new HouseholdDirectory(),
    });
    await channel.start();
    expect(fixture.start).not.toHaveBeenCalled();
    await channel.stop();
    expect(fixture.stop).toHaveBeenCalledOnce();
  });

  it("normalises all attachment, location, reply, timestamp, identity, and group fields", () => {
    const channel = new MessengerChannel({
      enabled: true,
      transport: transport(),
      onInbound: vi.fn(),
      verifyWebhook: () => true,
      directory: new HouseholdDirectory(),
    });
    const receivedAt = Date.UTC(2026, 7, 26);
    expect(
      channel.normalise(
        {
          id: "m1",
          senderId: "sender",
          chatId: "family",
          isGroup: false,
          text: "hello",
          replyTo: "prior",
          timestamp: receivedAt,
          attachments: [
            { type: "image", url: "fixture://image" },
            { type: "audio", url: "fixture://audio", mimeType: "audio/mp4" },
            { type: "document", url: "fixture://doc", fileName: "bill.pdf" },
          ],
          location: { latitude: 1.3, longitude: 103.8, name: "Home" },
        },
        "person-1",
      ),
    ).toEqual({
      id: "m1",
      channel: "messenger",
      from: { jid: "sender", personId: "person-1" },
      chat: { id: "family", isGroup: false },
      text: "hello",
      image: { url: "fixture://image", mimeType: "image/jpeg" },
      audio: { url: "fixture://audio", mimeType: "audio/mp4" },
      doc: {
        url: "fixture://doc",
        mimeType: "application/octet-stream",
        fileName: "bill.pdf",
      },
      location: { latitude: 1.3, longitude: 103.8, name: "Home" },
      replyTo: "prior",
      receivedAt: new Date(receivedAt),
    });
  });

  it("derives group status without inventing absent optional webhook data", () => {
    const channel = new LineChannel({
      enabled: true,
      transport: transport(),
      onInbound: vi.fn(),
      verifyWebhook: () => true,
      directory: new HouseholdDirectory(),
    });
    expect(channel.normalise({ id: "direct", senderId: "u1", chatId: "u1" })).toEqual({
      id: "direct",
      channel: "line",
      from: { jid: "u1" },
      chat: { id: "u1", isGroup: false },
    });
    expect(channel.normalise({ id: "group", senderId: "u1", chatId: "room" }).chat.isGroup).toBe(
      true,
    );
  });

  it("uses native reaction transport when available and a reply fallback otherwise", async () => {
    const nativeReact = vi.fn(async () => undefined);
    const native = transport({ react: nativeReact });
    const nativeChannel = new LineChannel({
      enabled: true,
      transport: native,
      onInbound: vi.fn(),
      verifyWebhook: () => true,
      directory: new HouseholdDirectory(),
    });
    await nativeChannel.react("room", "m1", "working");
    expect(nativeReact).toHaveBeenCalledWith("room", "m1", "⏳");
    expect(native.send).not.toHaveBeenCalled();

    const fallback = transport();
    const fallbackChannel = new LineChannel({
      enabled: true,
      transport: fallback,
      onInbound: vi.fn(),
      verifyWebhook: () => true,
      directory: new HouseholdDirectory(),
    });
    await fallbackChannel.react("room", "m2", "done");
    expect(fallback.send).toHaveBeenCalledWith("room", { text: "✅", replyTo: "m2" });
  });
});

describe("regional webhook signature boundary", () => {
  it("validates Meta-compatible prefixed hex signatures and rejects tampering", () => {
    const body = '{"event":"message"}';
    const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    const verify = hmacVerifier("secret", "hex-prefixed");
    expect(verify(signature, body)).toBe(true);
    expect(verify(signature, `${body} `)).toBe(false);
  });

  it("rejects configuration without a signing secret", () => {
    expect(() => hmacVerifier("")).toThrow("webhook-secret-required");
  });
});
