export type ApprovalDecision = "approved" | "denied";

export interface HouseholdMember {
  readonly id: string;
  readonly initials: string;
  readonly name: string;
  readonly relation: string;
  readonly language: string;
  readonly detail: string;
}

export interface ApprovalItem {
  readonly id: string;
  readonly factsHash: string;
  readonly title: string;
  readonly detail: string;
  readonly amount: string;
  readonly evidence: string;
  readonly state: "pending" | ApprovalDecision;
}

export interface JourneyItem {
  readonly id: string;
  readonly time: string;
  readonly title: string;
  readonly detail: string;
}

export interface SkillItem {
  readonly id: string;
  readonly source: "maintained" | "learned" | "phone";
  readonly instructions: string;
}

export interface MonitorItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly status: string;
  readonly enabled: boolean;
}

export interface KakiControlSnapshot {
  readonly householdName: string;
  readonly operatorName: string;
  readonly paused: boolean;
  readonly health: { readonly state: "steady" | "degraded"; readonly checkedAt: string };
  readonly household: readonly HouseholdMember[];
  readonly approvals: readonly ApprovalItem[];
  readonly phone: {
    readonly connected: boolean;
    readonly name: string;
    readonly batteryPercent?: number;
    readonly frameUrl?: string;
    readonly summary: string;
  };
  readonly journey: readonly JourneyItem[];
  readonly skills: readonly SkillItem[];
  readonly locale: {
    readonly active: string;
    readonly available: readonly string[];
    readonly preview: string;
    readonly currency: string;
    readonly timeZone: string;
  };
  readonly cost: {
    readonly month: string;
    readonly today: string;
    readonly localShare: string;
    readonly budgetRemaining: string;
  };
  readonly traces: readonly {
    readonly id: string;
    readonly title: string;
    readonly steps: readonly { readonly title: string; readonly evidence: string }[];
  }[];
  readonly monitors: readonly MonitorItem[];
}

export type KakiControlAction =
  | { readonly type: "system.pause"; readonly paused: boolean }
  | {
      readonly type: "approval.decide";
      readonly id: string;
      readonly decision: ApprovalDecision;
      readonly factsHash: string;
    }
  | { readonly type: "household.edit"; readonly id: string }
  | {
      readonly type: "phone.command";
      readonly command: "screenshot" | "back" | "home" | "tap-target" | "refresh-tree" | "relaunch";
    }
  | { readonly type: "journey.edit"; readonly id: string }
  | { readonly type: "journey.delete"; readonly id: string }
  | { readonly type: "skill.save-draft"; readonly id: string; readonly instructions: string }
  | { readonly type: "locale.set"; readonly locale: string }
  | { readonly type: "trace.position"; readonly id: string; readonly step: number }
  | { readonly type: "monitor.set"; readonly id: string; readonly enabled: boolean };

export interface KakiControlOutcome {
  readonly ok: boolean;
  readonly message: string;
  readonly snapshot?: KakiControlSnapshot;
}

/** Injected by the authenticated OpenClaw Control UI host; no new Gateway wire method is defined here. */
export interface KakiGatewayClient {
  snapshot(): Promise<KakiControlSnapshot>;
  perform(action: KakiControlAction): Promise<KakiControlOutcome>;
  subscribe?(listener: (snapshot: KakiControlSnapshot) => void): () => void;
}

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_ACTION_BYTES = 100_000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Same-origin adapter for authenticated OpenClaw plugin HTTP routes. */
export class HttpKakiGatewayClient implements KakiGatewayClient {
  private readonly basePath: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(
    basePath = "/api/kaki",
    fetcher: typeof fetch = fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ) {
    if (!basePath.startsWith("/") || basePath.startsWith("//"))
      throw new Error("Kaki HTTP routes must stay on the authenticated origin.");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
      throw new Error("invalid-kaki-gateway-timeout");
    this.basePath = basePath;
    this.fetcher = fetcher;
    this.timeoutMs = timeoutMs;
  }

  async snapshot(): Promise<KakiControlSnapshot> {
    return parseSnapshot(await this.request("snapshot", { method: "GET" }));
  }

