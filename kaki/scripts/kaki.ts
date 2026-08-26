#!/usr/bin/env node

// Compatibility entrypoint for `pnpm --dir kaki kaki`. The repository-root
// launcher owns every command, path mapping, migration, and backup operation.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const launcher = fileURLToPath(new URL("../../kaki.mjs", import.meta.url));
type ChildResult = { code: number | null; signal: NodeJS.Signals | null };
type ProcessTarget = {
  exitCode: string | number | null | undefined;
  kill(pid: number, signal: NodeJS.Signals): unknown;
  readonly pid: number;
};
interface ChildHandle {
  once(event: "error", listener: (error: Error) => void): this;
  once(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
}
type SpawnChild = (
  command: string,
  args: readonly string[],
  options: { env: NodeJS.ProcessEnv; stdio: "inherit" },
) => ChildHandle;

export async function runKakiCompatLauncher(
  args: readonly string[],
  spawnChild: SpawnChild = spawn,
): Promise<ChildResult> {
  const child = spawnChild(process.execPath, [launcher, ...args], {
    env: process.env,
    stdio: "inherit",
  });
  return await new Promise<ChildResult>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

export function applyKakiCompatResult(result: ChildResult, target: ProcessTarget = process): void {
  if (result.signal) target.kill(target.pid, result.signal);
  else target.exitCode = result.code ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runKakiCompatLauncher(process.argv.slice(2));
  applyKakiCompatResult(result);
}
