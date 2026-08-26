import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKakiHttpHandlers } from "./http.js";
import { createTestOwners } from "./test-support.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function start(owners = createTestOwners()) {
  const handlers = createKakiHttpHandlers({
    resolveOwners: () => owners,
    operatorPersonId: "person-1",
  });
  const server = createServer((req, res) => {
    if (req.url === "/api/kaki/snapshot") void handlers.snapshot(req, res);
    else if (req.url === "/api/kaki/action") void handlers.action(req, res);
    else {
      res.statusCode = 404;
      res.end();
    }
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function declaredOversizeStatus(url: string): Promise<number | undefined> {
  return await new Promise((resolve, reject) => {
    const req = request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "100001",
        "x-kaki-intent": "operator-action",
      },
    });
    req.once("response", (response) => {
      resolve(response.statusCode);
      response.resume();
    });
    req.once("error", reject);
    req.end();
  });
}

describe("Kaki authenticated HTTP handlers", () => {
  it("delegates an action and returns the fresh projected snapshot in one response", async () => {
    const decide = vi.fn(async () => ({ ok: true, message: "Denied." }));
    const owners = createTestOwners({
      approvals: { list: async () => [], decide },
    });
    const base = await start(owners);
    const response = await fetch(`${base}/api/kaki/action`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kaki-intent": "operator-action",
      },
      body: JSON.stringify({
        type: "approval.decide",
        id: "approval-1",
        decision: "denied",
        factsHash: "a".repeat(64),
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(decide).toHaveBeenCalledWith(
      {
        id: "approval-1",
        decision: "denied",
        actorPersonId: "person-1",
        factsHash: "a".repeat(64),
      },
      expect.any(AbortSignal),
    );
    expect(body).toMatchObject({
      ok: true,
      message: "Denied.",
      snapshot: { householdName: "Tan household" },
    });
  });

  it("projects only allowlisted fields and never exposes owner secrets or raw QR values", async () => {
    const base = await start();
    const response = await fetch(`${base}/api/kaki/snapshot`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain("must-not-project");
    expect(body).not.toMatch(/rawQr|password|\"qr\"|\"secret\"/);
    expect(JSON.parse(body)).toMatchObject({
      phone: { frameUrl: "/api/kaki/phone/frame" },
    });
  });

  it("enforces method, content type, intent, closed schemas, and body size before delegation", async () => {
    const pause = vi.fn(async () => ({ ok: true, message: "Paused." }));
    const base = await start(
      createTestOwners({
        system: {
          snapshot: async () => ({
            householdName: "Tan household",
            operatorName: "Mei",
            paused: false,
            health: { state: "steady", checkedAt: "now" },
          }),
          setPaused: pause,
        },
      }),
    );
    expect((await fetch(`${base}/api/kaki/snapshot`, { method: "POST" })).status).toBe(405);
    expect((await fetch(`${base}/api/kaki/action`, { method: "POST", body: "{}" })).status).toBe(
      415,
    );
    expect(
      (
        await fetch(`${base}/api/kaki/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(`${base}/api/kaki/action`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-kaki-intent": "operator-action",
          },
          body: JSON.stringify({
            type: "system.pause",
            paused: true,
            extra: true,
          }),
        })
      ).status,
    ).toBe(400);
    expect(await declaredOversizeStatus(`${base}/api/kaki/action`)).toBe(413);
    expect(pause).not.toHaveBeenCalled();
  });

  it("fails visibly when no profile-matched runtime owner is installed", async () => {
    const handlers = createKakiHttpHandlers({
      resolveOwners: () => undefined,
      operatorPersonId: "person-1",
    });
    const server = createServer((req, res) => void handlers.snapshot(req, res));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/kaki/snapshot`);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Finish `kaki onboard`");
  });

  it("records the bounded owner failure reason without returning it to the browser", async () => {
    const warn = vi.fn();
    const baseOwners = createTestOwners();
    const owners = {
      ...baseOwners,
      locale: {
        ...baseOwners.locale,
        snapshot: async () => {
          throw new Error(`locale-assets-unavailable:${"x".repeat(1_000)}`);
        },
      },
    };
    const handlers = createKakiHttpHandlers({
      resolveOwners: () => owners,
      operatorPersonId: "person-1",
      warn,
    });
    const server = createServer((req, res) => void handlers.snapshot(req, res));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/kaki/snapshot`);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("locale-assets-unavailable");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toMatch(/^kaki: snapshot owner failed: locale-assets/u);
    expect(warn.mock.calls[0]?.[0]).toHaveLength(529);
  });
});
