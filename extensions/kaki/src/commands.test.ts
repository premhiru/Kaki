import type { PluginCommandContext } from "openclaw/plugin-sdk/plugin-entry";
import { describe, expect, it, vi } from "vitest";
import { createKakiControlCommands } from "./commands.js";
import { createTestOwners } from "./test-support.js";

function context(args?: string, owner = true): PluginCommandContext {
  return {
    args,
    channel: "telegram",
    commandBody: "",
    config: {},
    isAuthorizedSender: true,
    senderIsOwner: owner,
    requestConversationBinding: async () => ({ ok: false, error: "unused" }) as never,
    detachConversationBinding: async () => ({ removed: false }),
    getCurrentConversationBinding: async () => null,
  };
}

describe("Kaki Telegram control commands", () => {
  it("renders every owner-backed command with bounded, visible output", async () => {
    const owners = createTestOwners();
    const commands = createKakiControlCommands(() => owners, "person-1");
    const invoke = async (name: string, input?: string) =>
      await commands.find((entry) => entry.name === name)!.handler(context(input));
    const hash = "a".repeat(64);
    await expect(invoke("deny", `approval-1 ${hash}`)).resolves.toEqual({ text: "Done." });
    await expect(invoke("relink-wa")).resolves.toEqual({ text: "Done." });
    await expect(invoke("journey")).resolves.toMatchObject({
      text: expect.stringContaining("School run"),
    });
    await expect(invoke("household")).resolves.toMatchObject({
      text: expect.stringContaining("Mei Tan"),
    });
    await expect(invoke("phone", "screenshot")).resolves.toEqual({ text: "Done." });
    await expect(invoke("phone", "tap pay now")).resolves.toEqual({ text: "Done." });
    await expect(invoke("phone", "launch app")).resolves.toEqual({
      text: "Usage: /phone screenshot | /phone tap <visible-target>",
    });
    await expect(invoke("skills")).resolves.toMatchObject({
      text: expect.stringContaining("sg.weather-commute"),
    });
    await expect(invoke("cron")).resolves.toMatchObject({
      text: expect.stringContaining("School rain"),
    });
    await expect(invoke("locale")).resolves.toMatchObject({
      text: expect.stringContaining("Kaki locale: sg"),
    });
    await expect(invoke("locale", "my")).resolves.toEqual({ text: "Done." });
    await expect(invoke("locale", "my sg")).resolves.toEqual({
      text: "Usage: /locale [sg|my|id|th|vn|ph|mm|kh]",
    });
    await expect(invoke("pause")).resolves.toEqual({ text: "Done." });
    await expect(invoke("resume")).resolves.toEqual({ text: "Done." });
    await expect(invoke("cost")).resolves.toMatchObject({
      text: expect.stringContaining("S$1 today"),
    });
  });

  it("bounds long lists and reports empty owner collections", async () => {
    const owners = createTestOwners({
      journeys: {
        list: async () =>
          Array.from({ length: 22 }, (_, index) => ({
            id: String(index),
            time: "now",
            title: `Trip ${index}`,
            detail: "ready",
          })),
        create: async () => ({ ok: true, message: "created" }),
        edit: async () => ({ ok: true, message: "edited" }),
        delete: async () => ({ ok: true, message: "deleted" }),
      },
      automation: { list: async () => [] },
    });
    const commands = createKakiControlCommands(() => owners, "person-1");
    await expect(
      commands.find((entry) => entry.name === "journey")!.handler(context()),
    ).resolves.toMatchObject({ text: expect.stringContaining("…and 2 more.") });
    await expect(
      commands.find((entry) => entry.name === "cron")!.handler(context()),
    ).resolves.toEqual({ text: "Kaki schedules\nNone configured." });
  });

  it("returns usage for incomplete approval identity and distinguishes stale approval CAS", async () => {
    const decide = vi.fn(async () => {
      throw new Error("approval-material-facts-changed");
    });
    const owners = createTestOwners({ approvals: { list: async () => [], decide } });
    const commandWithActor = createKakiControlCommands(() => owners, "person-1").find(
      (entry) => entry.name === "deny",
    )!;
    const commandWithoutActor = createKakiControlCommands(() => owners, undefined).find(
      (entry) => entry.name === "deny",
    )!;
    for (const input of [
      undefined,
      "approval-1",
      "approval-1 bad",
      `approval-1 ${"a".repeat(64)} extra`,
    ]) {
      await expect(commandWithActor.handler(context(input))).resolves.toEqual({
        text: "Usage: /deny <approval-id> <facts-hash>",
      });
    }
    await expect(
      commandWithoutActor.handler(context(`approval-1 ${"a".repeat(64)}`)),
    ).resolves.toEqual({ text: "Usage: /deny <approval-id> <facts-hash>" });
    await expect(
      commandWithActor.handler(context(`approval-1 ${"a".repeat(64)}`)),
    ).resolves.toEqual({
      text: "⚠️ Approval changed. Refresh the pending approvals before deciding.",
    });
  });

  it("delegates bounded phone targets through the phone owner", async () => {
    const phoneCommand = vi.fn(async () => ({ ok: true, message: "Tapped." }));
    const owners = createTestOwners({
      phone: {
        snapshot: async () => ({
          connected: true,
          name: "Phone",
          summary: "Ready",
        }),
        command: phoneCommand,
      },
    });
    const phone = createKakiControlCommands(() => owners, "person-1").find(
      (entry) => entry.name === "phone",
    )!;
    expect(await phone.handler(context("tap Pay now"))).toEqual({
      text: "Tapped.",
    });
    expect(phoneCommand).toHaveBeenCalledWith(
      { command: "tap-target", target: "Pay now" },
      expect.any(AbortSignal),
    );
  });

  it("blocks a non-owner before any household owner is called", async () => {
    const setPaused = vi.fn(async () => ({ ok: true, message: "Paused." }));
    const owners = createTestOwners({
      system: {
        snapshot: async () => ({
          householdName: "Household",
          operatorName: "Owner",
          paused: false,
          health: { state: "steady", checkedAt: "now" },
        }),
        setPaused,
      },
    });
    const pause = createKakiControlCommands(() => owners, "person-1").find(
      (entry) => entry.name === "pause",
    )!;
    expect(await pause.handler(context(undefined, false))).toEqual({
      text: "⚠️ Kaki household controls are limited to the authenticated household owner.",
    });
    expect(setPaused).not.toHaveBeenCalled();
  });

  it("returns a next step instead of silently failing when owners are unavailable", async () => {
    const cost = createKakiControlCommands(() => undefined, "person-1").find(
      (entry) => entry.name === "cost",
    )!;
    expect(await cost.handler(context())).toEqual({
      text: "⚠️ Kaki runtime owners are unavailable. Finish `kaki onboard`, then restart the Gateway.",
    });
  });
});
