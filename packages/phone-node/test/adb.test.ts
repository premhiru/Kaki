import { describe, expect, it } from "vitest";
import { AdbTransport, type CommandRunner } from "../src/adb-transport.js";

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
