#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const UPSTREAM_COMMIT = "ccc10bf0983219b63c09078987cb02222147e0a1";

const configuredHome = process.env.KAKI_HOME?.trim();
const kakiHome = path.resolve(configuredHome || path.join(os.homedir(), ".kaki"));

process.env.OPENCLAW_STATE_DIR ||= kakiHome;
process.env.OPENCLAW_CONFIG_PATH ||= path.join(kakiHome, "kaki.json");
process.env.OPENCLAW_WORKSPACE_DIR ||= path.join(kakiHome, "workspace");

// Kaki is a private household runtime: its launcher never emits usage/update or
// OpenTelemetry traffic. The retained `openclaw` alias keeps upstream opt-in behavior.
process.env.OPENCLAW_NO_AUTO_UPDATE = "1";
process.env.DO_NOT_TRACK = "1";
process.env.OTEL_SDK_DISABLED = "true";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

const resolveUserPath = (value) => {
  if (value === "~") {
    return os.homedir();
  }
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return path.resolve(value);
};

const readWorkspaceArgument = (args) => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace") {
      return args[index + 1];
    }
    if (arg?.startsWith("--workspace=")) {
      return arg.slice("--workspace=".length);
    }
  }
  return undefined;
};

const isOnboardInvocation = (args) => {
  const commandIndex = args.indexOf("onboard");
  if (commandIndex === -1 || args.includes("--help") || args.includes("-h")) {
    return false;
  }
  const tail = args.slice(commandIndex + 1).filter((arg) => !arg.startsWith("-"));
  return !["recommendations"].includes(tail[0]);
};

const isOnboardHelpInvocation = (args) =>
  args[0] === "onboard" && (args.includes("--help") || args.includes("-h"));

const isRootHelpInvocation = (args) =>
  args.length === 0 || (args.length === 1 && ["help", "--help", "-h"].includes(args[0]));

const isDeepStatusInvocation = (args) => args[0] === "status" && args.includes("--deep");

const resolveWhatsAppRelinkAlias = (args) => {
  if (args[0] !== "wa" || args[1] !== "relink") {
    return undefined;
  }
  const tail = args.slice(2);
  const allowed = new Set(["--verbose"]);
  for (let index = 0; index < tail.length; index += 1) {
    const arg = tail[index];
    if (allowed.has(arg)) {
      continue;
    }
    if (arg === "--account") {
      const account = tail[index + 1];
      if (!account || account.startsWith("-")) {
        throw new Error("--account requires a value");
      }
      index += 1;
      continue;
    }
    if (arg?.startsWith("--account=") && arg.length > "--account=".length) {
      continue;
    }
    throw new Error(`unsupported kaki wa relink option: ${arg}`);
  }
  return ["channels", "login", "--channel", "whatsapp", ...tail];
};

const listSkillSources = async (rootDir) => {
  const roots = [
    path.join(rootDir, "kaki", "packages", "skills"),
    path.join(rootDir, "kaki", "packages", "phone-node", "skills"),
  ];
  const sources = [];
  const slugs = new Set();
  for (const root of roots) {
    for await (const relativePath of fs.glob("**/SKILL.md", { cwd: root })) {
      const slug = path.basename(path.dirname(relativePath));
      if (slugs.has(slug)) {
        throw new Error(`duplicate Kaki skill slug: ${slug}`);
      }
      slugs.add(slug);
      sources.push({ slug, path: path.join(root, relativePath) });
    }
  }
  return sources.toSorted((left, right) => left.slug.localeCompare(right.slug, "en"));
};

const ensureDirectory = async (directory) => {
  await fs.mkdir(directory, { recursive: true });
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`refusing to seed through a non-directory path: ${directory}`);
  }
};

const writeIfMissing = async (destination, content) => {
  try {
    await fs.writeFile(destination, content, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") {
      return false;
    }
    throw error;
  }
};

