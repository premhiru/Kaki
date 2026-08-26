import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface SecretHandle {
  readonly id: string;
  readonly scope: string;
  readonly expiresAt: string;
}

export interface SecretBackend {
  put(id: string, value: string): Promise<void>;
  get(id: string): Promise<string | undefined>;
  delete(id: string): Promise<void>;
}

interface Grant {
  handle: SecretHandle;
  taskId: string;
  consumed: boolean;
}

/** Brokers opaque handles; only a scoped executor can unwrap a value. */
export class SecretBroker {
  readonly #grants = new Map<string, Grant>();
  constructor(
    private readonly backend: SecretBackend,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async store(
    value: string,
    input: { scope: string; taskId: string; ttlMs?: number },
  ): Promise<SecretHandle> {
    if (!value || value.length > 64_000) throw new Error("invalid-secret-value");
    const id = randomUUID();
    const handle = {
      id,
      scope: input.scope,
      expiresAt: new Date(this.clock().getTime() + (input.ttlMs ?? 300_000)).toISOString(),
    };
    await this.backend.put(id, value);
    this.#grants.set(id, { handle, taskId: input.taskId, consumed: false });
    return handle;
  }
  async resolve(
    handle: SecretHandle,
    input: { scope: string; taskId: string; consume?: boolean },
  ): Promise<string> {
    const grant = this.#grants.get(handle.id);
    if (!grant || grant.handle.scope !== input.scope || grant.taskId !== input.taskId)
      throw new Error("secret-handle-scope-denied");
    if (grant.consumed || new Date(grant.handle.expiresAt) <= this.clock())
      throw new Error("secret-handle-expired");
    const value = await this.backend.get(handle.id);
    if (value === undefined) throw new Error("secret-handle-missing");
    if (input.consume) {
      grant.consumed = true;
      await this.backend.delete(handle.id);
    }
    return value;
  }
}

export class MemorySecretBackend implements SecretBackend {
  readonly #values = new Map<string, string>();
  async put(id: string, value: string): Promise<void> {
    this.#values.set(id, value);
  }
  async get(id: string): Promise<string | undefined> {
    return this.#values.get(id);
  }
  async delete(id: string): Promise<void> {
    this.#values.delete(id);
  }
}

interface EncryptedSecretEnvelope {
  readonly version: 1;
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
}

/**
 * Encrypted-at-rest backend for hosts without a supported keychain command.
 * The 256-bit key must arrive from the service environment, never from the file.
 */
export class EncryptedEnvSecretBackend implements SecretBackend {
  #pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly file: string,
    private readonly key: Uint8Array,
  ) {
    if (key.byteLength !== 32) throw new Error("secret-encryption-key-must-be-32-bytes");
  }

  async put(id: string, value: string): Promise<void> {
    await this.mutate((values) => values.set(id, value));
  }

  async get(id: string): Promise<string | undefined> {
    await this.#pending;
    return (await this.read()).get(id);
  }

  async delete(id: string): Promise<void> {
    await this.mutate((values) => values.delete(id));
  }

  private async mutate(change: (values: Map<string, string>) => unknown): Promise<void> {
    const operation = this.#pending.then(async () => {
      const values = await this.read();
      change(values);
      await this.write(values);
    });
    this.#pending = operation.catch(() => undefined);
    await operation;
  }

  private async read(): Promise<Map<string, string>> {
    let raw: string;
    try {
      raw = await fs.readFile(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
      throw error;
    }
    const parsedEnvelope: unknown = JSON.parse(raw);
    if (
      typeof parsedEnvelope !== "object" ||
      parsedEnvelope === null ||
      Array.isArray(parsedEnvelope)
    ) {
      throw new Error("invalid-secret-envelope");
    }
    const envelopeRecord = parsedEnvelope as Record<string, unknown>;
    if (envelopeRecord.version !== 1) throw new Error("unsupported-secret-envelope");
    if (
      typeof envelopeRecord.iv !== "string" ||
      typeof envelopeRecord.tag !== "string" ||
      typeof envelopeRecord.ciphertext !== "string"
    ) {
      throw new Error("invalid-secret-envelope");
    }
    const envelope: EncryptedSecretEnvelope = {
      version: envelopeRecord.version,
      iv: envelopeRecord.iv,
      tag: envelopeRecord.tag,
      ciphertext: envelopeRecord.ciphertext,
    };
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Record<string, unknown>;
    const values = new Map<string, string>();
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value !== "string") throw new Error("invalid-encrypted-secret-store");
      values.set(id, value);
    }
    return values;
  }

  private async write(values: Map<string, string>): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(Object.fromEntries(values)), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const envelope: EncryptedSecretEnvelope = {
      version: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(envelope), { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, this.file);
    await fs.chmod(this.file, 0o600).catch(() => undefined);
  }
}