  async perform(action: KakiControlAction): Promise<KakiControlOutcome> {
    const body = JSON.stringify(action);
    if (new TextEncoder().encode(body).byteLength > MAX_ACTION_BYTES)
      throw new Error("Action exceeded the control-centre request limit.");
    const value = asRecord(
      await this.request("action", {
        method: "POST",
        headers: { "content-type": "application/json", "x-kaki-intent": "operator-action" },
        body,
      }),
      "invalid-action-outcome",
    );
    return {
      ok: asBoolean(value.ok, "invalid-action-outcome"),
      message: asBoundedString(value.message, "invalid-action-outcome"),
      ...(value.snapshot === undefined ? {} : { snapshot: parseSnapshot(value.snapshot) }),
    };
  }

  private async request(resource: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.basePath}/${resource}`, {
        ...init,
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json", ...init.headers },
        signal: controller.signal,
      });
      if (!response.ok) {
        const hint =
          response.status === 401 || response.status === 403
            ? "Open Kaki from the authenticated Gateway and verify operator access."
            : "Check Gateway status and retry.";
        throw new Error(`Gateway request failed (${response.status}). ${hint}`);
      }
      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES)
        throw new Error("Gateway response exceeded the control-centre limit.");
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES)
        throw new Error("Gateway response exceeded the control-centre limit.");
      return JSON.parse(text) as unknown;
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error("Gateway request timed out. Retry the action.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

declare global {
  interface Window {
    __KAKI_GATEWAY__?: KakiGatewayClient;
  }
}

export function currentKakiGatewayClient(): KakiGatewayClient | undefined {
  if (typeof window === "undefined") return undefined;
  return (window.__KAKI_GATEWAY__ ??= new HttpKakiGatewayClient());
}

export function resolveTrustedPhoneFrameUrl(
  value: string | undefined,
  currentUrl: string,
): string | undefined {
  if (!value) return undefined;
  try {
    const current = new URL(currentUrl);
    const url = new URL(value, current);
    return url.origin === current.origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function parseSnapshot(value: unknown): KakiControlSnapshot {
  const input = asRecord(value, "invalid-control-snapshot");
  const phone = asRecord(input.phone, "invalid-control-snapshot");
  const locale = asRecord(input.locale, "invalid-control-snapshot");
  const cost = asRecord(input.cost, "invalid-control-snapshot");
  const health = asRecord(input.health, "invalid-control-snapshot");
  const healthState = asBoundedString(health.state, "invalid-control-snapshot");
  if (healthState !== "steady" && healthState !== "degraded")
    throw new Error("invalid-control-snapshot");
  return {
    householdName: asBoundedString(input.householdName, "invalid-control-snapshot"),
    operatorName: asBoundedString(input.operatorName, "invalid-control-snapshot"),
    paused: asBoolean(input.paused, "invalid-control-snapshot"),
    health: {
      state: healthState,
      checkedAt: asBoundedString(health.checkedAt, "invalid-control-snapshot"),
    },
    household: asArray(input.household, "invalid-control-snapshot").map((item) => {
      const record = asRecord(item, "invalid-control-snapshot");
      return {
        id: asBoundedString(record.id, "invalid-control-snapshot"),
        initials: asBoundedString(record.initials, "invalid-control-snapshot"),
        name: asBoundedString(record.name, "invalid-control-snapshot"),
        relation: asBoundedString(record.relation, "invalid-control-snapshot"),
        language: asBoundedString(record.language, "invalid-control-snapshot"),
        detail: asBoundedString(record.detail, "invalid-control-snapshot"),
      };
    }),
    approvals: asArray(input.approvals, "invalid-control-snapshot").map(parseApproval),
    phone: {
      connected: asBoolean(phone.connected, "invalid-control-snapshot"),
      name: asBoundedString(phone.name, "invalid-control-snapshot"),
      ...(phone.batteryPercent === undefined
        ? {}
        : { batteryPercent: asPercent(phone.batteryPercent) }),
      ...(phone.frameUrl === undefined
        ? {}
        : { frameUrl: asBoundedString(phone.frameUrl, "invalid-control-snapshot") }),
      summary: asBoundedString(phone.summary, "invalid-control-snapshot"),
    },
    journey: asArray(input.journey, "invalid-control-snapshot").map((item) => {
      const record = asRecord(item, "invalid-control-snapshot");
      return {
        id: asBoundedString(record.id, "invalid-control-snapshot"),
        time: asBoundedString(record.time, "invalid-control-snapshot"),
        title: asBoundedString(record.title, "invalid-control-snapshot"),
        detail: asBoundedString(record.detail, "invalid-control-snapshot"),
      };
    }),
    skills: asArray(input.skills, "invalid-control-snapshot").map((item) => {
      const record = asRecord(item, "invalid-control-snapshot");
      const source = asBoundedString(record.source, "invalid-control-snapshot");
      if (source !== "maintained" && source !== "learned" && source !== "phone")
        throw new Error("invalid-control-snapshot");
      return {
        id: asBoundedString(record.id, "invalid-control-snapshot"),
        source,
        instructions: asBoundedString(record.instructions, "invalid-control-snapshot", 64_000),
      };
    }),
    locale: {
      active: asBoundedString(locale.active, "invalid-control-snapshot"),
      available: asArray(locale.available, "invalid-control-snapshot").map((item) =>
        asBoundedString(item, "invalid-control-snapshot"),
      ),
      preview: asBoundedString(locale.preview, "invalid-control-snapshot"),
      currency: asBoundedString(locale.currency, "invalid-control-snapshot"),
      timeZone: asBoundedString(locale.timeZone, "invalid-control-snapshot"),
    },
    cost: {
      month: asBoundedString(cost.month, "invalid-control-snapshot"),
      today: asBoundedString(cost.today, "invalid-control-snapshot"),
      localShare: asBoundedString(cost.localShare, "invalid-control-snapshot"),
      budgetRemaining: asBoundedString(cost.budgetRemaining, "invalid-control-snapshot"),
    },
    traces: asArray(input.traces, "invalid-control-snapshot").map((item) => {
      const record = asRecord(item, "invalid-control-snapshot");
      return {
        id: asBoundedString(record.id, "invalid-control-snapshot"),
        title: asBoundedString(record.title, "invalid-control-snapshot"),
        steps: asArray(record.steps, "invalid-control-snapshot").map((step) => {
          const entry = asRecord(step, "invalid-control-snapshot");
          return {
            title: asBoundedString(entry.title, "invalid-control-snapshot"),
            evidence: asBoundedString(entry.evidence, "invalid-control-snapshot"),
          };
        }),
      };
    }),
    monitors: asArray(input.monitors, "invalid-control-snapshot").map((item) => {
      const record = asRecord(item, "invalid-control-snapshot");
      return {
        id: asBoundedString(record.id, "invalid-control-snapshot"),
        title: asBoundedString(record.title, "invalid-control-snapshot"),
        detail: asBoundedString(record.detail, "invalid-control-snapshot"),
        status: asBoundedString(record.status, "invalid-control-snapshot"),
        enabled: asBoolean(record.enabled, "invalid-control-snapshot"),
      };
    }),
  };
}

function parseApproval(value: unknown): ApprovalItem {
  const record = asRecord(value, "invalid-control-snapshot");
  const state = asBoundedString(record.state, "invalid-control-snapshot");
  if (state !== "pending" && state !== "approved" && state !== "denied")
    throw new Error("invalid-control-snapshot");
  return {
    id: asBoundedString(record.id, "invalid-control-snapshot"),
    factsHash: asFactsHash(record.factsHash),
    title: asBoundedString(record.title, "invalid-control-snapshot"),
    detail: asBoundedString(record.detail, "invalid-control-snapshot"),
    amount: asBoundedString(record.amount, "invalid-control-snapshot"),
    evidence: asBoundedString(record.evidence, "invalid-control-snapshot"),
    state,
  };
}

function asFactsHash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    throw new Error("invalid-control-snapshot");
  return value;
}

function asRecord(value: unknown, error: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(error);
  return value as Record<string, unknown>;
}

function asArray(value: unknown, error: string): unknown[] {
  if (!Array.isArray(value) || value.length > 1_000) throw new Error(error);
  return value;
}

function asBoolean(value: unknown, error: string): boolean {
  if (typeof value !== "boolean") throw new Error(error);
  return value;
}

function asBoundedString(value: unknown, error: string, maxLength = 4_000): string {
  if (typeof value !== "string" || value.length > maxLength) throw new Error(error);
  return value;
}

function asPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)
    throw new Error("invalid-control-snapshot");
  return value;
}
