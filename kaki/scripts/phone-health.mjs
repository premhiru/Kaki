#!/usr/bin/env node

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const phoneNodeId = process.env.KAKI_PHONE_NODE_ID?.trim();
if (!phoneNodeId) {
  process.stderr.write(
    "KAKI_PHONE_NODE_ID is not set; set the paired Android node ID in /etc/kaki/kaki.env.\n",
  );
  process.exitCode = 2;
} else if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(phoneNodeId)) {
  process.stderr.write("KAKI_PHONE_NODE_ID has an invalid format.\n");
  process.exitCode = 2;
} else {
  const launcher = fileURLToPath(new URL("../../kaki.mjs", import.meta.url));
  const result = await new Promise((resolve) => {
    execFile(
      process.execPath,
      [launcher, "nodes", "status", "--connected", "--json", "--timeout", "10000"],
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 20_000 },
      (error, stdout) => resolve({ error, stdout }),
    );
  });

  if (result.error) {
    process.stderr.write(
      "Phone-node health query failed; check `kaki gateway status` and the Gateway journal.\n",
    );
    process.exitCode = 1;
  } else {
    let payload;
    try {
      payload = JSON.parse(result.stdout);
    } catch {
      process.stderr.write("Phone-node health query returned invalid JSON.\n");
      process.exitCode = 1;
    }

    if (payload) {
      const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
      const phone = nodes.find((node) => node?.nodeId === phoneNodeId);
      if (!phone || phone.connected !== true || phone.paired !== true) {
        process.stderr.write(
          `Phone node ${phoneNodeId} is not both paired and connected; reopen the companion and rerun pairing.\n`,
        );
        process.exitCode = 1;
      } else if (
        phone.approvalState !== undefined &&
        phone.approvalState !== null &&
        phone.approvalState !== "approved"
      ) {
        process.stderr.write(
          `Phone node ${phoneNodeId} needs capability approval; run \`kaki nodes status\` and approve the pending request.\n`,
        );
        process.exitCode = 1;
      } else {
        process.stdout.write(`Phone node healthy: ${phoneNodeId}\n`);
      }
    }
  }
}
