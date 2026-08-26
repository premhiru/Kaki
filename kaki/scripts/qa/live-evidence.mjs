import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_LIVE_EVIDENCE_MAX_AGE_HOURS = 168;

const BUILD_SHA = /^[0-9a-f]{40}$/u;
const LIVE_ID = /^[a-z0-9][a-z0-9-]*$/u;
const RFC3339_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const ALLOWED_KEYS = new Set([
  "schemaVersion",
  "liveId",
  "passed",
  "fixtureMode",
  "checkedAt",
  "operator",
  "build",
  "notes",
  "evidence",
]);

function hasControlCharacters(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}

export function validateLiveEvidence(
  value,
  {
    expectedLiveId,
    expectedBuild,
    now = new Date(),
    maxAgeHours = DEFAULT_LIVE_EVIDENCE_MAX_AGE_HOURS,
  },
) {
  const errors = [];
  if (!isPlainObject(value)) return ["evidence must be a JSON object"];
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0)
    return ["maxAgeHours must be a positive number"];

  for (const key of Object.keys(value))
    if (!ALLOWED_KEYS.has(key)) errors.push(`unexpected field ${key}`);
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (typeof value.liveId !== "string" || !LIVE_ID.test(value.liveId))
    errors.push("liveId must be a lowercase identifier");
  else if (value.liveId !== expectedLiveId)
    errors.push(`liveId ${value.liveId} does not match ${expectedLiveId}`);
  if (typeof value.passed !== "boolean") errors.push("passed must be a boolean");
  if (value.fixtureMode !== false) errors.push("fixtureMode must be false");
  if (
    typeof value.operator !== "string" ||
    value.operator.trim().length === 0 ||
    value.operator.length > 120 ||
    hasControlCharacters(value.operator)
  )
    errors.push("operator must be a non-empty printable string of at most 120 characters");
  if (typeof value.build !== "string" || !BUILD_SHA.test(value.build))
    errors.push("build must be a full lowercase 40-character Git SHA");
  else if (value.build !== expectedBuild)
    errors.push(`build ${value.build} does not match checked head ${expectedBuild}`);

  const checkedAt = parseCheckedAt(value.checkedAt);
  if (!checkedAt) errors.push("checkedAt must be a valid RFC 3339 timestamp with a timezone");
  else {
    const ageMs = now.getTime() - checkedAt.getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    if (ageMs < -5 * 60 * 1000) errors.push("checkedAt is more than five minutes in the future");
    if (ageMs > maxAgeMs) errors.push(`checkedAt is older than ${maxAgeHours} hours`);
  }

  if (value.notes !== undefined && typeof value.notes !== "string")
    errors.push("notes must be a string when present");
  if (
    value.evidence !== undefined &&
    (!Array.isArray(value.evidence) ||
      value.evidence.length === 0 ||
      value.evidence.some((item) => typeof item !== "string" || item.trim().length === 0) ||
      new Set(value.evidence).size !== value.evidence.length)
  )
    errors.push("evidence must be a non-empty array of unique, non-empty strings when present");
  return errors;
}

export async function readLiveEvidenceDirectory(
  directory,
  { expectedLiveIds, expectedBuild, now = new Date(), maxAgeHours },
) {
  const expected = new Set(expectedLiveIds);
  const seenIds = new Set();
  const evidenceById = new Map();
  const errors = [];
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return { evidenceById, errors };
    throw error;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(directory, entry.name);
    let evidence;
    try {
      evidence = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      errors.push(`${entry.name}: invalid JSON: ${formatError(error)}`);
      continue;
    }
    const liveId =
      isPlainObject(evidence) && typeof evidence.liveId === "string"
        ? evidence.liveId
        : entry.name.slice(0, -5);
    if (!expected.has(liveId)) {
      errors.push(`${entry.name}: unexpected liveId ${liveId}`);
      continue;
    }
    if (seenIds.has(liveId)) errors.push(`${entry.name}: duplicate evidence for ${liveId}`);
    else seenIds.add(liveId);
    if (entry.name !== `${liveId}.json`) {
      errors.push(`${entry.name}: filename must be ${liveId}.json`);
      continue;
    }
    const validationErrors = validateLiveEvidence(evidence, {
      expectedLiveId: liveId,
      expectedBuild,
      now,
      maxAgeHours,
    });
    if (validationErrors.length) {
      errors.push(...validationErrors.map((message) => `${entry.name}: ${message}`));
      continue;
    }
    evidenceById.set(liveId, evidence);
  }
  return { evidenceById, errors };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCheckedAt(value) {
  if (typeof value !== "string" || !RFC3339_WITH_ZONE.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
