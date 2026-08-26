import { spawn } from "node:child_process";
import type { PhoneAction, PhoneDriver } from "./index.js";

export interface CommandResult {
  readonly stdout: Uint8Array;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface CommandRunner {
  run(command: string, args: readonly string[], signal?: AbortSignal): Promise<CommandResult>;
}

export class SpawnCommandRunner implements CommandRunner {
  public run(
    command: string,
    args: readonly string[],
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true, signal });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (exitCode) => {
        resolve({
          stdout: Buffer.concat(stdout),
          stderr: Buffer.concat(stderr).toString("utf8"),
          exitCode: exitCode ?? -1,
        });
      });
    });
  }
}

export interface AdbHealth {
  readonly connected: boolean;
  readonly state: string;
  readonly serial?: string;
  readonly batteryPercent?: number;
  readonly checkedAt: string;
}

export class AdbTransport implements PhoneDriver {
  public constructor(
    private readonly options: {
      serial?: string;
      executable?: string;
      endpoint?: string;
      runner?: CommandRunner;
    } = {},
  ) {}

  public async screenshot(): Promise<Uint8Array> {
    return (await this.adb(["exec-out", "screencap", "-p"])).stdout;
  }

  public async dumpUi(): Promise<string | undefined> {
    const target = "/sdcard/kaki-window.xml";
    await this.shell(["uiautomator", "dump", target]);
    const result = await this.shell(["cat", target]);
    const xml = text(result.stdout).trim();
    return xml || undefined;
  }

  public async act(action: PhoneAction): Promise<void> {
    switch (action.type) {
      case "tap": {
        const [x, y] = await this.resolvePoint(action.target);
        await this.shell(["input", "tap", String(x), String(y)]);
        return;
      }
      case "long_press": {
        const [x, y] = await this.resolvePoint(action.target);
        await this.shell(["input", "swipe", String(x), String(y), String(x), String(y), "800"]);
        return;
      }
      case "swipe":
        await this.shell(["input", "swipe", ...action.target.map(String), "350"]);
        return;
      case "type":
        await this.typeUnicode(action.value);
        return;
      case "key":
        await this.key(action.target);
        return;
      case "launch":
        await this.launch(action.target);
        return;
      case "wait":
        await this.waitFor(action.target);
        return;
      case "scroll_to":
        if (Array.isArray(action.target))
          throw new Error("scroll_to requires a text or accessibility target");
        await this.scrollTo(action.target);
        return;
      case "done":
      case "need_approval":
      case "fail":
        return;
    }
  }

  public async longPress(x: number, y: number, durationMs = 800): Promise<void> {
    await this.shell([
      "input",
      "swipe",
      String(x),
      String(y),
      String(x),
      String(y),
      String(durationMs),
    ]);
  }

  public async clipboard(value: string): Promise<void> {
    await this.shell(["am", "broadcast", "-a", "clipper.set", "-e", "text", value]);
  }

  public async intent(uri: string, action = "android.intent.action.VIEW"): Promise<void> {
    await this.shell(["am", "start", "-a", action, "-d", uri]);
  }

  public async notifications(): Promise<string> {
    return text((await this.shell(["dumpsys", "notification", "--noredact"])).stdout);
  }

  public async backToHome(): Promise<void> {
    await this.key("HOME");
  }

  public async launch(packageName: string): Promise<void> {
    ensureAndroidIdentifier(packageName);
    await this.shell(["monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"]);
  }

  public async key(key: string): Promise<void> {
    if (!/^[A-Z0-9_]+$/u.test(key)) throw new Error(`Unsafe Android key: ${key}`);
    await this.shell(["input", "keyevent", key]);
  }

  public async screenOn(): Promise<void> {
    await this.shell(["input", "keyevent", "WAKEUP"]);
    await this.shell(["svc", "power", "stayon", "true"]);
  }

  public async reconnect(): Promise<AdbHealth> {
    if (this.options.endpoint) await this.run(["connect", this.options.endpoint]);
    return this.health();
  }

  public async health(): Promise<AdbHealth> {
    try {
      const stateResult = await this.adb(["get-state"], false);
      if (stateResult.exitCode !== 0)
        throw new Error(`adb get-state failed: ${stateResult.stderr.trim()}`);
      const state = text(stateResult.stdout).trim();
      const batteryResult = await this.shell(["dumpsys", "battery"], false);
      const battery = batteryResult.exitCode === 0 ? text(batteryResult.stdout) : "";
      const match = /^\s*level:\s*(\d+)/mu.exec(battery);
      return {
        connected: state === "device",
        state,
        ...(this.options.serial ? { serial: this.options.serial } : {}),
        ...(match?.[1] ? { batteryPercent: Number(match[1]) } : {}),
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        state: error instanceof Error ? error.message : String(error),
        ...(this.options.serial ? { serial: this.options.serial } : {}),
        checkedAt: new Date().toISOString(),
      };
    }
  }

  public async waitFor(target: string, timeoutMs = 15_000, intervalMs = 300): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    do {
      if ((await this.dumpUi())?.toLocaleLowerCase().includes(target.toLocaleLowerCase())) return;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } while (Date.now() < deadline);
    throw new Error(`Timed out waiting for ${target}`);
  }

  private async scrollTo(target: string): Promise<void> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await this.resolvePoint(target);
        return;
      } catch {
        await this.shell(["input", "swipe", "540", "1700", "540", "500", "350"]);
      }
    }
    throw new Error(`Could not scroll to ${target}`);
  }

  private async typeUnicode(value: string): Promise<void> {
    const encoded = Buffer.from(value, "utf8").toString("base64");
    await this.shell(["am", "broadcast", "-a", "ADB_INPUT_B64", "--es", "msg", encoded]);
  }

  private async resolvePoint(target: string | [number, number]): Promise<[number, number]> {
    if (Array.isArray(target)) return target;
    const xml = await this.dumpUi();
    if (!xml) throw new Error("Accessibility tree unavailable");
    const escaped = escapeRegex(target);
    const node =
      new RegExp(
        `<node[^>]*(?:text|content-desc|resource-id)="[^"]*${escaped}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*/?>`,
        "iu",
      ).exec(xml) ??
      new RegExp(
        `<node[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*(?:text|content-desc|resource-id)="[^"]*${escaped}[^"]*"[^>]*/?>`,
        "iu",
      ).exec(xml);
    if (!node?.[1] || !node[2] || !node[3] || !node[4])
      throw new Error(`Target not found: ${target}`);
    return [
      Math.round((Number(node[1]) + Number(node[3])) / 2),
      Math.round((Number(node[2]) + Number(node[4])) / 2),
    ];
  }

  private async shell(args: readonly string[], checked = true): Promise<CommandResult> {
    return this.adb(["shell", ...args], checked);
  }

  private async adb(args: readonly string[], checked = true): Promise<CommandResult> {
    const result = await this.run([
      ...(this.options.serial ? ["-s", this.options.serial] : []),
      ...args,
    ]);
    if (checked && result.exitCode !== 0)
      throw new Error(`adb ${args[0] ?? "command"} failed: ${result.stderr.trim()}`);
    return result;
  }

  private async run(args: readonly string[]): Promise<CommandResult> {
    return (this.options.runner ?? new SpawnCommandRunner()).run(
      this.options.executable ?? "adb",
      args,
    );
  }
}

function text(value: Uint8Array): string {
  return Buffer.from(value).toString("utf8");
}

function ensureAndroidIdentifier(value: string): void {
  if (!/^[a-zA-Z][a-zA-Z0-9_.]+$/u.test(value)) throw new Error(`Unsafe Android package: ${value}`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
