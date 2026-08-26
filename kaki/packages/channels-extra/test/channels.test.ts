import { createHmac } from "node:crypto";
import { HouseholdDirectory, type NormalisedInbound, type OutboundMessage } from "@kaki/channels";
import { describe, expect, it, vi } from "vitest";
import {
  LineChannel,
  MessengerChannel,
  ViberChannel,
  WeChatChannel,
  ZaloChannel,
  hmacVerifier,
  type RegionalWebhookChannel,
  type RegionalTransport,
  type SignedRegionalWebhook,
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
      const inbound = vi.fn(async (_message: NormalisedInbound) => undefined);
      const transport = new FixtureRegionalTransport();
      const channel: RegionalWebhookChannel = new ChannelType({
        enabled: true,
        transport,
        onInbound: inbound,
        verifyWebhook: () => true,
        directory: new HouseholdDirectory({
          people: [{ jid: "user", personId: "owner", householdId: "home" }],
          groups: [{ chatId: "family", householdId: "home" }],
        }),
      });
      await channel.start();
      await transport.emit({
        signature: "valid",
        body: "{}",
        webhook: {
          id: "1",
          senderId: "user",
          chatId: "family",
          text: "hello",
          attachments: [{ type: "audio", url: "fixture://voice.ogg", mimeType: "audio/ogg" }],
        },
      });
      const message = inbound.mock.calls[0]?.[0];
      expect(message).toMatchObject({
        channel: channel.name,
        from: { personId: "owner" },
        audio: { mimeType: "audio/ogg" },
      });
      expect((await channel.send("family", { text: "ok" })).messageId).toContain("fixture");
      expect(transport.sent).toHaveLength(1);
    });
  }
});

it("verifies the signed transport envelope before household ingress", async () => {
  const inbound = vi.fn();
  const ignored = vi.fn();
  const transport = new FixtureRegionalTransport();
  const channel = new MessengerChannel({
    enabled: true,
    transport,
    onInbound: inbound,
    verifyWebhook: (signature) => signature === "valid",
    directory: new HouseholdDirectory(),
    onIgnored: ignored,
  });
  await channel.start();
  await expect(
    transport.emit({
      signature: "invalid",
      body: "{}",
      webhook: { id: "bad", senderId: "attacker", chatId: "attacker", text: "hello" },
    }),
  ).rejects.toThrow("signature-invalid");
  await transport.emit({
    signature: "valid",
    body: "{}",
    webhook: { id: "unknown", senderId: "attacker", chatId: "attacker", text: "hello" },
  });
  expect(inbound).not.toHaveBeenCalled();
  expect(ignored).toHaveBeenCalledWith(expect.objectContaining({ reason: "unknown-sender" }));
});

it("verifies provider signatures without ordinary string comparison", () => {
  const body = '{"fixture":true}';
  const signature = createHmac("sha256", "secret").update(body).digest("base64");
  expect(hmacVerifier("secret")(signature, body)).toBe(true);
  expect(hmacVerifier("secret")("bad", body)).toBe(false);
});

class FixtureRegionalTransport implements RegionalTransport {
  readonly sent: Array<{ chatId: string; message: OutboundMessage }> = [];
  private onWebhook?: (webhook: SignedRegionalWebhook) => Promise<void>;

  async start(onWebhook: (webhook: SignedRegionalWebhook) => Promise<void>) {
    this.onWebhook = onWebhook;
  }
  async stop() {}
  async send(chatId: string, message: OutboundMessage) {
    this.sent.push({ chatId, message });
    return { messageId: `fixture:${chatId}:${this.sent.length}` };
  }
  async emit(webhook: SignedRegionalWebhook) {
    if (!this.onWebhook) throw new Error("transport-not-started");
    await this.onWebhook(webhook);
  }
}
