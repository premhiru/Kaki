import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import type {
  AutomationItem,
  ApprovalItem,
  CostSnapshot,
  HouseholdMember,
  JourneyItem,
  KakiControlSnapshot,
  LocaleSnapshot,
  MonitorItem,
  OwnerActionResult,
  PhoneSnapshot,
  SkillItem,
  TraceItem,
} from "./contracts.js";

const SENSITIVE_ASSIGNMENT =
  /(?:authorization|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|cookie|otp)\s*[:=]\s*\S+/i;

function displayString(value: unknown, label: string, maxLength = 4_000): string {
  if (typeof value !== "string" || value.length > maxLength) throw new Error(label);
  if (value.startsWith("data:image/") || SENSITIVE_ASSIGNMENT.test(value)) {
    throw new Error(`${label}-sensitive`);
  }
  return value;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label);
  return value;
}

function array(value: unknown, label: string, maxItems: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(label);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(label);
  return value;
}

function factsHash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error("invalid-approval-facts-hash");
  }
  return value;
}

export function projectHousehold(value: unknown): HouseholdMember {
  const row = record(value, "invalid-household-member");
  return {
    id: displayString(row.id, "invalid-household-member", 256),
    initials: displayString(row.initials, "invalid-household-member", 16),
    name: displayString(row.name, "invalid-household-member", 256),
    relation: displayString(row.relation, "invalid-household-member", 128),
    language: displayString(row.language, "invalid-household-member", 128),
    detail: displayString(row.detail, "invalid-household-member"),
  };
}

export function projectApproval(value: unknown): ApprovalItem {
  const row = record(value, "invalid-approval");
  const state = displayString(row.state, "invalid-approval", 16);
  if (state !== "pending" && state !== "approved" && state !== "denied") {
    throw new Error("invalid-approval");
  }
  return {
    id: displayString(row.id, "invalid-approval", 256),
    factsHash: factsHash(row.factsHash),
    title: displayString(row.title, "invalid-approval"),
    detail: displayString(row.detail, "invalid-approval"),
    amount: displayString(row.amount, "invalid-approval", 128),
    evidence: displayString(row.evidence, "invalid-approval"),
    state,
  };
}

export function projectPhone(value: unknown): PhoneSnapshot {
  const row = record(value, "invalid-phone");
  let batteryPercent: number | undefined;
  if (row.batteryPercent !== undefined) {
    if (
      typeof row.batteryPercent !== "number" ||
      !Number.isFinite(row.batteryPercent) ||
      row.batteryPercent < 0 ||
      row.batteryPercent > 100
    ) {
      throw new Error("invalid-phone");
    }
    batteryPercent = row.batteryPercent;
  }
  let frameUrl: string | undefined;
  if (row.frameUrl !== undefined) {
    frameUrl = displayString(row.frameUrl, "invalid-phone", 2_000);
    if (!frameUrl.startsWith("/") || frameUrl.startsWith("//")) {
      throw new Error("invalid-phone-frame-url");
    }
  }
  return {
    connected: boolean(row.connected, "invalid-phone"),
    name: displayString(row.name, "invalid-phone", 256),
    ...(batteryPercent === undefined ? {} : { batteryPercent }),
    ...(frameUrl === undefined ? {} : { frameUrl }),
    summary: displayString(row.summary, "invalid-phone"),
  };
}

export function projectJourney(value: unknown): JourneyItem {
  const row = record(value, "invalid-journey");
  return {
    id: displayString(row.id, "invalid-journey", 256),
    time: displayString(row.time, "invalid-journey", 128),
    title: displayString(row.title, "invalid-journey"),
    detail: displayString(row.detail, "invalid-journey"),
  };
}

export function projectSkill(value: unknown): SkillItem {
  const row = record(value, "invalid-skill");
  const source = displayString(row.source, "invalid-skill", 16);
  if (source !== "maintained" && source !== "learned" && source !== "phone") {
    throw new Error("invalid-skill");
  }
  return {
    id: displayString(row.id, "invalid-skill", 256),
    source,
    instructions: displayString(row.instructions, "invalid-skill", 64_000),
  };
}

