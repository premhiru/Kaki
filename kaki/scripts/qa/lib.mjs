import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

export const root = path.resolve(import.meta.dirname, "../..");

export async function walk(dir, predicate = () => true) {
  const found = [];
  async function visit(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (predicate(file)) found.push(file);
    }
  }
  await visit(dir);
  return found.sort();
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((item, key) => {
    if (item == null) return undefined;
    if (/^\d+$/.test(key)) return item[Number(key)];
    return item[key];
  }, value);
}

export function evaluateAssertion(actual, assertion) {
  const value = getPath(actual, assertion.path);
  switch (assertion.op) {
    case "eq":
      return isDeepStrictEqual(value, assertion.value);
    case "oneOf":
      return assertion.value.includes(value);
    case "gte":
      return typeof value === "number" && value >= assertion.value;
    case "lte":
      return typeof value === "number" && value <= assertion.value;
    case "lengthGte":
      return value != null && typeof value.length === "number" && value.length >= assertion.value;
    case "matches":
      return (
        typeof value === "string" && new RegExp(assertion.value, assertion.flags ?? "u").test(value)
      );
    case "absent":
      return value === undefined || value === null || value === "";
    case "notContains":
      return typeof value === "string" && !value.includes(assertion.value);
    case "includes":
      return Array.isArray(value)
        ? value.includes(assertion.value)
        : typeof value === "string" && value.includes(assertion.value);
    default:
      throw new Error(`Unknown assertion operator: ${assertion.op}`);
  }
}

export function formatRelative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

export function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) parsed._.push(token);
    else {
      const [name, inline] = token.slice(2).split("=", 2);
      if (inline !== undefined) parsed[name] = inline;
      else if (argv[index + 1] && !argv[index + 1].startsWith("--")) parsed[name] = argv[++index];
      else parsed[name] = true;
    }
  }
  return parsed;
}

export function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
