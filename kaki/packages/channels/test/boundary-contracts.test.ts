import { describe, expect, it, vi } from "vitest";
import {
  ChannelSessionGuard,
  WebChatChannel,
  fromCoreOutbound,
  toCoreDeliveryReceipt,
  toCoreInbound,
  type WebChatFrame,
} from "../src/index.js";

const stored = (blobId: string, mimeType: string) => ({
  blobId,
  mimeType,
  sha256: `${blobId}-sha`,
});

describe("channel/core boundary", () => {
  it("persists every inbound attachment and preserves optional reply and location facts", async () => {
    const persist = vi.fn(async (media: { mimeType: string }) =>
      stored(media.mimeType, media.mimeType),
    );
    const message = await toCoreInbound(
      {
        id: "in-1",
        channel: "whatsapp",
        from: { jid: "mum@wa", personId: "mum" },
        chat: { id: "family@g.us", isGroup: true },
        text: "receipt attached",
        audio: { mimeType: "audio/ogg", data: new Uint8Array([1]) },
        image: { mimeType: "image/jpeg", data: new Uint8Array([2]) },
        doc: { mimeType: "application/pdf", data: new Uint8Array([3]) },
        location: {
          latitude: 1.3521,
          longitude: 103.8198,
          name: "Home",
          address: "Singapore",
        },
        replyTo: "prior-1",
      },
      { persist, materialise: vi.fn() },
    );

    expect(persist).toHaveBeenCalledTimes(3);
    expect(message).toMatchObject({
      text: "receipt attached",
      audio: { blobId: "audio/ogg" },
      image: { blobId: "image/jpeg" },
      doc: { blobId: "application/pdf" },
      location: { label: "Home", address: "Singapore" },
      replyTo: { id: "prior-1", channel: "whatsapp" },
    });
  });

  it("omits absent optional inbound fields instead of inventing empty values", async () => {
    const result = await toCoreInbound(
      {
        id: "in-2",
        channel: "telegram",
        from: { jid: "42" },
        chat: { id: "42", isGroup: false },
        location: { latitude: 1, longitude: 2 },
      },
      { persist: vi.fn(), materialise: vi.fn() },
    );

    expect(result).toEqual({
      id: "in-2",
      channel: "telegram",
      from: { jid: "42" },
      chat: { id: "42", isGroup: false },
      location: { latitude: 1, longitude: 2 },
    });
  });

  it("maps mixed core output into one transport message plus explicit reactions", async () => {
    const materialise = vi.fn(async (media: { blobId: string; mimeType: string }) => ({
      mimeType: media.mimeType,
      url: `blob://${media.blobId}`,
    }));
    const plan = await fromCoreOutbound(
      {
        idempotencyKey: "out-1",
        chatId: "family",
        replyTo: { id: "prior" },
        content: [
          { kind: "text", text: "First" },
          { kind: "text", text: "Second" },
          { kind: "markdown_lite", text: "*one*" },
          { kind: "markdown_lite", text: "*two*" },
          { kind: "image", media: stored("photo", "image/png") },
          { kind: "document", media: stored("file", "application/pdf") },
          {
            kind: "buttons",
            prompt: "Choose",
            fallback: "numbered_reply",
            buttons: [{ id: "yes", label: "Yes", style: "primary" }],
          },
          { kind: "reaction", targetMessageId: "m1", reaction: "need_user" },
          { kind: "reaction", targetMessageId: "m2", reaction: "done" },
        ],
      },
      { persist: vi.fn(), materialise },
    );

    expect(materialise).toHaveBeenCalledTimes(2);
    expect(plan).toEqual({
      chatId: "family",
      message: {
        text: "First\nSecond\nChoose",
        markdownLite: "*one*\n*two*",
        image: { mimeType: "image/png", url: "blob://photo" },
        doc: { mimeType: "application/pdf", url: "blob://file" },
        buttons: [{ id: "yes", label: "Yes" }],
        replyTo: "prior",
      },
      reactions: [
        { messageId: "m1", reaction: "need-user" },
        { messageId: "m2", reaction: "done" },
      ],
    });
  });

  it("returns no transport message for a reaction-only plan and normalises receipts", async () => {
    const plan = await fromCoreOutbound(
      {
        idempotencyKey: "out-2",
        chatId: "chat",
        content: [{ kind: "reaction", targetMessageId: "m1", reaction: "remove" }],
      },
      { persist: vi.fn(), materialise: vi.fn() },
    );
    const sentAt = new Date("2026-08-26T00:00:00.000Z");

    expect(plan).toEqual({
      chatId: "chat",
      reactions: [{ messageId: "m1", reaction: "remove" }],
    });
    expect(toCoreDeliveryReceipt("webchat", { messageId: "provider-1", sentAt })).toEqual({
      channel: "webchat",
      providerMessageId: "provider-1",
      acceptedAt: sentAt.toISOString(),
      deduplicated: false,
    });
  });
});

