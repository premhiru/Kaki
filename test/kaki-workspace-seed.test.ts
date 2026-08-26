import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildKakiOnboardingPolicyBatch,
  probeKakiControl,
  runKakiLauncher,
  seedKakiWorkspace,
} from "../kaki.mjs";
import { loadSkillsFromDirSafe } from "../src/skills/loading/local-loader.js";
import { useAutoCleanupTempDirTracker } from "./helpers/temp-dir.js";

const tempDirs = useAutoCleanupTempDirTracker(afterEach);
const repoRoot = path.resolve(import.meta.dirname, "..");
const MASTER_PROMPT_SG_SOUL_SHA256 =
  "9a78ac28a8878dff6612b28b49a5fee9952dbb47e1c77f0fb304d00a71855005";

describe("Kaki workspace seed", () => {
  it("disables all outbound telemetry for the Kaki launcher", () => {
    expect(process.env.OPENCLAW_NO_AUTO_UPDATE).toBe("1");
    expect(process.env.DO_NOT_TRACK).toBe("1");
    expect(process.env.OTEL_SDK_DISABLED).toBe("true");
  });

  it("makes the SG soul and every Kaki playbook visible to the real workspace loader", async () => {
    const workspaceDir = tempDirs.make("kaki-workspace-seed-");

    const result = await seedKakiWorkspace({ repoRoot, workspaceDir });

    const sourceSoul = await fs.readFile(path.join(repoRoot, "kaki", "SOUL.md"), "utf8");
    await expect(fs.readFile(path.join(workspaceDir, "SOUL.md"), "utf8")).resolves.toBe(sourceSoul);
    expect(createHash("sha256").update(sourceSoul).digest("hex")).toBe(
      MASTER_PROMPT_SG_SOUL_SHA256,
    );
    const diagnostics: string[] = [];
    const loaded = loadSkillsFromDirSafe({
      dir: path.join(workspaceDir, "skills"),
      source: "kaki-test",
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.message),
    });
    expect(diagnostics).toEqual([]);
    expect(loaded.skills).toHaveLength(90);
    expect(new Set(loaded.skills.map((skill) => skill.name)).size).toBe(90);
    expect(result).toMatchObject({ soulCreated: true, skillsCreated: 90, skillsPreserved: 0 });
  });

  it("never overwrites operator-edited soul or skill files on a later run", async () => {
    const workspaceDir = tempDirs.make("kaki-workspace-preserve-");
    await seedKakiWorkspace({ repoRoot, workspaceDir });
    const soulPath = path.join(workspaceDir, "SOUL.md");
    const skillPath = path.join(workspaceDir, "skills", "grab-ride", "SKILL.md");
    await fs.writeFile(soulPath, "operator soul\n", "utf8");
    await fs.writeFile(skillPath, "operator playbook\n", "utf8");

    const result = await seedKakiWorkspace({ repoRoot, workspaceDir });

    await expect(fs.readFile(soulPath, "utf8")).resolves.toBe("operator soul\n");
    await expect(fs.readFile(skillPath, "utf8")).resolves.toBe("operator playbook\n");
    expect(result).toMatchObject({ soulCreated: false, skillsCreated: 0, skillsPreserved: 90 });
  });
});

const memoryWriter = () => {
  let value = "";
  return {
    write(chunk: string | Uint8Array) {
      value += String(chunk);
      return true;
    },
    text: () => value,
  };
};

const fixtureKakiConfig = {
  householdProfileId: "household-fixture",
  operatorPersonId: "person-fixture",
  addressBookProfileId: "address-fixture",
  approvalPolicyProfileId: "approval-fixture",
  dataProfileId: "data-fixture",
  phoneNodeId: "phone-fixture",
  whatsappAccountId: "assistant",
  telegramAccountId: "control",
  modelProfileId: "model-fixture",
  asrProfileId: "asr-fixture",
  locale: "sg",
} as const;

