import { expect, it, vi } from "vitest";
import { PhoneNodeDaemon, type PhoneGateway, type PhoneTransport } from "../src/daemon.js";

it("reconnects before registering and reports a terminal decision", async () => {
  let connected = false;
  const transport: PhoneTransport = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => "Ready",
    act: vi.fn(async () => undefined),
    backToHome: vi.fn(async () => undefined),
    screenOn: vi.fn(async () => undefined),
    health: async () => ({
      connected,
      state: connected ? "device" : "offline",
      checkedAt: new Date().toISOString(),
    }),
    reconnect: async () => {
      connected = true;
      return { connected: true, state: "device", checkedAt: new Date().toISOString() };
    },
  };
  let handler: ((request: { taskId: string; goal: string }) => Promise<unknown>) | undefined;
  const gateway: PhoneGateway = {
    register: async (_registration, execute) => {
      handler = execute;
      return async () => undefined;
    },
    health: async () => undefined,
  };
  const daemon = new PhoneNodeDaemon({
    nodeId: "android-1",
    transport,
    gateway,
    planner: {
      decide: async () => ({
        observation: "Task finished",
        progress: "Complete",
        action: { type: "done", target: "result" },
        confidence: 1,
      }),
    },
    traces: { append: vi.fn(async () => undefined) },
  });
  await daemon.start();
  expect(handler).toBeTypeOf("function");
  await expect(handler?.({ taskId: "t1", goal: "read balance" })).resolves.toMatchObject({
    traceId: "t1",
    decision: { action: { type: "done" } },
  });
  await daemon.stop();
});
