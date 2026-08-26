import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  FileBrowserTraceSink,
  FileLayoutAnnotationSink,
  ManagedBrowserNode,
  OpenClawManagedBrowserAdapter,
  PlaywrightManagedBrowserAdapter,
  browserRunToSurfaceResult,
  type BrowserPage,
} from "../src/index.js";

function fakePage(): BrowserPage {
  return {
    goto: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    waitFor: vi.fn(async () => undefined),
    text: vi.fn(async () => "body"),
    screenshot: vi.fn(async () => new Uint8Array([1, 2])),
    extract: vi.fn(async () => "value"),
    url: vi.fn(async () => "https://example.sg/path"),
  };
}

describe("browser artifact boundaries", () => {
  it("rejects path traversal task ids before writing an artifact", () => {
    for (const taskId of ["../escape", "nested/task", "", ".hidden", "a".repeat(129)]) {
      expect(() => new FileBrowserTraceSink("C:/trace-root", taskId)).toThrow(
        "Invalid trace task id",
      );
    }
  });

  it("writes append-only JSONL traces and sequence-labelled screenshots", async () => {
    const root = await mkdtemp(join(tmpdir(), "kaki-browser-trace-"));
    try {
      const sink = new FileBrowserTraceSink(root, "task_1");
      const base = {
        step: { action: "goto", url: "https://example.sg" } as const,
        startedAt: "2026-08-26T00:00:00.000Z",
        finishedAt: "2026-08-26T00:00:01.000Z",
        attempt: 1,
      };
      await sink.append({ ...base, status: "ok" });
      await sink.append({ ...base, status: "failed", error: "blocked" }, new Uint8Array([7, 8]));

      const directory = join(root, "task_1");
      expect(
        (await readFile(join(directory, "trace.jsonl"), "utf8")).trim().split("\n"),
      ).toHaveLength(2);
      expect(await readdir(directory)).toEqual(["002-failed.png", "trace.jsonl"]);
      expect(await readFile(join(directory, "002-failed.png"))).toEqual(Buffer.from([7, 8]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("partitions layout learning by a sanitised host and falls back for invalid URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "kaki-browser-layout-"));
    try {
      const sink = new FileLayoutAnnotationSink(root);
      const base = {
        taskId: "task",
        action: "click" as const,
        failedSelector: "#old",
        workingSelector: "#new",
        resolution: "alternative" as const,
        observedAt: "2026-08-26T00:00:00.000Z",
      };
      await sink.append({ ...base, pageUrl: "https://portal.example.sg/path" });
      await sink.append({ ...base, pageUrl: "not a URL" });
      await sink.append(base);

      expect(await readdir(join(root, "browser-layout"))).toEqual([
        "portal.example.sg.jsonl",
        "unknown-host.jsonl",
      ]);
      expect(
        (await readFile(join(root, "browser-layout", "unknown-host.jsonl"), "utf8"))
          .trim()
          .split("\n"),
      ).toHaveLength(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("managed browser adapter boundaries", () => {
  it("rejects blank OpenClaw session ownership instead of leaking an uncloseable browser", async () => {
    const adapter = new OpenClawManagedBrowserAdapter({
      open: async () => ({ sessionId: "   ", page: fakePage() }),
      close: vi.fn(),
    });
    await expect(
      adapter.launchPersistent({
        userDataDir: "/profiles/home",
        locale: "en-SG",
        timezoneId: "Asia/Singapore",
        headless: true,
        acceptDownloads: true,
      }),
    ).rejects.toThrow("openclaw-browser-session-id-missing");
  });

  it("creates a page when a new persistent context has none and exposes the full page contract", async () => {
    const locator = {
      click: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      waitFor: vi.fn(async () => undefined),
      innerText: vi.fn(async () => "selected"),
    };
    const page = {
      goto: vi.fn(async () => undefined),
      locator: vi.fn(() => locator),
      textContent: vi.fn(async () => null),
      screenshot: vi.fn(async () => new Uint8Array([4])),
      url: vi.fn(() => "https://example.sg"),
    };
    const newPage = vi.fn(async () => page);
    const tracing = { start: vi.fn(async () => undefined) };
    const close = vi.fn(async () => undefined);
    const adapter = new PlaywrightManagedBrowserAdapter({
      launchPersistentContext: async () => ({ pages: () => [], newPage, tracing, close }),
    });
    const session = await adapter.launchPersistent({
      userDataDir: "/profiles/home",
      locale: "en-SG",
      timezoneId: "Asia/Singapore",
      headless: true,
      acceptDownloads: true,
    });

    await session.page.goto("https://example.sg");
    await session.page.click("#go");
    await session.page.fill("#name", "Kaki");
    await session.page.waitFor("#ready");
    await expect(session.page.text()).resolves.toBe("");
    await expect(session.page.extract("#answer")).resolves.toBe("selected");
    await expect(session.page.screenshot()).resolves.toEqual(new Uint8Array([4]));
    await expect(session.page.url?.()).resolves.toBe("https://example.sg");
    expect(newPage).toHaveBeenCalledOnce();
    expect(tracing.start).toHaveBeenCalledWith({
      screenshots: true,
      snapshots: true,
      sources: false,
    });
    await session.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps household profile paths inside the configured root and rejects unsafe ids", () => {
    const node = new ManagedBrowserNode(
      { launchPersistent: vi.fn() },
      { find: vi.fn() },
      { profileRoot: "./profiles" },
    );
    expect(node.profilePath("household_1")).toBe(join(resolve("./profiles"), "household_1"));
    for (const id of ["../escape", "house/home", ".hidden"]) {
      expect(() => node.profilePath(id)).toThrow("Invalid household id for browser profile");
    }
  });
});

describe("surface result conversion", () => {
  const step = {
    id: "step-1",
    surface: "browser" as const,
    action: "submit",
    input: { materialFacts: { payee: "Vendor", amount: 20 } },
    riskCategory: "money.purchase" as const,
    idempotencyKey: "idem-1",
    timeoutMs: 30_000,
    dryRun: false,
  };
  const context = {
    protocolVersion: "1",
    taskId: "task-1",
    traceId: "trace-1",
    householdId: "home",
    capabilityToken: "fixture-token",
    signal: new AbortController().signal,
  };

  it("returns verified done output when the browser completed without a handoff", async () => {
    await expect(
      browserRunToSurfaceResult({ data: { result: "ok" } }, step, context, undefined, true),
    ).resolves.toEqual({ status: "done", output: { result: "ok" }, verified: true });
  });

  it("persists handoff evidence and uses the handoff policy category when recognised", async () => {
    const evidence = {
      id: "evidence-1",
      kind: "screen" as const,
      label: "otp",
      redacted: true,
      createdAt: "2026-08-26T00:00:00.000Z",
      audience: { kind: "household" as const },
    };
    const persist = vi.fn(async () => evidence);
    const result = await browserRunToSurfaceResult(
      { data: {}, handoff: "otp", screenshot: new Uint8Array([1]) },
      step,
      context,
      { persist },
    );
    expect(persist).toHaveBeenCalledWith(context, "step-1", new Uint8Array([1]), "otp");
    expect(result).toMatchObject({
      status: "need_approval",
      materialFacts: { payee: "Vendor", amount: 20 },
      evidence: [evidence],
    });
  });

  it("falls back to the step risk and empty facts when handoff input is unknown or malformed", async () => {
    await expect(
      browserRunToSurfaceResult(
        { data: {}, handoff: "operator-review", screenshot: new Uint8Array([1]) },
        { ...step, input: { materialFacts: ["not", "an", "object"] } },
        context,
      ),
    ).resolves.toEqual({
      status: "need_approval",
      category: "money.purchase",
      materialFacts: {},
      evidence: [],
    });
  });
});
