import { describe, expect, it, vi } from "vitest";
import { AdbTransport, SpawnCommandRunner, type CommandRunner } from "../src/adb-transport.js";

describe("AdbTransport", () => {
  it("targets accessibility bounds before falling back to coordinates", async () => {
    const calls: string[][] = [];
    const runner: CommandRunner = {
      run: async (_command: string, args: readonly string[]) => {
        calls.push([...args]);
        const output = args.includes("cat")
          ? '<hierarchy><node text="Book ride" bounds="[100,200][300,400]" /></hierarchy>'
          : "";
        return { stdout: Buffer.from(output), stderr: "", exitCode: 0 };
      },
    };
    const transport = new AdbTransport({ serial: "phone-1", runner });
    await transport.act({ type: "tap", target: "Book ride" });
    expect(calls.at(-1)).toEqual(["-s", "phone-1", "shell", "input", "tap", "200", "300"]);
  });

  it("uses ADBKeyboard base64 input for Unicode", async () => {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const runner: CommandRunner = {
      run: async (command, args) => {
        calls.push({ command, args });
        return { stdout: new Uint8Array(), stderr: "", exitCode: 0 };
      },
    };
    const transport = new AdbTransport({ runner });
    await transport.act({ type: "type", target: "field", value: "阿嬷 makan" });
    expect(calls).toEqual([
      {
        command: "adb",
        args: [
          "shell",
          "am",
          "broadcast",
          "-a",
          "ADB_INPUT_B64",
          "--es",
          "msg",
          Buffer.from("阿嬷 makan").toString("base64"),
        ],
      },
    ]);
  });
});

it("captures command stdout, stderr, and exit status without a shell", async () => {
  const result = await new SpawnCommandRunner().run(process.execPath, [
    "-e",
    "process.stdout.write('out'); process.stderr.write('err'); process.exitCode=3",
  ]);
  expect(Buffer.from(result.stdout).toString()).toBe("out");
  expect(result.stderr).toBe("err");
  expect(result.exitCode).toBe(3);
  await expect(new SpawnCommandRunner().run("missing-kaki-command", [])).rejects.toBeDefined();
});

it("maps the public ADB controls to bounded argv and validates operator input", async () => {
  const calls: string[][] = [];
  const runner: CommandRunner = {
    run: vi.fn(async (_command: string, args: readonly string[]) => {
      calls.push([...args]);
      if (args.includes("screencap"))
        return { stdout: new Uint8Array([1, 2]), stderr: "", exitCode: 0 };
      if (args.includes("notification"))
        return { stdout: Buffer.from("notice"), stderr: "", exitCode: 0 };
      return { stdout: new Uint8Array(), stderr: "", exitCode: 0 };
    }),
  };
  const transport = new AdbTransport({ executable: "adb-custom", runner });
  await expect(transport.screenshot()).resolves.toEqual(new Uint8Array([1, 2]));
  await transport.act({ type: "tap", target: [10, 20] });
  await transport.act({ type: "long_press", target: [11, 21] });
  await transport.act({ type: "swipe", target: [1, 2, 3, 4] });
  await transport.act({ type: "key", target: "BACK" });
  await transport.act({ type: "launch", target: "com.example.app" });
  await transport.act({ type: "done", target: "done" });
  await transport.longPress(4, 5, 900);
  await transport.clipboard("hello");
  await transport.intent("https://example.test/path");
  await transport.backToHome();
  await transport.screenOn();
  await expect(transport.notifications()).resolves.toBe("notice");
  expect(runner.run).toHaveBeenCalledWith("adb-custom", expect.any(Array));
  expect(calls).toEqual(
    expect.arrayContaining([
      ["shell", "input", "tap", "10", "20"],
      ["shell", "input", "swipe", "11", "21", "11", "21", "800"],
      ["shell", "input", "swipe", "1", "2", "3", "4", "350"],
      ["shell", "input", "keyevent", "HOME"],
      ["shell", "svc", "power", "stayon", "true"],
    ]),
  );
  await expect(transport.key("BACK; rm")).rejects.toThrow("Unsafe Android key");
  await expect(transport.launch(";bad")).rejects.toThrow("Unsafe Android package");
  await expect(transport.act({ type: "scroll_to", target: [1, 2] })).rejects.toThrow(
    "requires a text",
  );
});

it("reports health, reconnects endpoints, and turns command failures into visible state", async () => {
  const calls: string[][] = [];
  const runner: CommandRunner = {
    run: vi.fn(async (_command: string, args: readonly string[]) => {
      calls.push([...args]);
      if (args.includes("get-state"))
        return { stdout: Buffer.from("device\n"), stderr: "", exitCode: 0 };
      if (args.includes("battery"))
        return { stdout: Buffer.from(" level: 84\n"), stderr: "", exitCode: 0 };
      return { stdout: new Uint8Array(), stderr: "", exitCode: 0 };
    }),
  };
  const transport = new AdbTransport({ endpoint: "127.0.0.1:5555", serial: "phone", runner });
  await expect(transport.reconnect()).resolves.toMatchObject({
    connected: true,
    state: "device",
    serial: "phone",
    batteryPercent: 84,
  });
  expect(calls[0]).toEqual(["connect", "127.0.0.1:5555"]);

  const failed = new AdbTransport({
    runner: {
      run: async () => ({ stdout: new Uint8Array(), stderr: "offline", exitCode: 1 }),
    },
  });
  await expect(failed.health()).resolves.toMatchObject({
    connected: false,
    state: "adb get-state failed: offline",
  });
  await expect(failed.screenshot()).rejects.toThrow("adb exec-out failed: offline");
});

it("waits and scrolls against the live accessibility tree", async () => {
  let reads = 0;
  const calls: string[][] = [];
  const transport = new AdbTransport({
    runner: {
      run: async (_command, args) => {
        calls.push([...args]);
        if (args.includes("cat")) {
          reads += 1;
          const xml =
            reads >= 3
              ? '<node bounds="[0,0][100,100]" content-desc="Checkout" />'
              : "<hierarchy />";
          return { stdout: Buffer.from(xml), stderr: "", exitCode: 0 };
        }
        return { stdout: new Uint8Array(), stderr: "", exitCode: 0 };
      },
    },
  });
  await transport.act({ type: "scroll_to", target: "Checkout" });
  expect(calls.filter((args) => args.includes("swipe"))).toHaveLength(2);
  await transport.waitFor("Checkout", 10, 1);
  await expect(transport.waitFor("Never", 1, 1)).rejects.toThrow("Timed out waiting");
});
