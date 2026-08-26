#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fail, formatRelative, root, walk } from "./lib.mjs";

const required = [
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/INTERFACES.md",
  "docs/DECISIONS.md",
  "docs/PERSONAS.md",
  "docs/VERIFY.md",
  "docs/RUNBOOK.md",
  "docs/SKILLS.md",
  "docs/LOCALE.md",
  "docs/ONBOARDING.md",
  "docs/DEPLOYMENT.md",
  "docs/PROGRESS.md",
  "docs/REQUIREMENTS.md",
  "docs/agents/DEPLOYMENT.md",
  "CONTRIBUTING.md",
];
let errors = 0;
for (const relative of required) {
  try {
    await fs.access(path.join(root, relative));
  } catch {
    fail(`Missing required documentation: ${relative}`);
    errors += 1;
  }
}

const files = await walk(
  root,
  (file) =>
    file.endsWith(".md") &&
    !path
      .relative(root, file)
      .split(path.sep)
      .some(
        (part) =>
          part.startsWith("node_modules") ||
          part === ".pnpm" ||
          part === ".venv" ||
          part === ".artifacts" ||
          part === "dist",
      ),
);
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;
for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    const raw = match[1]?.trim();
    if (
      !raw ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("#") ||
      raw.startsWith("mailto:")
    )
      continue;
    const base = raw.split("#", 1)[0] ?? "";
    const target = decodeURIComponent(base.replace(/^<|>$/gu, ""));
    try {
      await fs.access(path.resolve(path.dirname(file), target));
    } catch {
      fail(`${formatRelative(file)}: broken local link ${raw}`);
      errors += 1;
    }
  }
}
if (!errors)
  process.stdout.write(
    `Documentation check passed (${files.length} Markdown files, ${required.length} required artifacts).\n`,
  );