const toAgentSkillPlaybook = (source, slug) => {
  const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
  if (!source.startsWith(`---${lineEnding}`)) {
    throw new Error(`Kaki skill ${slug} is missing YAML frontmatter`);
  }
  const closingIndex = source.indexOf(`${lineEnding}---`, 4);
  if (closingIndex === -1) {
    throw new Error(`Kaki skill ${slug} has unterminated YAML frontmatter`);
  }
  const frontmatter = source.slice(0, closingIndex);
  const hasName = /^name\s*:/mu.test(frontmatter);
  const hasDescription = /^description\s*:/mu.test(frontmatter);
  if (hasName && hasDescription) {
    return source;
  }
  const description =
    /^when_to_use\s*:\s*(.+)$/mu.exec(frontmatter)?.[1]?.trim() ||
    /^title\s*:\s*(.+)$/mu.exec(frontmatter)?.[1]?.trim();
  if (!description) {
    throw new Error(`Kaki skill ${slug} has no description source`);
  }
  const additions = [
    ...(hasName ? [] : [`name: ${slug}`]),
    ...(hasDescription ? [] : [`description: ${JSON.stringify(description)}`]),
  ];
  return source.replace(
    `---${lineEnding}`,
    `---${lineEnding}${additions.join(lineEnding)}${lineEnding}`,
  );
};

export async function seedKakiWorkspace(options) {
  const workspaceDir = resolveUserPath(options.workspaceDir);
  await ensureDirectory(workspaceDir);
  const soulSource = path.join(options.repoRoot, "kaki", "SOUL.md");
  const soulCreated = await writeIfMissing(
    path.join(workspaceDir, "SOUL.md"),
    await fs.readFile(soulSource, "utf8"),
  );
  const skillsDir = path.join(workspaceDir, "skills");
  await ensureDirectory(skillsDir);
  let skillsCreated = 0;
  let skillsPreserved = 0;
  for (const skill of await listSkillSources(options.repoRoot)) {
    const targetDir = path.join(skillsDir, skill.slug);
    await ensureDirectory(targetDir);
    const source = await fs.readFile(skill.path, "utf8");
    const created = await writeIfMissing(
      path.join(targetDir, "SKILL.md"),
      toAgentSkillPlaybook(source, skill.slug),
    );
    skillsCreated += created ? 1 : 0;
    skillsPreserved += created ? 0 : 1;
  }
  return { workspaceDir, soulCreated, skillsCreated, skillsPreserved };
}

const waitForChild = (child, capture) =>
  new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal, stdout, stderr }));
  });

const createOpenClawRunner =
  (launcherPath) =>
  async (args, options = {}) => {
    const capture = options.capture === true;
    const hasInput = typeof options.stdin === "string";
    const child = spawn(process.execPath, [launcherPath, ...args], {
      env: process.env,
      stdio:
        capture || hasInput
          ? [
              hasInput ? "pipe" : "ignore",
              capture ? "pipe" : "inherit",
              capture ? "pipe" : "inherit",
            ]
          : "inherit",
    });
    if (hasInput) child.stdin.end(options.stdin);
    return await waitForChild(child, capture);
  };

const emitChildFailure = (result, stderr) => {
  if (result.stderr) {
    stderr.write(result.stderr);
  }
};

const KAKI_EXTRA_CHANNEL_PLUGIN_IDS = ["line", "zalo", "matrix", "irc", "mattermost", "msteams"];

export const buildKakiOnboardingPolicyBatch = (enableExtraChannels) => [
  { path: "wizard.appRecommendations", value: false },
  { path: "plugins.entries.kaki.enabled", value: false },
  ...(enableExtraChannels
    ? []
    : KAKI_EXTRA_CHANNEL_PLUGIN_IDS.map((pluginId) => ({
        path: `plugins.entries.${pluginId}.enabled`,
        value: false,
      }))),
];