export function projectLocale(value: unknown): LocaleSnapshot {
  const row = record(value, "invalid-locale");
  return {
    active: displayString(row.active, "invalid-locale", 32),
    available: array(row.available, "invalid-locale", 50).map((entry) =>
      displayString(entry, "invalid-locale", 32),
    ),
    preview: displayString(row.preview, "invalid-locale"),
    currency: displayString(row.currency, "invalid-locale", 16),
    timeZone: displayString(row.timeZone, "invalid-locale", 128),
  };
}

export function projectCost(value: unknown): CostSnapshot {
  const row = record(value, "invalid-cost");
  return {
    month: displayString(row.month, "invalid-cost", 128),
    today: displayString(row.today, "invalid-cost", 128),
    localShare: displayString(row.localShare, "invalid-cost", 128),
    budgetRemaining: displayString(row.budgetRemaining, "invalid-cost", 128),
  };
}

function projectTrace(value: unknown): TraceItem {
  const row = record(value, "invalid-trace");
  return {
    id: displayString(row.id, "invalid-trace", 256),
    title: displayString(row.title, "invalid-trace"),
    steps: array(row.steps, "invalid-trace", 100).map((value) => {
      const step = record(value, "invalid-trace-step");
      return {
        title: displayString(step.title, "invalid-trace-step"),
        evidence: displayString(step.evidence, "invalid-trace-step"),
      };
    }),
  };
}

function projectMonitor(value: unknown): MonitorItem {
  const row = record(value, "invalid-monitor");
  return {
    id: displayString(row.id, "invalid-monitor", 256),
    title: displayString(row.title, "invalid-monitor"),
    detail: displayString(row.detail, "invalid-monitor"),
    status: displayString(row.status, "invalid-monitor", 256),
    enabled: boolean(row.enabled, "invalid-monitor"),
  };
}

export function projectAutomation(value: unknown): AutomationItem {
  const row = record(value, "invalid-automation");
  return {
    id: displayString(row.id, "invalid-automation", 256),
    title: displayString(row.title, "invalid-automation"),
    status: displayString(row.status, "invalid-automation", 256),
    nextRun: displayString(row.nextRun, "invalid-automation", 128),
  };
}

export function projectActionResult(value: unknown): OwnerActionResult {
  const row = record(value, "invalid-action-result");
  const approvalGrantId =
    row.approvalGrantId === undefined
      ? undefined
      : displayString(row.approvalGrantId, "invalid-action-result", 256);
  return {
    ok: boolean(row.ok, "invalid-action-result"),
    message: displayString(row.message, "invalid-action-result"),
    ...(approvalGrantId ? { approvalGrantId } : {}),
  };
}

export function projectSnapshot(parts: {
  system: unknown;
  household: unknown;
  approvals: unknown;
  phone: unknown;
  journey: unknown;
  skills: unknown;
  locale: unknown;
  cost: unknown;
  traces: unknown;
  monitors: unknown;
}): KakiControlSnapshot {
  const system = record(parts.system, "invalid-system");
  const health = record(system.health, "invalid-system-health");
  const state = displayString(health.state, "invalid-system-health", 16);
  if (state !== "steady" && state !== "degraded") throw new Error("invalid-system-health");
  return {
    householdName: displayString(system.householdName, "invalid-system"),
    operatorName: displayString(system.operatorName, "invalid-system"),
    paused: boolean(system.paused, "invalid-system"),
    health: {
      state,
      checkedAt: displayString(health.checkedAt, "invalid-system-health", 128),
    },
    household: array(parts.household, "invalid-household", 100).map(projectHousehold),
    approvals: array(parts.approvals, "invalid-approvals", 100).map(projectApproval),
    phone: projectPhone(parts.phone),
    journey: array(parts.journey, "invalid-journeys", 500).map(projectJourney),
    skills: array(parts.skills, "invalid-skills", 200).map(projectSkill),
    locale: projectLocale(parts.locale),
    cost: projectCost(parts.cost),
    traces: array(parts.traces, "invalid-traces", 100).map(projectTrace),
    monitors: array(parts.monitors, "invalid-monitors", 500).map(projectMonitor),
  };
}