describe("Kaki launcher ownership", () => {
  it("shows the Kaki onboarding flag without mutating config", async () => {
    const calls: string[][] = [];
    const stdout = memoryWriter();

    const result = await runKakiLauncher({
      args: ["onboard", "--enable-extra-channels", "--help"],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout,
      stderr: memoryWriter(),
    });

    expect(result.code).toBe(0);
    expect(calls).toEqual([["onboard", "--help"]]);
    expect(stdout.text()).toContain("--enable-extra-channels");
  });

  it("delegates the WhatsApp relink alias to the canonical channel login", async () => {
    const calls: string[][] = [];
    const stdout = memoryWriter();
    const stderr = memoryWriter();

    const result = await runKakiLauncher({
      args: ["wa", "relink", "--account", "assistant", "--verbose"],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout,
      stderr,
    });

    expect(result.code).toBe(0);
    expect(calls).toEqual([
      ["channels", "login", "--channel", "whatsapp", "--account", "assistant", "--verbose"],
    ]);
  });

  it("stops before onboarding when the atomic fail-closed policy cannot be written", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-upstream-failure-");
    await fs.rm(workspaceDir, { recursive: true });
    const calls: string[][] = [];

    const result = await runKakiLauncher({
      args: ["onboard", "--workspace", workspaceDir],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return { code: 23, signal: null, stdout: "", stderr: "upstream failed\n" };
      },
      stdout: memoryWriter(),
      stderr: memoryWriter(),
    });

    expect(result.code).toBe(23);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.slice(0, 3)).toEqual(["config", "set", "--batch-json"]);
    await expect(fs.lstat(workspaceDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("persists no recommendations and the default extra-channel gate in one mutation", () => {
    expect(buildKakiOnboardingPolicyBatch(false)).toEqual([
      { path: "wizard.appRecommendations", value: false },
      { path: "plugins.entries.kaki.enabled", value: false },
      { path: "plugins.entries.line.enabled", value: false },
      { path: "plugins.entries.zalo.enabled", value: false },
      { path: "plugins.entries.matrix.enabled", value: false },
      { path: "plugins.entries.irc.enabled", value: false },
      { path: "plugins.entries.mattermost.enabled", value: false },
      { path: "plugins.entries.msteams.enabled", value: false },
    ]);
    expect(buildKakiOnboardingPolicyBatch(true)).toEqual([
      { path: "wizard.appRecommendations", value: false },
      { path: "plugins.entries.kaki.enabled", value: false },
    ]);
  });

  it("leaves the plugin disabled when upstream onboarding fails after policy commit", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-upstream-failure-");
    await fs.rm(workspaceDir, { recursive: true });
    const calls: string[][] = [];

    const result = await runKakiLauncher({
      args: ["onboard", "--workspace", workspaceDir],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return calls.length === 1
          ? { code: 0, signal: null, stdout: "", stderr: "" }
          : { code: 23, signal: null, stdout: "", stderr: "upstream failed\n" };
      },
      stdout: memoryWriter(),
      stderr: memoryWriter(),
    });

    expect(result.code).toBe(23);
    expect(JSON.parse(calls[0]![3]!)).toContainEqual({
      path: "plugins.entries.kaki.enabled",
      value: false,
    });
    expect(calls[1]).toEqual(["onboard", "--workspace", workspaceDir, "--skip-channels"]);
    await expect(fs.lstat(workspaceDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("provisions validated state before atomically activating the plugin", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-complete-");
    const profilePath = path.join(workspaceDir, "profile.json");
    await fs.writeFile(profilePath, "{}", "utf8");
    const calls: Array<{ args: string[]; options?: { capture?: boolean; stdin?: string } }> = [];
    const stdout = memoryWriter();
    const stderr = memoryWriter();

    const result = await runKakiLauncher({
      args: ["onboard", "--workspace", workspaceDir, "--kaki-profile", profilePath],
      runOpenClaw: async (args: string[], options?: { capture?: boolean; stdin?: string }) => {
        calls.push({ args, options });
        return args[0] === "kaki-bootstrap"
          ? {
              code: 0,
              signal: null,
              stdout: JSON.stringify({ ok: true, config: fixtureKakiConfig }),
              stderr: "",
            }
          : { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout,
      stderr,
    });

    expect(result.code).toBe(0);
    expect(calls[0]?.args.slice(0, 3)).toEqual(["config", "set", "--batch-json"]);
    expect(JSON.parse(calls[0]!.args[3]!)).toEqual(buildKakiOnboardingPolicyBatch(false));
    expect(calls.slice(1, 7).map((call) => call.args)).toEqual([
      ["onboard", "--workspace", workspaceDir, "--skip-channels"],
      ["channels", "add", "--channel", "whatsapp", "--account", "assistant"],
      ["channels", "login", "--channel", "whatsapp", "--account", "assistant"],
      ["channels", "add", "--channel", "telegram", "--account", "control"],
      ["config", "unset", "plugins.entries.kaki"],
      ["kaki-bootstrap", "provision", "--stdin", "--json"],
    ]);
    expect(calls[6]?.options).toEqual({ capture: true, stdin: "{}" });
    expect(calls[7]?.args.slice(0, 3)).toEqual(["config", "set", "--batch-json"]);
    expect(JSON.parse(calls[7]!.args[3]!)).toEqual([
      { path: "plugins.entries.kaki.enabled", value: true },
      { path: "plugins.entries.kaki.config", value: fixtureKakiConfig },
    ]);
    expect(calls.flatMap((call) => call.args)).not.toContain("--kaki-profile");
    await expect(fs.readFile(path.join(workspaceDir, "SOUL.md"), "utf8")).resolves.toContain(
      "You are Kaki",
    );
    expect(stdout.text()).toContain("Kaki onboarding complete");
    expect(stderr.text()).toBe("");
  });

  it("leaves Kaki dormant when encrypted bootstrap provisioning fails", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-provision-failure-");
    const profilePath = path.join(workspaceDir, "profile.json");
    await fs.writeFile(profilePath, "{}", "utf8");
    const calls: string[][] = [];
    const stderr = memoryWriter();

    const result = await runKakiLauncher({
      args: [
        "onboard",
        "--workspace",
        workspaceDir,
        "--skip-channels",
        "--kaki-profile",
        profilePath,
      ],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return args[0] === "kaki-bootstrap"
          ? { code: 31, signal: null, stdout: "", stderr: "invalid profile\n" }
          : { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout: memoryWriter(),
      stderr,
    });

    expect(result.code).toBe(31);
    expect(calls.at(-1)).toEqual(["kaki-bootstrap", "provision", "--stdin", "--json"]);
    expect(calls).not.toContainEqual(
      expect.arrayContaining(["plugins.entries.kaki.enabled", "true"]),
    );
    expect(stderr.text()).toContain("plugin remains disabled");
  });

  it("keeps validated state dormant when the final atomic activation fails", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-activation-failure-");
    const profilePath = path.join(workspaceDir, "profile.json");
    await fs.writeFile(profilePath, "{}", "utf8");
    const calls: string[][] = [];
    const stderr = memoryWriter();

    const result = await runKakiLauncher({
      args: [
        "onboard",
        "--workspace",
        workspaceDir,
        "--skip-channels",
        "--kaki-profile",
        profilePath,
      ],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        if (args[0] === "kaki-bootstrap") {
          return {
            code: 0,
            signal: null,
            stdout: JSON.stringify({ ok: true, config: fixtureKakiConfig }),
            stderr: "",
          };
        }
        return calls.length === 5
          ? { code: 32, signal: null, stdout: "", stderr: "activation failed\n" }
          : { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout: memoryWriter(),
      stderr,
    });

    expect(result.code).toBe(32);
    expect(calls.at(-1)?.slice(0, 3)).toEqual(["config", "set", "--batch-json"]);
    expect(stderr.text()).toContain("validated state is dormant");
  });

  it("accepts the explicit extra-channel flag without forwarding it upstream", async () => {
    const workspaceDir = tempDirs.make("kaki-onboard-extra-channels-");
    const profilePath = path.join(workspaceDir, "profile.json");
    await fs.writeFile(profilePath, "{}", "utf8");
    const calls: string[][] = [];

    const result = await runKakiLauncher({
      args: [
        "onboard",
        "--workspace",
        workspaceDir,
        "--enable-extra-channels",
        "--kaki-profile",
        profilePath,
      ],
      runOpenClaw: async (args: string[]) => {
        calls.push(args);
        return args[0] === "kaki-bootstrap"
          ? {
              code: 0,
              signal: null,
              stdout: JSON.stringify({ ok: true, config: fixtureKakiConfig }),
              stderr: "",
            }
          : { code: 0, signal: null, stdout: "", stderr: "" };
      },
      stdout: memoryWriter(),
      stderr: memoryWriter(),
    });

    expect(result.code).toBe(0);
    expect(JSON.parse(calls[0]![3]!)).toEqual(buildKakiOnboardingPolicyBatch(true));
    expect(calls[1]).toEqual(["onboard", "--workspace", workspaceDir]);
    expect(calls.flat()).not.toContain("--enable-extra-channels");
  });

  it("reports an authenticated owner snapshot and safe action-route check without leaking auth", async () => {
    const requests: Array<{ url: string; authorization?: string }> = [];
    const stderr = memoryWriter();

    const result = await probeKakiControl({
      runOpenClaw: async () => ({
        code: 0,
        signal: null,
        stdout: JSON.stringify({
          ok: true,
          httpUrl: "http://127.0.0.1:18789",
          url: "http://127.0.0.1:18789/#token=supersecret",
        }),
        stderr: "",
      }),
      fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
        const authorization = new Headers(init?.headers).get("Authorization") ?? undefined;
        requests.push({ url: String(url), authorization });
        return String(url).endsWith("/snapshot")
          ? Response.json({ system: { paused: false }, approvals: [] })
          : new Response("Method Not Allowed", { status: 405 });
      },
      stderr,
    });

    expect(result).toMatchObject({ ok: true, snapshotStatus: 200, actionRouteStatus: 405 });
    expect(requests).toEqual([
      {
        url: "http://127.0.0.1:18789/api/kaki/snapshot",
        authorization: "Bearer supersecret",
      },
      {
        url: "http://127.0.0.1:18789/api/kaki/action",
        authorization: "Bearer supersecret",
      },
    ]);
    expect(stderr.text()).not.toContain("supersecret");
  });

  it("makes deep status fail when an authenticated Kaki owner probe is unavailable", async () => {
    const stdout = memoryWriter();
    const stderr = memoryWriter();
    const calls: string[][] = [];
    const runOpenClaw = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "gateway") {
        return {
          code: 0,
          signal: null,
          stdout: JSON.stringify({ rpc: { ok: true } }),
          stderr: "",
        };
      }
      return {
        code: 0,
        signal: null,
        stdout: JSON.stringify({
          ok: true,
          httpUrl: "http://127.0.0.1:18789",
          url: "http://127.0.0.1:18789/#token=redacted-test-token",
        }),
        stderr: "",
      };
    };

    const result = await runKakiLauncher({
      args: ["status", "--deep", "--json"],
      runOpenClaw,
      fetchImpl: async () =>
        Response.json(
          { ok: false, error: "Kaki runtime owners are unavailable." },
          { status: 503 },
        ),
      stdout,
      stderr,
    });

    expect(result.code).toBe(1);
    expect(calls[0]).toEqual(["gateway", "status", "--deep", "--require-rpc", "--json"]);
    const report = JSON.parse(stdout.text());
    expect(report.openclaw.ok).toBe(true);
    expect(report.kaki).toMatchObject({
      ok: false,
      snapshotStatus: 503,
      reason: "Kaki runtime owners are unavailable.",
    });
    expect(stdout.text()).not.toContain("redacted-test-token");
  });
});