const resolveKakiOnboardArgs = (args) => {
  const enableExtraChannels = args.includes("--enable-extra-channels");
  let profilePath;
  const upstreamArgs = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--enable-extra-channels") continue;
    if (arg === "--kaki-profile") {
      profilePath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg?.startsWith("--kaki-profile=")) {
      profilePath = arg.slice("--kaki-profile=".length);
      continue;
    }
    upstreamArgs.push(arg);
  }
  const configureRequiredChannels =
    !enableExtraChannels && !upstreamArgs.includes("--skip-channels");
  if (configureRequiredChannels) {
    upstreamArgs.push("--skip-channels");
  }
  return { enableExtraChannels, configureRequiredChannels, profilePath, upstreamArgs };
};

const applyKakiOnboardingPolicy = async (runOpenClaw, enableExtraChannels) =>
  await runOpenClaw([
    "config",
    "set",
    "--batch-json",
    JSON.stringify(buildKakiOnboardingPolicyBatch(enableExtraChannels)),
  ]);

async function resolveOnboardingProfilePath(options) {
  if (options.profilePath?.trim()) return resolveUserPath(options.profilePath.trim());
  if (!process.stdin.isTTY) {
    throw new Error("--kaki-profile <path> is required for non-interactive onboarding");
  }
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      "Path to the completed Kaki onboarding profile (SecretRefs and OneMap selections only): ",
    );
    if (!answer.trim()) throw new Error("Kaki onboarding profile path is required");
    return resolveUserPath(answer.trim());
  } finally {
    prompt.close();
  }
}

async function finishKakiOnboarding(options) {
  let profile;
  try {
    const profilePath = await resolveOnboardingProfilePath(options);
    profile = await fs.readFile(profilePath, "utf8");
    JSON.parse(profile);
  } catch (error) {
    options.stderr.write(
      `kaki: onboarding profile unavailable or invalid: ${error instanceof Error ? error.message : String(error)}. The plugin remains disabled.\n`,
    );
    return { code: 1, signal: null };
  }
  const dormant = await options.runOpenClaw(["config", "unset", "plugins.entries.kaki"]);
  if (dormant.signal || dormant.code !== 0) {
    options.stderr.write(
      "kaki: could not return Kaki to dormant command-only activation; the plugin remains disabled.\n",
    );
    return dormant;
  }
  const provisioned = await options.runOpenClaw(
    ["kaki-bootstrap", "provision", "--stdin", "--json"],
    { capture: true, stdin: profile },
  );
  if (provisioned.signal || provisioned.code !== 0) {
    emitChildFailure(provisioned, options.stderr);
    options.stderr.write(
      "kaki: onboarding validation or encrypted state provisioning failed; the plugin remains disabled.\n",
    );
    return provisioned;
  }
  let result;
  try {
    result = JSON.parse(provisioned.stdout);
  } catch {
    result = undefined;
  }
  if (!result?.ok || !result.config) {
    options.stderr.write(
      "kaki: onboarding provisioner returned an invalid receipt; the plugin remains disabled.\n",
    );
    return { code: 1, signal: null };
  }
  const activated = await options.runOpenClaw([
    "config",
    "set",
    "--batch-json",
    JSON.stringify([
      { path: "plugins.entries.kaki.enabled", value: true },
      { path: "plugins.entries.kaki.config", value: result.config },
    ]),
  ]);
  if (activated.signal || activated.code !== 0) {
    options.stderr.write(
      "kaki: validated state is dormant because atomic Kaki activation failed; retry onboarding.\n",
    );
    return activated;
  }
  options.stdout.write(
    "Kaki onboarding complete. Restart the Gateway, then run `kaki status --deep`.\n",
  );
  return { code: 0, signal: null };
}

