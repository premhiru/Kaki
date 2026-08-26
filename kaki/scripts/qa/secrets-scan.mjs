#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fail, formatRelative, root, walk } from "./lib.mjs";

const ignored = new Set([".git", "node_modules", "dist", "coverage", ".pnpm-store"]);
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/u],
  ["Telegram bot token", /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/u],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/u],
];
const files = await walk(root, (file) => {
  const parts = path.relative(root, file).split(path.sep);
  return (
    !parts.some((part) => ignored.has(part)) &&
    !/\.(?:png|jpe?g|gif|webp|pdf|zip|gz|woff2?|sqlite3?|db)$/iu.test(file)
  );
});
let findings = 0;
for (const file of files) {
  let text;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    continue;
  }
  for (const [name, pattern] of patterns) {
    if (pattern.test(text)) {
      findings += 1;
      fail(`${formatRelative(file)}: possible ${name}`);
    }
  }
}
if (!findings) process.stdout.write(`Secret scan passed (${files.length} text files checked).\n`);
