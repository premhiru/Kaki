import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { applyKakiCompatResult, runKakiCompatLauncher } from "./kaki.js";

it("forwards version arguments to the canonical repository launcher", async () => {
  await expect(runKakiCompatLauncher(["--version"])).resolves.toEqual({ code: 0, signal: null });
});

it("maps exit, missing status, and signal outcomes onto the invoking process", () => {
  const target = { pid: 42, exitCode: undefined as number | undefined, kill: vi.fn() };
  applyKakiCompatResult({ code: 7, signal: null }, target);
  expect(target.exitCode).toBe(7);
  applyKakiCompatResult({ code: null, signal: null }, target);
  expect(target.exitCode).toBe(1);
  applyKakiCompatResult({ code: null, signal: "SIGTERM" }, target);
  expect(target.kill).toHaveBeenCalledWith(42, "SIGTERM");
});

it("preserves argv and child failures at the compatibility boundary", async () => {
  const child = new EventEmitter();
  const spawnChild = vi.fn(() => child);
  const pending = runKakiCompatLauncher(["status", "--json"], spawnChild);
  child.emit("exit", 7, null);
  await expect(pending).resolves.toEqual({ code: 7, signal: null });
  expect(spawnChild).toHaveBeenCalledWith(
    process.execPath,
    [expect.stringMatching(/[\\/]kaki\.mjs$/u), "status", "--json"],
    { env: process.env, stdio: "inherit" },
  );

  const failed = new EventEmitter();
  const rejected = runKakiCompatLauncher([], () => failed);
  failed.emit("error", new Error("spawn-failed"));
  await expect(rejected).rejects.toThrow("spawn-failed");
});