const parseDashboardConnection = (stdout) => {
  const parsed = JSON.parse(stdout);
  if (!parsed || parsed.ok !== true || typeof parsed.httpUrl !== "string") {
    throw new Error(
      typeof parsed?.reason === "string" ? parsed.reason : "dashboard connection unavailable",
    );
  }
  const origin = new URL(parsed.httpUrl).origin;
  let credential = process.env.OPENCLAW_GATEWAY_TOKEN?.trim() || undefined;
  if (!credential && typeof parsed.gatewayPassword === "string") {
    credential = parsed.gatewayPassword;
  }
  if (!credential && typeof parsed.url === "string") {
    credential = new URL(parsed.url).hash.slice(1)
      ? new URLSearchParams(new URL(parsed.url).hash.slice(1)).get("token") || undefined
      : undefined;
  }
  return { origin, credential };
};

const fetchWithTimeout = async (fetchImpl, url, init, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export async function probeKakiControl(options) {
  const dashboard = await options.runOpenClaw(["dashboard", "--json"], { capture: true });
  if (dashboard.signal || dashboard.code !== 0) {
    emitChildFailure(dashboard, options.stderr);
    return { ok: false, reason: "Gateway authentication handoff is unavailable." };
  }
  let connection;
  try {
    connection = parseDashboardConnection(dashboard.stdout);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Gateway connection metadata is invalid.",
    };
  }
  const headers = connection.credential
    ? { Authorization: `Bearer ${connection.credential}` }
    : undefined;
  try {
    const [snapshot, action] = await Promise.all([
      fetchWithTimeout(options.fetchImpl, `${connection.origin}/api/kaki/snapshot`, {
        method: "GET",
        headers,
      }),
      fetchWithTimeout(options.fetchImpl, `${connection.origin}/api/kaki/action`, {
        method: "GET",
        headers,
      }),
    ]);
    const snapshotBody = await snapshot.json().catch(() => undefined);
    if (!snapshot.ok) {
      return {
        ok: false,
        snapshotStatus: snapshot.status,
        actionRouteStatus: action.status,
        reason:
          typeof snapshotBody?.error === "string"
            ? snapshotBody.error
            : `Kaki snapshot failed with HTTP ${snapshot.status}.`,
      };
    }
    if (action.status !== 405) {
      return {
        ok: false,
        snapshotStatus: snapshot.status,
        actionRouteStatus: action.status,
        reason: `Kaki action route boundary returned HTTP ${action.status}; expected safe GET rejection (405).`,
      };
    }
    return {
      ok: true,
      snapshotStatus: snapshot.status,
      actionRouteStatus: action.status,
      owners: snapshotBody,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Kaki control probe failed.",
    };
  }
}

