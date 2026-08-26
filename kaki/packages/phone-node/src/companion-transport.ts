import type { AdbHealth } from "./adb-transport.js";
import type { PhoneTransport } from "./daemon.js";
import type { PhoneAction } from "./index.js";

export interface CompanionRpcClient {
  request(input: {
    readonly method: string;
    readonly params?: Record<string, unknown>;
    readonly authorization: string;
  }): Promise<unknown>;
  close(): Promise<void>;
}

/** Local authenticated bridge to the Android accessibility/notification companion. */
export class CompanionTransport implements PhoneTransport {
  constructor(
    endpoint: string,
    private readonly authorization: string,
    private readonly client: CompanionRpcClient,
  ) {
    const url = new URL(endpoint);
    if (!isLoopback(url.hostname)) throw new Error("companion-endpoint-must-be-loopback");
    if (!authorization.trim()) throw new Error("companion-authorization-required");
  }

  async screenshot(): Promise<Uint8Array> {
    const value = await this.call("screenshot");
    if (typeof value !== "string") throw new Error("companion-screenshot-invalid");
    return Buffer.from(value, "base64");
  }
  async dumpUi(): Promise<string | undefined> {
    const value = await this.call("dump_ui");
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") throw new Error("companion-a11y-tree-invalid");
    return value;
  }
  async act(action: PhoneAction): Promise<void> {
    if (action.type === "done" || action.type === "need_approval" || action.type === "fail") return;
    await this.call(action.type, {
      target: action.target,
      ...(action.type === "type" ? { value: action.value } : {}),
    });
  }
  async backToHome(): Promise<void> {
    await this.call("back_to_home");
  }
  async screenOn(): Promise<void> {
    await this.call("screen_on");
  }
  async health(): Promise<AdbHealth> {
    return parseHealth(await this.call("health"));
  }
  async reconnect(): Promise<AdbHealth> {
    return parseHealth(await this.call("reconnect"));
  }
  async notifications(): Promise<unknown> {
    return this.call("notifications");
  }
  async close(): Promise<void> {
    await this.client.close();
  }

  private call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.client.request({
      method,
      ...(params ? { params } : {}),
      authorization: this.authorization,
    });
  }
}

function parseHealth(value: unknown): AdbHealth {
  if (!value || typeof value !== "object") throw new Error("companion-health-invalid");
  const health = value as Partial<AdbHealth>;
  if (typeof health.connected !== "boolean" || typeof health.state !== "string")
    throw new Error("companion-health-invalid");
  return {
    connected: health.connected,
    state: health.state,
    checkedAt: typeof health.checkedAt === "string" ? health.checkedAt : new Date().toISOString(),
    ...(typeof health.serial === "string" ? { serial: health.serial } : {}),
    ...(typeof health.batteryPercent === "number" ? { batteryPercent: health.batteryPercent } : {}),
  };
}

function isLoopback(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}
