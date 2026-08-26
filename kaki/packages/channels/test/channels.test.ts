import { describe, expect, it, vi } from "vitest";
import {
  ChannelSessionGuard,
  FallbackVoiceAsr,
  HouseholdDirectory,
  TelegramChannel,
  TrustedLocalQrSurface,
  VoiceNotePipeline,
  VoiceReplyPipeline,
  WebChatChannel,
  WhatsAppChannel,
  renderWhatsAppButtons,
  type OutboundMessage,
  type TelegramTransport,
  type TelegramUpdate,
  type WebChatFrame,
  type WebChatTransport,
  type WhatsAppConnectionEvent,
  type WhatsAppRawMessage,
  type WhatsAppTransport,
} from "../src/index.js";

describe("household identity boundary", () => {
  it("ignores unknown direct senders but accepts family groups and outbound vendor threads", () => {
    const directory = new HouseholdDirectory({
      people: [{ jid: "mum@wa", personId: "mum", householdId: "home" }],
      groups: [{ chatId: "family@g.us", householdId: "home" }],
      allowlistedJids: ["owner@wa"],
    });
    expect(directory.resolve("stranger@wa", "stranger@wa").accepted).toBe(false);
    expect(directory.resolve("mum@wa", "family@g.us")).toMatchObject({
      accepted: true,
      personId: "mum",
      householdId: "home",
    });
    directory.markOutboundThread("vendor@wa", "home");
    expect(directory.resolve("vendor@wa", "vendor@wa")).toMatchObject({
      reason: "outbound-thread",
      householdId: "home",
    });
  });
});

describe("WhatsApp", () => {
  it("keeps pairing QR material out of alerts and serves it only to authenticated loopback", async () => {
    const transport = new FakeWhatsAppTransport();
    const alert = vi.fn();
    const surface = new TrustedLocalQrSurface(
      (request) => request.sessionId === "trusted-session",
      60_000,
      () => "qr-ref",
    );
    const channel = new WhatsAppChannel({
      transport,
      authDirectory: "/fixture/.kaki/wa",
      directory: new HouseholdDirectory(),
      onInbound: vi.fn(),
      alerts: { alert },
      qrSink: surface,
    });
    await channel.start();
    await transport.emitQr("raw-secret-pairing-payload");

    const alertPayload = JSON.stringify(alert.mock.calls);
    expect(alertPayload).not.toContain("raw-secret-pairing-payload");
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("local relink wizard"),
      expect.objectContaining({ localPath: "/local/whatsapp/qr/qr-ref" }),
    );
    expect(() =>
      surface.read("qr-ref", { remoteAddress: "192.168.1.2", sessionId: "trusted-session" }),
    ).toThrow("access-denied");
    expect(() =>
      surface.read("qr-ref", { remoteAddress: "127.0.0.1", sessionId: "wrong-session" }),
    ).toThrow("access-denied");
    expect(surface.read("qr-ref", { remoteAddress: "::1", sessionId: "trusted-session" })).toBe(
      "raw-secret-pairing-payload",
    );
  });

  it("normalises an allowlisted group message and emulates approval buttons", async () => {
    const transport = new FakeWhatsAppTransport();
    const inbound = vi.fn();
    const channel = new WhatsAppChannel({
      transport,
      authDirectory: "/fixture/.kaki/wa",
      directory: new HouseholdDirectory({
        people: [{ jid: "mum@wa", personId: "mum", householdId: "home" }],
        groups: [{ chatId: "family@g.us", householdId: "home" }],
      }),
      onInbound: inbound,
      alerts: { alert: vi.fn() },
      assistantJid: "kaki@wa",
      requireMentionInGroups: true,
      outboundGate: { beforeSend: async () => ({ allowed: true, delayMs: 1 }) },
      sleep: async () => {},
    });
    await channel.start();
    await transport.emitMessage({
      id: "m1",
      senderJid: "mum@wa",
      chatId: "family@g.us",
      isGroup: true,
      text: "can book?",
      mentionedJids: ["kaki@wa"],
    });
    expect(inbound).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "whatsapp", from: { jid: "mum@wa", personId: "mum" } }),
    );
    await channel.send("family@g.us", {
      text: "Fare S$18",
      buttons: [{ id: "approve", label: "Approve" }],
    });
    expect(transport.sent[0]?.message.text).toContain("1. Approve");
    expect(transport.typing).toEqual([true, false]);
    await channel.react("family@g.us", "m1", "done");
    expect(transport.reactions[0]?.emoji).toBe("✅");
  });

  it("pauses and alerts on logout", async () => {
    const transport = new FakeWhatsAppTransport();
    const alert = vi.fn();
    const channel = new WhatsAppChannel({
      transport,
      authDirectory: "/fixture/.kaki/wa",
      directory: new HouseholdDirectory(),
      onInbound: vi.fn(),
      alerts: { alert },
    });
    await channel.start();
    await transport.emitConnection({ state: "closed", reason: "logout" });
    expect(channel.session()).toMatchObject({ state: "relink-required", outboundPaused: true });
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("relinking"),
      expect.objectContaining({ command: "kaki wa relink" }),
    );
    await expect(channel.send("family@g.us", { text: "unsafe" })).rejects.toThrow(
      "whatsapp-outbound-paused",
    );
  });

  it("automatically reconnects after a transient network failure", async () => {
    const transport = new FakeWhatsAppTransport();
    let reconnect: (() => void) | undefined;
    const channel = new WhatsAppChannel({
      transport,
      authDirectory: "/fixture/.kaki/wa",
      directory: new HouseholdDirectory(),
      onInbound: vi.fn(),
      alerts: { alert: vi.fn() },
      schedule: (callback) => {
        reconnect = callback;
      },
    });
    await channel.start();
    await transport.emitConnection({ state: "closed", reason: "network" });
    expect(channel.session().state).toBe("backing-off");
    reconnect?.();
    await vi.waitFor(() => expect(transport.connections).toBe(2));
    expect(channel.session().state).toBe("linked");
  });
});