export async function runKakiLauncher(options) {
  const { args, runOpenClaw, stdout, stderr } = options;
  if (isOnboardHelpInvocation(args)) {
    const upstream = await runOpenClaw(args.filter((arg) => arg !== "--enable-extra-channels"));
    if (!upstream.signal && upstream.code === 0) {
      stdout.write(
        "\nKaki options:\n  --kaki-profile <path>    Complete JSON onboarding profile (required without a TTY)\n  --enable-extra-channels  Include the full OpenClaw channel picker (default: WhatsApp + Telegram only)\n",
      );
    }
    return upstream;
  }
  if (isRootHelpInvocation(args)) {
    const upstream = await runOpenClaw(args);
    if (!upstream.signal && upstream.code === 0) {
      stdout.write(
        "\nKaki commands:\n  kaki wa relink [--account <id>] [--verbose]\n  kaki onboard [--kaki-profile <path>] [--enable-extra-channels]\n",
      );
    }
    return upstream;
  }
  let relinkArgs;
  try {
    relinkArgs = resolveWhatsAppRelinkAlias(args);
  } catch (error) {
    stderr.write(`kaki: ${error instanceof Error ? error.message : String(error)}\n`);
    return { code: 1, signal: null };
  }
  if (relinkArgs) {
    return await runOpenClaw(relinkArgs);
  }

  if (isOnboardInvocation(args)) {
    const onboarding = resolveKakiOnboardArgs(args);
    const policy = await applyKakiOnboardingPolicy(runOpenClaw, onboarding.enableExtraChannels);
    if (policy.signal || policy.code !== 0) {
      stderr.write(
        "kaki: onboarding stopped before setup because the fail-closed Kaki policy could not be written atomically. Run `kaki config validate`, then retry.\n",
      );
      return policy;
    }
    const upstream = await runOpenClaw(onboarding.upstreamArgs);
    if (upstream.signal || upstream.code !== 0) {
      return upstream;
    }
    if (onboarding.configureRequiredChannels) {
      for (const channelArgs of [
        ["channels", "add", "--channel", "whatsapp", "--account", "assistant"],
        ["channels", "login", "--channel", "whatsapp", "--account", "assistant"],
        ["channels", "add", "--channel", "telegram", "--account", "control"],
      ]) {
        const channel = await runOpenClaw(channelArgs);
        if (channel.signal || channel.code !== 0) {
          stderr.write(
            `kaki: required channel setup failed during \`${channelArgs.join(" ")}\`; the Kaki plugin remains disabled. Retry \`kaki onboard\`.\n`,
          );
          return channel;
        }
      }
    }
    const explicitWorkspace = readWorkspaceArgument(args)?.trim();
    const workspaceDir = explicitWorkspace || process.env.OPENCLAW_WORKSPACE_DIR;
    try {
      const seeded = await seedKakiWorkspace({ repoRoot, workspaceDir });
      stdout.write(
        `Kaki workspace ready: ${seeded.workspaceDir} (${seeded.skillsCreated} skills added, ${seeded.skillsPreserved} preserved)\n`,
      );
    } catch (error) {
      stderr.write(
        `kaki: unable to prepare the agent workspace: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      return { code: 1, signal: null };
    }
    return await finishKakiOnboarding({
      runOpenClaw,
      stdout,
      stderr,
      profilePath: onboarding.profilePath,
    });
  }

  if (isDeepStatusInvocation(args)) {
    const json = args.includes("--json");
    const upstreamArgs = [
      "gateway",
      "status",
      "--deep",
      "--require-rpc",
      ...(json ? ["--json"] : []),
    ];
    const upstream = await runOpenClaw(upstreamArgs, { capture: json });
    if (!json && upstream.signal) {
      return upstream;
    }
    const kaki = await probeKakiControl({
      runOpenClaw,
      fetchImpl: options.fetchImpl ?? fetch,
      stderr,
    });
    if (json) {
      let openclaw;
      try {
        const status = JSON.parse(upstream.stdout);
        openclaw = { ...status, ok: upstream.code === 0 };
      } catch {
        openclaw = { ok: false, reason: "OpenClaw status did not return valid JSON." };
      }
      stdout.write(`${JSON.stringify({ openclaw, kaki }, null, 2)}\n`);
      emitChildFailure(upstream, stderr);
    } else {
      stdout.write(`Kaki control: ${kaki.ok ? "healthy" : `unhealthy - ${kaki.reason}`}\n`);
    }
    return {
      code: upstream.code === 0 && kaki.ok ? 0 : 1,
      signal: upstream.signal,
    };
  }

  return await runOpenClaw(args);
}

async function run() {
  const args = process.argv.slice(2);
  const versionArg = args.length === 1 && ["-v", "-V", "--version"].includes(args[0]);
  if (versionArg) {
    const packageJson = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf8"),
    );
    process.stdout.write(`Kaki ${packageJson.version} (OpenClaw ${UPSTREAM_COMMIT.slice(0, 7)})\n`);
    return;
  }

  const launcherPath = fileURLToPath(new URL("./openclaw.mjs", import.meta.url));
  const result = await runKakiLauncher({
    args,
    runOpenClaw: createOpenClawRunner(launcherPath),
    fetchImpl: fetch,
    stdout: process.stdout,
    stderr: process.stderr,
  });
  if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exitCode = result.code ?? 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  await run();
}
