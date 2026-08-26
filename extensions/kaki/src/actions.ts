import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import type {
  KakiControlAction,
  KakiRuntimeOwners,
  OwnerActionResult,
  PhoneCommand,
} from "./contracts.js";

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function identifier(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 256 ? value : undefined;
}

function boundedText(value: unknown, max: number): string | undefined {
  return typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= max
    ? value
    : undefined;
}

function textList(value: unknown, maxItems: number): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length > maxItems) return undefined;
  const values = value.map((entry) => boundedText(entry, 128));
  return values.every((entry): entry is string => entry !== undefined) ? values : undefined;
}

function householdPatch(value: unknown) {
  if (!isRecord(value)) return undefined;
  const allowed = ["name", "relation", "languages", "register", "dietary", "commute"];
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !allowed.includes(key))) return undefined;
  const name = value.name === undefined ? undefined : boundedText(value.name, 256);
  const relation = value.relation === undefined ? undefined : boundedText(value.relation, 128);
  const languages = value.languages === undefined ? undefined : textList(value.languages, 12);
  const register = value.register === undefined ? undefined : boundedText(value.register, 128);
  const dietary = value.dietary === undefined ? undefined : textList(value.dietary, 32);
  const commute = value.commute === undefined ? undefined : textList(value.commute, 32);
  if (
    (value.name !== undefined && !name) ||
    (value.relation !== undefined && !relation) ||
    (value.languages !== undefined && !languages) ||
    (value.register !== undefined && !register) ||
    (value.dietary !== undefined && !dietary) ||
    (value.commute !== undefined && !commute)
  )
    return undefined;
  return {
    ...(name ? { name } : {}),
    ...(relation ? { relation } : {}),
    ...(languages ? { languages } : {}),
    ...(register ? { register } : {}),
    ...(dietary ? { dietary } : {}),
    ...(commute ? { commute } : {}),
  };
}

function journeyPatch(value: unknown) {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => key !== "title" && key !== "detail"))
    return undefined;
  const title = value.title === undefined ? undefined : boundedText(value.title, 512);
  const detail = value.detail === undefined ? undefined : boundedText(value.detail, 16_384);
  if ((value.title !== undefined && !title) || (value.detail !== undefined && !detail))
    return undefined;
  return { ...(title ? { title } : {}), ...(detail ? { detail } : {}) };
}

function phoneCommand(value: unknown): PhoneCommand["command"] | undefined {
  switch (value) {
    case "screenshot":
    case "back":
    case "home":
    case "tap-target":
    case "refresh-tree":
    case "relaunch":
      return value;
    default:
      return undefined;
  }
}

export function approvalFactsHash(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value) ? value : undefined;
}

export function isApprovalDecisionConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "approval-material-facts-changed" ||
      error.message === "approval-replay:concurrent")
  );
}

export function parseControlAction(value: unknown): KakiControlAction | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  switch (value.type) {
    case "system.pause":
      return hasExactKeys(value, ["type", "paused"]) && typeof value.paused === "boolean"
        ? { type: value.type, paused: value.paused }
        : undefined;
    case "approval.decide": {
      const id = identifier(value.id);
      const factsHash = approvalFactsHash(value.factsHash);
      const decision = value.decision;
      return hasExactKeys(value, ["type", "id", "decision", "factsHash"]) &&
        id &&
        factsHash &&
        (decision === "approved" || decision === "denied")
        ? { type: value.type, id, decision, factsHash }
        : undefined;
    }
    case "journey.delete": {
      const id = identifier(value.id);
      return hasExactKeys(value, ["type", "id"]) && id ? { type: value.type, id } : undefined;
    }
    case "household.edit": {
      const id = identifier(value.id);
      const patch = householdPatch(value.patch);
      return hasExactKeys(value, ["type", "id", "patch"]) && id && patch
        ? { type: value.type, id, patch }
        : undefined;
    }
    case "journey.create": {
      if (
        !hasExactKeys(value, ["type", "input"]) ||
        !isRecord(value.input) ||
        !hasExactKeys(value.input, ["taskId", "title", "detail"])
      )
        return undefined;
      const taskId = identifier(value.input.taskId);
      const title = boundedText(value.input.title, 512);
      const detail = boundedText(value.input.detail, 16_384);
      return taskId && title && detail
        ? { type: value.type, input: { taskId, title, detail } }
        : undefined;
    }
    case "journey.edit": {
      const id = identifier(value.id);
      const patch = journeyPatch(value.patch);
      return hasExactKeys(value, ["type", "id", "patch"]) && id && patch
        ? { type: value.type, id, patch }
        : undefined;
    }
    case "phone.command": {
      const command = phoneCommand(value.command);
      const target = value.target === undefined ? undefined : identifier(value.target);
      const expectedKeys =
        target === undefined ? ["type", "command"] : ["type", "command", "target"];
      if (
        !command ||
        !hasExactKeys(value, expectedKeys) ||
        (value.target !== undefined && !target)
      ) {
        return undefined;
      }
      return {
        type: value.type,
        command,
        ...(target ? { target } : {}),
      };
    }
    case "skill.save-draft": {
      const id = identifier(value.id);
      return hasExactKeys(value, ["type", "id", "instructions"]) &&
        id &&
        typeof value.instructions === "string" &&
        value.instructions.length <= 64_000
        ? { type: value.type, id, instructions: value.instructions }
        : undefined;
    }
    case "locale.set": {
      const locale = identifier(value.locale);
      return hasExactKeys(value, ["type", "locale"]) && locale
        ? { type: value.type, locale }
        : undefined;
    }
    case "trace.position": {
      const id = identifier(value.id);
      const step =
        typeof value.step === "number" && Number.isSafeInteger(value.step) ? value.step : undefined;
      return hasExactKeys(value, ["type", "id", "step"]) &&
        id &&
        step !== undefined &&
        step >= 0 &&
        step <= 10_000
        ? { type: value.type, id, step }
        : undefined;
    }
    case "monitor.set": {
      const id = identifier(value.id);
      return hasExactKeys(value, ["type", "id", "enabled"]) &&
        id &&
        typeof value.enabled === "boolean"
        ? { type: value.type, id, enabled: value.enabled }
        : undefined;
    }
    default:
      return undefined;
  }
}

export function performControlAction(
  owners: KakiRuntimeOwners,
  action: KakiControlAction,
  signal: AbortSignal,
  actorPersonId: string,
): Promise<OwnerActionResult> {
  switch (action.type) {
    case "system.pause":
      return owners.system.setPaused(action.paused, signal);
    case "approval.decide":
      return owners.approvals.decide(
        {
          id: action.id,
          decision: action.decision,
          actorPersonId,
          factsHash: action.factsHash,
        },
        signal,
      );
    case "household.edit":
      return owners.household.edit(action.id, action.patch, signal);
    case "phone.command":
      return owners.phone.command(
        action.command === "tap-target"
          ? {
              command: action.command,
              ...(action.target ? { target: action.target } : {}),
            }
          : { command: action.command },
        signal,
      );
    case "journey.create":
      return owners.journeys.create(action.input, signal);
    case "journey.edit":
      return owners.journeys.edit(action.id, action.patch, signal);
    case "journey.delete":
      return owners.journeys.delete(action.id, signal);
    case "skill.save-draft":
      return owners.skills.saveDraft(action.id, action.instructions, signal);
    case "locale.set":
      return owners.locale.set(action.locale, signal);
    case "trace.position":
      return owners.traces.position(action.id, action.step, signal);
    case "monitor.set":
      return owners.monitors.set(action.id, action.enabled, signal);
  }
}