it("transcribes OGG voice notes while retaining code-switch metadata", async () => {
  const pipeline = new VoiceNotePipeline(
    { fetch: async () => new Uint8Array([1, 2, 3]) },
    {
      transcribe: async () => ({
        text: "kopi-C siew dai peng",
        language: "en",
        codeSwitch: ["kopi", "siew dai", "peng"],
        confidence: 0.97,
      }),
    },
  );
  const result = await pipeline.process({
    id: "voice-1",
    channel: "whatsapp",
    from: { jid: "owner@wa" },
    chat: { id: "family@g.us", isGroup: true },
    audio: { url: "fixture://voice.ogg", mimeType: "audio/ogg; codecs=opus" },
  });
  expect(result?.message.text).toBe("kopi-C siew dai peng");
  expect(result?.codeSwitch).toContain("siew dai");
});

it("falls back from MERaLiON to Whisper and leaves outbound TTS off by default", async () => {
  const asr = new FallbackVoiceAsr(
    {
      provider: "self-hosted",
      model: "MERaLiON-2",
      transcribe: async () => {
        throw new Error("model-unavailable");
      },
    },
    {
      provider: "configured-fallback",
      model: "whisper-large-v3-turbo",
      transcribe: async () => ({
        text: "阿嬷 wants kopi kosong",
        language: "en-SG",
        codeSwitch: ["阿嬷", "kopi kosong"],
        confidence: 0.91,
      }),
    },
  );
  await expect(
    asr.transcribe({ audio: new Uint8Array([1]), mimeType: "audio/ogg", channel: "whatsapp" }),
  ).resolves.toMatchObject({
    model: "whisper-large-v3-turbo",
    codeSwitch: ["阿嬷", "kopi kosong"],
  });

  const synthesize = vi.fn();
  const tts = new VoiceReplyPipeline(
    { synthesize },
    { enabled: false, voices: { "zh-SG": "mandarin" }, defaultVoice: "singapore-english" },
  );
  await expect(tts.render("Done", "en-SG")).resolves.toBeUndefined();
  expect(synthesize).not.toHaveBeenCalled();
});

