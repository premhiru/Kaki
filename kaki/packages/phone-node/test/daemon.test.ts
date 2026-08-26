import { afterEach, expect, it, vi } from "vitest";
import {
  PhoneNodeDaemon,
  type PhoneGateway,
  type PhoneTaskRequest,
  type PhoneTransport,
} from "../src/daemon.js";

afterEach(() => vi.useRealTimers());

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
  let handler: ((request: PhoneTaskRequest) => Promise<unknown>) | undefined;
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
    authority: {
      acquire: async (request) => {
        if (request.claim.sessionId !== "session-1") throw new Error("unauthorized");
        return { assertCurrent: () => {}, release: vi.fn() };
      },
    },
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
  await expect(
    handler?.({
      taskId: "t1",
      goal: "read balance",
      claim: { householdId: "home", sessionId: "session-1", runId: "run-1", generation: 1 },
    }),
  ).resolves.toMatchObject({
    traceId: "t1",
    decision: { action: { type: "done" } },
  });
  await daemon.stop();
});

it("rejects Gateway registration without an authoritative session guard", async () => {
  const transport: PhoneTransport = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => "Ready",
    act: vi.fn(),
    backToHome: vi.fn(),
    screenOn: vi.fn(),
    health: async () => ({ connected: true, state: "device", checkedAt: new Date().toISOString() }),
    reconnect: async () => ({
      connected: true,
      state: "device",
      checkedAt: new Date().toISOString(),
    }),
  };
  const daemon = new PhoneNodeDaemon({
    nodeId: "android-1",
    transport,
    gateway: { register: vi.fn(), health: vi.fn() },
    planner: { decide: vi.fn() },
    traces: { append: vi.fn() },
  });
  await expect(daemon.start()).rejects.toThrow("phone-authority-required");
});

it("publishes disconnect, reconnect, and health events from the scheduled probe", async () => {
  vi.useFakeTimers();
  let checks = 0;
  const transport: PhoneTransport = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => "Ready",
    act: vi.fn(),
    backToHome: vi.fn(),
    screenOn: vi.fn(),
    health: async () => ({
      connected: checks++ === 0,
      state: checks === 1 ? "device" : "offline",
      checkedAt: "2026-08-26T00:00:00Z",
    }),
    reconnect: async () => ({
      connected: true,
      state: "device",
      checkedAt: "2026-08-26T00:00:01Z",
    }),
  };
  const gateway: PhoneGateway = {
    register: async () => async () => {},
    health: vi.fn(async () => {}),
  };
  const daemon = new PhoneNodeDaemon({
    nodeId: "phone-1",
    transport,
    gateway,
    authority: { acquire: vi.fn() },
    planner: { decide: vi.fn() },
    traces: { append: vi.fn() },
    healthIntervalMs: 10,
  });
  const disconnect = vi.fn();
  const reconnect = vi.fn();
  const health = vi.fn();
  daemon.on("disconnect", disconnect);
  daemon.on("reconnect", reconnect);
  daemon.on("health", health);
  await daemon.start();
  await daemon.start();
  await vi.advanceTimersByTimeAsync(10);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(reconnect).toHaveBeenCalledOnce();
  expect(health).toHaveBeenCalledWith(expect.objectContaining({ connected: true }));
  expect(gateway.health).toHaveBeenCalledWith(
    "phone-1",
    expect.objectContaining({ connected: true }),
  );
  await expect(daemon.health()).resolves.toMatchObject({ connected: false });
  await daemon.stop();
});

it("releases authority and emits no claim data when execution becomes stale", async () => {
  const release = vi.fn();
  let assertions = 0;
  const transport: PhoneTransport = {
    screenshot: async () => new Uint8Array([1]),
    dumpUi: async () => "Ready",
    act: vi.fn(),
    backToHome: vi.fn(),
    screenOn: vi.fn(),
    health: async () => ({ connected: true, state: "device", checkedAt: "now" }),
    reconnect: vi.fn(),
  };
  const daemon = new PhoneNodeDaemon({
    nodeId: "phone-1",
    transport,
    authority: {
      acquire: async () => ({
        assertCurrent() {
          assertions += 1;
          if (assertions >= 3) throw new Error("stale-phone-authority");
        },
        release,
      }),
    },
    planner: { decide: vi.fn() },
    traces: { append: vi.fn() },
  });
  const started = vi.fn();
  daemon.on("task:start", started);
  await expect(
    daemon.execute({
      taskId: "task-1",
      goal: "open app",
      claim: {
        householdId: "secret-household",
        sessionId: "secret-session",
        runId: "secret-run",
        generation: 4,
      },
    }),
  ).rejects.toThrow("stale-phone-authority");
  expect(release).toHaveBeenCalledOnce();
  expect(JSON.stringify(started.mock.calls)).not.toContain("secret-");
});

it("fails startup visibly when reconnect cannot restore the phone", async () => {
  const transport: PhoneTransport = {
    screenshot: vi.fn(),
    dumpUi: vi.fn(),
    act: vi.fn(),
    backToHome: vi.fn(),
    screenOn: vi.fn(),
    health: async () => ({ connected: false, state: "offline", checkedAt: "now" }),
    reconnect: async () => ({ connected: false, state: "missing", checkedAt: "now" }),
  };
  const daemon = new PhoneNodeDaemon({
    nodeId: "phone-1",
    transport,
    planner: { decide: vi.fn() },
    traces: { append: vi.fn() },
  });
  await expect(daemon.start()).rejects.toThrow("Phone unavailable: missing");
});
