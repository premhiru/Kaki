import { randomUUID } from "node:crypto";

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
