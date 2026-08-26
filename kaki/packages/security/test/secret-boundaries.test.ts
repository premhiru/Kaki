import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EncryptedEnvSecretBackend,
  MemorySecretBackend,
  OsKeychainSecretBackend,
  SecretBroker,
  createProductionSecretBackend,
  decodeSecretEncryptionKey,
} from "../src/index.js";

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(
    cleanup.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("opaque secret handle failures", () => {
  it("rejects empty, oversized, expired, missing, and cross-task access", async () => {
    let now = new Date("2026-08-26T00:00:00Z");
    const backend = new MemorySecretBackend();
    const broker = new SecretBroker(backend, () => now);
    await expect(broker.store("", { scope: "model", taskId: "one" })).rejects.toThrow(
      "invalid-secret-value",
    );
    await expect(
      broker.store("x".repeat(64_001), { scope: "model", taskId: "one" }),
    ).rejects.toThrow("invalid-secret-value");
    const handle = await broker.store("token", { scope: "model", taskId: "one", ttlMs: 1 });
    await expect(broker.resolve(handle, { scope: "model", taskId: "two" })).rejects.toThrow(
      "scope-denied",
    );
    now = new Date("2026-08-26T00:00:01Z");
    await expect(broker.resolve(handle, { scope: "model", taskId: "one" })).rejects.toThrow(
      "expired",
    );

    const missing = await broker.store("gone", { scope: "model", taskId: "one" });
    await backend.delete(missing.id);
    await expect(broker.resolve(missing, { scope: "model", taskId: "one" })).rejects.toThrow(
      "missing",
    );
  });
});

describe("encrypted fallback configuration", () => {
  it("decodes exact hex/base64 keys and rejects every other key length", () => {
    expect(decodeSecretEncryptionKey("ab".repeat(32))).toHaveLength(32);
    expect(decodeSecretEncryptionKey(Buffer.alloc(32, 9).toString("base64"))).toHaveLength(32);
    expect(() => decodeSecretEncryptionKey("short")).toThrow("32-bytes");
    expect(() => new EncryptedEnvSecretBackend("unused", new Uint8Array(31))).toThrow("32-bytes");
  });

  it("serializes concurrent mutations and removes deleted ciphertext entries", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kaki-secret-boundary-"));
    cleanup.push(directory);
    const file = path.join(directory, "secrets.enc");
    const backend = new EncryptedEnvSecretBackend(file, new Uint8Array(32).fill(3));
    await Promise.all([backend.put("one", "first"), backend.put("two", "second")]);
    await backend.delete("one");
    await expect(backend.get("one")).resolves.toBeUndefined();
    await expect(backend.get("two")).resolves.toBe("second");
  });

  it("rejects an unsupported encrypted-store version", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kaki-secret-version-"));
    cleanup.push(directory);
    const file = path.join(directory, "secrets.enc");
    await fs.writeFile(file, JSON.stringify({ version: 2 }));
    const backend = new EncryptedEnvSecretBackend(file, new Uint8Array(32).fill(3));
    await expect(backend.get("one")).rejects.toThrow("unsupported-secret-envelope");
  });
});

describe("operating-system keychain contract", () => {
  it("uses macOS Security commands and surfaces write/delete failures", async () => {
    const run = vi.fn(async (_executable: string, args: readonly string[]) => ({
      stdout: args[0] === "find-generic-password" ? "value\r\n" : "",
      exitCode: args[0] === "add-generic-password" || args[0] === "delete-generic-password" ? 1 : 0,
    }));
    const backend = new OsKeychainSecretBackend("kaki.test", "darwin", run);
    await expect(backend.put("id", "value")).rejects.toThrow("write-failed");
    await expect(backend.get("id")).resolves.toBe("value");
    await expect(backend.delete("id")).rejects.toThrow("delete-failed");
    expect(run.mock.calls.map(([executable]) => executable)).toEqual([
      "security",
      "security",
      "security",
    ]);
  });

  it("fails closed on unsupported hosts, blank services, and missing entries", async () => {
    expect(
      () => new OsKeychainSecretBackend("", "linux", async () => ({ stdout: "", exitCode: 0 })),
    ).toThrow("service-required");
    expect(
      () => new OsKeychainSecretBackend("kaki", "win32", async () => ({ stdout: "", exitCode: 0 })),
    ).toThrow("unavailable");
    const backend = new OsKeychainSecretBackend("kaki", "linux", async () => ({
      stdout: "",
      exitCode: 1,
    }));
    await expect(backend.get("absent")).resolves.toBeUndefined();
  });

  it("selects encrypted storage only when an environment key is supplied", () => {
    const encrypted = createProductionSecretBackend({
      encryptedFile: "unused",
      encryptionKey: "11".repeat(32),
    });
    expect(encrypted).toBeInstanceOf(EncryptedEnvSecretBackend);
    const keychain = createProductionSecretBackend({
      encryptedFile: "unused",
      service: "kaki.test",
      platform: "linux",
      run: async () => ({ stdout: "", exitCode: 0 }),
    });
    expect(keychain).toBeInstanceOf(OsKeychainSecretBackend);
  });
});
