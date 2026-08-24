import fs from "node:fs/promises";
import path from "node:path";

export class WorkspacePolicy {
  readonly #root: string;
  private constructor(root: string) {
    this.#root = root;
  }
  static async create(root: string): Promise<WorkspacePolicy> {
    return new WorkspacePolicy(await fs.realpath(root));
  }
  async resolve(candidate: string, operation: "read" | "write"): Promise<string> {
    const absolute = path.resolve(this.#root, candidate);
    let checked: string;
    try {
      checked = await fs.realpath(absolute);
    } catch (error) {
      if (operation === "read") throw error;
      const parent = await fs.realpath(path.dirname(absolute));
      checked = path.join(parent, path.basename(absolute));
    }
    const relative = path.relative(this.#root, checked);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("workspace-path-denied");
    return checked;
  }
}

export interface ShellDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}
export class ShellPolicy {
  constructor(
    private readonly allowedExecutables: ReadonlySet<string> = new Set(["node", "pnpm", "git"]),
  ) {}
  decide(executable: string, args: readonly string[], approved = false): ShellDecision {
    const base = path
      .basename(executable)
      .toLocaleLowerCase()
      .replace(/\.exe$/u, "");
    if (!this.allowedExecutables.has(base))
      return { allowed: false, requiresApproval: true, reason: "executable-not-allowlisted" };
    if (
      args.some((arg) =>
        /(?:^|\s)(?:rm|del|rmdir|format)\b|[;&|`]|\$\(|(?:^|[\\/])\.\.(?:[\\/]|$)/iu.test(arg),
      )
    )
      return { allowed: false, requiresApproval: true, reason: "dangerous-shell-syntax" };
    if (!approved)
      return { allowed: false, requiresApproval: true, reason: "shell-requires-approval" };
    return { allowed: true, requiresApproval: false, reason: "approved-allowlisted-shell" };
  }
}
