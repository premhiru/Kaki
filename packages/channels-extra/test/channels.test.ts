import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  LineChannel,
  MessengerChannel,
  ViberChannel,
  WeChatChannel,
  ZaloChannel,
  createFixtureTransport,
  hmacVerifier,
  type RegionalWebhookChannel,
} from "../src/index.js";

describe("regional fixture channels", () => {
  for (const ChannelType of [
    LineChannel,
    ZaloChannel,
    ViberChannel,
    MessengerChannel,
    WeChatChannel,
  ]) {
    it(`${ChannelType.name} normalises media and uses fixture transport`, async () => {
      const inbound = vi.fn();
      const transport = createFixtureTransport();
      const channel: RegionalWebhookChannel = new ChannelType({
        transport,
        onInbound: inbound,
        verifyWebhook: () => true,
      });
      const message = channel.normalise({
        id: "1",
        senderId: "user",
        chatId: "family",
        text: "hello",
        attachments: [{ type: "audio", url: "fixture://voice.ogg", mimeType: "audio/ogg" }],
      });
      expect(message.channel).toBe(channel.name);
      expect(message.audio?.mimeType).toBe("audio/ogg");
      expect((await channel.send("family", { text: "ok" })).messageId).toContain("fixture");
      expect(transport.sent).toHaveLength(1);
    });
  }
});

it("verifies provider signatures without ordinary string comparison", () => {
  const body = '{"fixture":true}';
  const signature = createHmac("sha256", "secret").update(body).digest("base64");
  expect(hmacVerifier("secret")(signature, body)).toBe(true);
  expect(hmacVerifier("secret")("bad", body)).toBe(false);
});