it("routes allowlisted Telegram commands and approval callbacks", async () => {
  const transport = new FakeTelegramTransport();
  const inbound = vi.fn();
  const channel = new TelegramChannel(transport, inbound, new Set(["owner"]));
  await channel.start();
  await transport.emit({
    updateId: 1,
    message: { id: 4, chatId: "control", fromId: "owner", isGroup: false, text: "/status" },
  });
  await transport.emit({
    updateId: 2,
    callbackQuery: {
      id: "cb1",
      fromId: "owner",
      chatId: "control",
      messageId: 5,
      data: "approve:card-1",
    },
  });
  expect(inbound).toHaveBeenCalledTimes(2);
  expect(transport.answered).toEqual(["cb1"]);
  expect(
    await channel.handle({
      updateId: 3,
      message: { id: 6, chatId: "control", fromId: "stranger", isGroup: false, text: "/status" },
    }),
  ).toBe(false);
});

it("rejects unauthenticated WebChat frames", async () => {
  const transport = new FakeWebChatTransport();
  const inbound = vi.fn();
  const channel = new WebChatChannel(transport, inbound);
  await channel.start();
  await transport.emit({ id: "1", sessionId: "s1", text: "hello", authenticated: false });
  await transport.emit({
    id: "2",
    sessionId: "s1",
    personId: "owner",
    text: "hello",
    authenticated: true,
  });
  expect(inbound).toHaveBeenCalledTimes(1);
});

it("session guard uses bounded exponential reconnect", async () => {
  const guard = new ChannelSessionGuard(
    "fixture",
    { alert: async () => {} },
    () => new Date("2026-08-24T00:00:00Z"),
  );
  expect((await guard.fail("network")).retryAt?.toISOString()).toBe("2026-08-24T00:00:01.000Z");
  expect((await guard.fail("network")).retryAt?.toISOString()).toBe("2026-08-24T00:00:02.000Z");
});

it("does not mutate buttonless WhatsApp messages", () => {
  const message: OutboundMessage = { text: "done" };
  expect(renderWhatsAppButtons(message)).toBe(message);
});

class FakeWhatsAppTransport implements WhatsAppTransport {
  connections = 0;
  sent: Array<{ chatId: string; message: OutboundMessage }> = [];
  reactions: Array<{ chatId: string; messageId: string; emoji: string }> = [];
  typing: boolean[] = [];
  private onMessage?: (message: WhatsAppRawMessage) => Promise<void>;
  private onConnection?: (event: WhatsAppConnectionEvent) => Promise<void>;
  private onQr?: (qr: string) => Promise<void>;
  async connect(options: Parameters<WhatsAppTransport["connect"]>[0]) {
    this.connections += 1;
    this.onMessage = options.onMessage;
    this.onConnection = options.onConnection;
    this.onQr = options.onQr;
    await options.onConnection({ state: "open" });
  }
  async disconnect() {}
  async send(chatId: string, message: OutboundMessage) {
    this.sent.push({ chatId, message });
    return { messageId: `wa-${this.sent.length}` };
  }
  async react(chatId: string, messageId: string, emoji: string) {
    this.reactions.push({ chatId, messageId, emoji });
  }
  async setTyping(_chatId: string, active: boolean) {
    this.typing.push(active);
  }
  async emitMessage(message: WhatsAppRawMessage) {
    await this.onMessage?.(message);
  }
  async emitConnection(event: WhatsAppConnectionEvent) {
    await this.onConnection?.(event);
  }
  async emitQr(qr: string) {
    await this.onQr?.(qr);
  }
}

class FakeTelegramTransport implements TelegramTransport {
  answered: string[] = [];
  private onUpdate?: (update: TelegramUpdate) => Promise<void>;
  async start(onUpdate: (update: TelegramUpdate) => Promise<void>) {
    this.onUpdate = onUpdate;
  }
  async stop() {}
  async send() {
    return { messageId: "tg-1" };
  }
  async react() {}
  async answerCallback(callbackId: string) {
    this.answered.push(callbackId);
  }
  async emit(update: TelegramUpdate) {
    await this.onUpdate?.(update);
  }
}

class FakeWebChatTransport implements WebChatTransport {
  private onFrame?: (frame: WebChatFrame) => Promise<void>;
  async start(onFrame: (frame: WebChatFrame) => Promise<void>) {
    this.onFrame = onFrame;
  }
  async stop() {}
  async send() {
    return { messageId: "web-1" };
  }
  async emit(frame: WebChatFrame) {
    await this.onFrame?.(frame);
  }
}
