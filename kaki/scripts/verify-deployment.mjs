#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

const [
  compose,
  installer,
  forwarder,
  gatewayUnit,
  phoneUnit,
  phoneTimer,
  phoneHealth,
  onboarding,
  deployment,
  runbook,
  verify,
] = await Promise.all([
  read("docker-compose.yml"),
  read("scripts/install.sh"),
  read("scripts/kaki.ts"),
  read("scripts/systemd/kaki.service"),
  read("scripts/systemd/kaki-phone-health.service"),
  read("scripts/systemd/kaki-phone-health.timer"),
  read("scripts/phone-health.mjs"),
  read("docs/ONBOARDING.md"),
  read("docs/DEPLOYMENT.md"),
  read("docs/RUNBOOK.md"),
  read("docs/VERIFY.md"),
]);

assert.match(compose, /"gateway",[\s\S]{0,80}"run",/u, "Compose must run the Gateway");
assert.match(compose, /entrypoint: \["node", "kaki\.mjs"\]/u, "Compose CLI must use Kaki");
assert.doesNotMatch(compose, /--allow-unconfigured/u, "Production Gateway must require local mode");
assert.doesNotMatch(compose, /python[^\n]*http\.server/u, "ASR must not be a fake HTTP server");
assert.match(compose, /127\.0\.0\.1:\$\{KAKI_GATEWAY_PORT/u, "Gateway port must bind locally");
assert.match(compose, /kaki-state:\/home\/node\/\.kaki/u, "Kaki state must be persistent");
assert.match(
  compose,
  /EXTERNAL: ws:\/\/chrome:3000/u,
  "Browserless must advertise a reachable CDP URL",
);
assert.doesNotMatch(
  compose,
  /KAKI_BROWSER_CDP_URL/u,
  "Compose must not invent an unused browser env key",
);
assert.doesNotMatch(
  compose,
  /docker\.sock/u,
  "Default deployment must not mount the Docker socket",
);
for (const service of ["chrome", "asr", "ollama", "vllm"]) {
  assert.match(compose, new RegExp(`\\n  ${service}:`, "u"), `Compose must include ${service}`);
}
for (const line of compose.split(/\r?\n/u).filter((value) => /^\s+image:/u.test(value))) {
  if (line.includes("kaki-gateway:")) {
    continue;
  }
  assert.match(line, /@sha256:[a-f0-9]{64}$/u, `Third-party image is not digest-pinned: ${line}`);
  assert.doesNotMatch(line, /:latest(?:@|$)/u, `Mutable image tag is forbidden: ${line}`);
}

assert.match(installer, /pnpm install --frozen-lockfile/u);
assert.match(installer, /pnpm build/u);
assert.match(installer, /Kaki managed launcher/u);
assert.match(forwarder, /\.\.\/\.\.\/kaki\.mjs/u);
assert.doesNotMatch(forwarder, /writeFileSync|cpSync|config\.json/u);

assert.match(gatewayUnit, /^User=kaki$/mu);
assert.match(gatewayUnit, /^ExecStart=.*kaki\.mjs gateway run --bind loopback/mu);
assert.match(gatewayUnit, /^RestartPreventExitStatus=78$/mu);
assert.doesNotMatch(gatewayUnit, /status --deep/u);
assert.match(phoneUnit, /scripts\/phone-health\.mjs/u);
assert.match(phoneTimer, /^OnUnitActiveSec=5min$/mu);
assert.match(phoneHealth, /nodes", "status", "--connected", "--json"/u);
assert.match(phoneHealth, /phone\.connected !== true \|\| phone\.paired !== true/u);

assert.match(onboarding, /webhooks gmail setup/u);
assert.match(onboarding, /untrusted data/u);
assert.match(deployment, /--profile local-asr/u);
assert.match(deployment, /config set browser/u);
assert.match(deployment, /cdpUrl[^\n]+\$\{KAKI_BROWSER_TOKEN\}/u);
assert.match(deployment, /systemctl enable --now kaki\.service/u);
assert.match(runbook, /kaki backup create/u);
assert.match(runbook, /kaki backup restore/u);
assert.doesNotMatch(runbook, /^cp -[a-z]*r\b/imu);
assert.match(verify, /scripts\/verify-deployment\.mjs/u);

process.stdout.write("Kaki deployment contracts verified.\n");