export type SecretCommandRunner = (
  executable: string,
  args: readonly string[],
  input?: string,
) => Promise<{ stdout: string; exitCode: number }>;

/** Uses macOS Keychain or freedesktop Secret Service without invoking a shell. */
export class OsKeychainSecretBackend implements SecretBackend {
  constructor(
    private readonly service: string,
    private readonly platform: NodeJS.Platform = process.platform,
    private readonly run: SecretCommandRunner = runSecretCommand,
  ) {
    if (!service.trim()) throw new Error("keychain-service-required");
    if (platform !== "darwin" && platform !== "linux")
      throw new Error("os-keychain-command-unavailable");
  }

  async put(id: string, value: string): Promise<void> {
    const result =
      this.platform === "darwin"
        ? await this.run("security", [
            "add-generic-password",
            "-U",
            "-a",
            id,
            "-s",
            this.service,
            "-w",
            value,
          ])
        : await this.run(
            "secret-tool",
            ["store", "--label", `${this.service} secret`, "service", this.service, "id", id],
            value,
          );
    if (result.exitCode !== 0) throw new Error("os-keychain-write-failed");
  }

  async get(id: string): Promise<string | undefined> {
    const result =
      this.platform === "darwin"
        ? await this.run("security", ["find-generic-password", "-a", id, "-s", this.service, "-w"])
        : await this.run("secret-tool", ["lookup", "service", this.service, "id", id]);
    if (result.exitCode !== 0) return undefined;
    return result.stdout.replace(/[\r\n]+$/u, "");
  }

  async delete(id: string): Promise<void> {
    const result =
      this.platform === "darwin"
        ? await this.run("security", ["delete-generic-password", "-a", id, "-s", this.service])
        : await this.run("secret-tool", ["clear", "service", this.service, "id", id]);
    if (result.exitCode !== 0) throw new Error("os-keychain-delete-failed");
  }
}

export function decodeSecretEncryptionKey(value: string): Uint8Array {
  const trimmed = value.trim();
  const decoded = /^[\da-f]{64}$/iu.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (decoded.byteLength !== 32) throw new Error("secret-encryption-key-must-be-32-bytes");
  return decoded;
}

export function createProductionSecretBackend(input: {
  readonly encryptedFile: string;
  readonly encryptionKey?: string;
  readonly service?: string;
  readonly platform?: NodeJS.Platform;
  readonly run?: SecretCommandRunner;
}): SecretBackend {
  if (input.encryptionKey)
    return new EncryptedEnvSecretBackend(
      input.encryptedFile,
      decodeSecretEncryptionKey(input.encryptionKey),
    );
  return new OsKeychainSecretBackend(input.service ?? "kaki.household", input.platform, input.run);
}

async function runSecretCommand(
  executable: string,
  args: readonly string[],
  input?: string,
): Promise<{ stdout: string; exitCode: number }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, [...args], {
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    const { stdin, stdout } = child;
    const chunks: Buffer[] = [];
    let size = 0;
    stdout.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > 64_000) {
        child.kill();
        reject(new Error("os-keychain-response-too-large"));
        return;
      }
      chunks.push(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      resolve({ stdout: Buffer.concat(chunks).toString("utf8"), exitCode: code ?? 1 }),
    );
    stdin.end(input);
  });
}
