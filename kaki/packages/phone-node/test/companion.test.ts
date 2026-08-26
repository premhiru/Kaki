import { expect, it, vi } from "vitest";
import { CompanionTransport } from "../src/companion-transport.js";

it("calls the authenticated loopback companion contract for a11y gestures and notifications", async () => {
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === "screenshot") return Buffer.from("png").toString("base64");
    if (method === "dump_ui") return '<node text="Grab" />';
    if (method === "health" || method === "reconnect") return { connected: true, state: "device" };
    if (method === "notifications") return [{ app: "Grab", text: "Driver arriving" }];
    return null;
  });
  const transport = new CompanionTransport("ws://127.0.0.1:18791", "pair-secret", {
    request,
    close: vi.fn(),
  });
  await expect(transport.screenshot()).resolves.toEqual(Buffer.from("png"));
  await expect(transport.dumpUi()).resolves.toContain("Grab");
  await transport.act({ type: "tap", target: "Book ride" });
  await expect(transport.notifications()).resolves.toEqual([
    { app: "Grab", text: "Driver arriving" },
  ]);
  expect(request).toHaveBeenCalledWith({
    method: "tap",
    params: { target: "Book ride" },
    authorization: "pair-secret",
  });
  expect(
    () =>
      new CompanionTransport("ws://192.168.1.20:18791", "pair-secret", {
        request,
        close: vi.fn(),
      }),
  ).toThrow("loopback");
  expect(
    () =>
      new CompanionTransport("ws://localhost:18791", " ", {
        request,
        close: vi.fn(),
      }),
  ).toThrow("authorization");
});

it("covers the complete authenticated companion lifecycle and terminal no-ops", async () => {
  const close = vi.fn(async () => {});
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === "dump_ui") return null;
    if (method === "health")
      return {
        connected: true,
        state: "device",
        checkedAt: "2026-08-26T00:00:00Z",
        serial: "phone-1",
        batteryPercent: 88,
      };
    if (method === "reconnect") return { connected: false, state: "offline" };
    return null;
  });
  const transport = new CompanionTransport("ws://[::1]:18791", "secret", {
    request,
    close,
  });
  await expect(transport.dumpUi()).resolves.toBeUndefined();
  await transport.act({ type: "type", target: "field", value: "hello" });
  const beforeTerminal = request.mock.calls.length;
  await transport.act({ type: "done", target: "complete" });
  expect(request).toHaveBeenCalledTimes(beforeTerminal);
  await transport.backToHome();
  await transport.screenOn();
  await expect(transport.health()).resolves.toMatchObject({
    connected: true,
    serial: "phone-1",
    batteryPercent: 88,
  });
  await expect(transport.reconnect()).resolves.toMatchObject({
    connected: false,
    state: "offline",
  });
  await transport.close();
  expect(close).toHaveBeenCalledOnce();
  expect(request).toHaveBeenCalledWith({
    method: "type",
    params: { target: "field", value: "hello" },
    authorization: "secret",
  });
});

it("rejects malformed companion payloads at the transport boundary", async () => {
  const responses = new Map<string, unknown>([
    ["screenshot", 7],
    ["dump_ui", 7],
    ["health", { connected: "yes", state: "device" }],
  ]);
  const transport = new CompanionTransport("ws://localhost:18791", "secret", {
    request: async ({ method }) => responses.get(method),
    close: async () => {},
  });
  await expect(transport.screenshot()).rejects.toThrow("screenshot-invalid");
  await expect(transport.dumpUi()).rejects.toThrow("a11y-tree-invalid");
  await expect(transport.health()).rejects.toThrow("health-invalid");
});