describe("webchat authentication boundary", () => {
  it("drops unauthenticated frames and preserves authenticated identity and reply context", async () => {
    const onInbound = vi.fn(async () => undefined);
    let receive: ((frame: WebChatFrame) => Promise<void>) | undefined;
    const send = vi.fn(async () => ({ messageId: "sent-1" }));
    const stop = vi.fn(async () => undefined);
    const channel = new WebChatChannel(
      {
        start: async (handler) => {
          receive = handler;
        },
        stop,
        send,
      },
      onInbound,
    );

    await channel.start();
    await receive?.({ id: "denied", sessionId: "s1", text: "no", authenticated: false });
    expect(onInbound).not.toHaveBeenCalled();
    await receive?.({
      id: "accepted",
      sessionId: "s1",
      personId: "person-1",
      text: "yes",
      replyTo: "prior",
      authenticated: true,
    });
    expect(onInbound).toHaveBeenCalledWith({
      id: "accepted",
      channel: "webchat",
      from: { jid: "s1", personId: "person-1" },
      chat: { id: "s1", isGroup: false },
      text: "yes",
      replyTo: "prior",
    });

    expect((await channel.send("s1", { text: "reply" })).messageId).toBe("sent-1");
    await channel.react("s1", "accepted", "need-user");
    expect(send).toHaveBeenLastCalledWith("s1", { messageId: "accepted", reaction: "❓" });
    await channel.stop();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("accepts an authenticated presence frame without fabricating optional content", async () => {
    const onInbound = vi.fn(async () => undefined);
    const channel = new WebChatChannel({ start: vi.fn(), stop: vi.fn(), send: vi.fn() }, onInbound);

    await expect(
      channel.handle({ id: "presence", sessionId: "s2", authenticated: true }),
    ).resolves.toBe(true);
    expect(onInbound).toHaveBeenCalledWith({
      id: "presence",
      channel: "webchat",
      from: { jid: "s2" },
      chat: { id: "s2", isGroup: false },
    });
  });
});

describe("channel session lifecycle", () => {
  it("resets a connected session and makes stop fail closed for outbound traffic", () => {
    const guard = new ChannelSessionGuard("whatsapp", { alert: vi.fn() });
    guard.connecting();
    expect(guard.snapshot().state).toBe("connecting");
    guard.linked();
    expect(guard.snapshot()).toEqual({
      state: "linked",
      outboundPaused: false,
      reconnectAttempt: 0,
    });
    guard.stop();
    expect(guard.snapshot()).toEqual({
      state: "stopped",
      outboundPaused: true,
      reconnectAttempt: 0,
    });
  });

  it("requires relinking after both logout and ban and records the operator command", async () => {
    const alert = vi.fn(async () => undefined);
    for (const reason of ["logout", "ban"] as const) {
      const guard = new ChannelSessionGuard("whatsapp", { alert });
      await expect(guard.fail(reason)).resolves.toMatchObject({
        state: "relink-required",
        outboundPaused: true,
        lastFailure: reason,
      });
    }
    expect(alert).toHaveBeenCalledTimes(2);
    expect(alert).toHaveBeenLastCalledWith(expect.stringContaining("relinking"), {
      channel: "whatsapp",
      reason: "ban",
      command: "kaki wa relink",
    });
  });

  it("uses explicit and default rate-limit windows and caps repeated network backoff", async () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    const alert = vi.fn(async () => undefined);
    const guard = new ChannelSessionGuard("telegram", { alert }, () => now);

    expect(await guard.fail("rate-limit", 5_000)).toMatchObject({
      state: "paused",
      retryAt: new Date("2026-08-26T00:00:05.000Z"),
    });
    expect(await guard.fail("rate-limit")).toMatchObject({
      retryAt: new Date("2026-08-26T00:01:00.000Z"),
    });
    expect(alert).toHaveBeenCalledTimes(2);

    let snapshot = guard.snapshot();
    for (let attempt = 1; attempt <= 9; attempt += 1) snapshot = await guard.fail("network");
    expect(snapshot).toMatchObject({
      state: "backing-off",
      outboundPaused: true,
      reconnectAttempt: 9,
      retryAt: new Date("2026-08-26T00:01:00.000Z"),
    });
  });
});
