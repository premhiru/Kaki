export type ApprovalDecision = "approved" | "denied";

export type KakiControlSnapshot = Readonly<{
  householdName: string;
  operatorName: string;
  paused: boolean;
  health: Readonly<{ state: "steady" | "degraded"; checkedAt: string }>;
  household: readonly HouseholdMember[];
  approvals: readonly ApprovalItem[];
  phone: PhoneSnapshot;
  journey: readonly JourneyItem[];
  skills: readonly SkillItem[];
  locale: LocaleSnapshot;
  cost: CostSnapshot;
  traces: readonly TraceItem[];
  monitors: readonly MonitorItem[];
}>;

export type HouseholdMember = Readonly<{
  id: string;
  initials: string;
  name: string;
  relation: string;
  language: string;
  detail: string;
}>;

export type HouseholdMemberPatch = Readonly<{
  name?: string;
  relation?: string;
  languages?: readonly string[];
  register?: string;
  dietary?: readonly string[];
  commute?: readonly string[];
}>;

export type ApprovalItem = Readonly<{
  id: string;
  factsHash: string;
  title: string;
  detail: string;
  amount: string;
  evidence: string;
  state: "pending" | ApprovalDecision;
}>;

export type PhoneSnapshot = Readonly<{
  connected: boolean;
  name: string;
  batteryPercent?: number;
  frameUrl?: string;
  summary: string;
}>;

export type JourneyItem = Readonly<{
  id: string;
  time: string;
  title: string;
  detail: string;
}>;

export type JourneyCreateInput = Readonly<{
  taskId: string;
  title: string;
  detail: string;
}>;

export type JourneyPatch = Readonly<{ title?: string; detail?: string }>;

export type SkillItem = Readonly<{
  id: string;
  source: "maintained" | "learned" | "phone";
  instructions: string;
}>;

export type LocaleSnapshot = Readonly<{
  active: string;
  available: readonly string[];
  preview: string;
  currency: string;
  timeZone: string;
}>;

export type CostSnapshot = Readonly<{
  month: string;
  today: string;
  localShare: string;
  budgetRemaining: string;
}>;

export type TraceItem = Readonly<{
  id: string;
  title: string;
  steps: readonly Readonly<{ title: string; evidence: string }>[];
}>;

export type MonitorItem = Readonly<{
  id: string;
  title: string;
  detail: string;
  status: string;
  enabled: boolean;
}>;

export type AutomationItem = Readonly<{
  id: string;
  title: string;
  status: string;
  nextRun: string;
}>;

export type PhoneCommand =
  | Readonly<{
      command: "screenshot" | "back" | "home" | "refresh-tree" | "relaunch";
    }>
  | Readonly<{ command: "tap-target"; target?: string }>;

export type KakiControlAction =
  | Readonly<{ type: "system.pause"; paused: boolean }>
  | Readonly<{
      type: "approval.decide";
      id: string;
      decision: ApprovalDecision;
      factsHash: string;
    }>
  | Readonly<{ type: "household.edit"; id: string; patch: HouseholdMemberPatch }>
  | Readonly<{
      type: "phone.command";
      command: PhoneCommand["command"];
      target?: string;
    }>
  | Readonly<{ type: "journey.create"; input: JourneyCreateInput }>
  | Readonly<{ type: "journey.edit"; id: string; patch: JourneyPatch }>
  | Readonly<{ type: "journey.delete"; id: string }>
  | Readonly<{ type: "skill.save-draft"; id: string; instructions: string }>
  | Readonly<{ type: "locale.set"; locale: string }>
  | Readonly<{ type: "trace.position"; id: string; step: number }>
  | Readonly<{ type: "monitor.set"; id: string; enabled: boolean }>;

export type OwnerActionResult = Readonly<{
  ok: boolean;
  message: string;
  approvalGrantId?: string;
}>;

export type ApprovalDecisionInput = Readonly<{
  id: string;
  decision: ApprovalDecision;
  actorPersonId: string;
  factsHash: string;
}>;

export type KakiControlOutcome = OwnerActionResult & Readonly<{ snapshot?: KakiControlSnapshot }>;

export interface KakiRuntimeOwners {
  readonly system: {
    snapshot(signal: AbortSignal): Promise<{
      householdName: unknown;
      operatorName: unknown;
      paused: unknown;
      health: unknown;
    }>;
    setPaused(paused: boolean, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly household: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    edit(id: string, patch: HouseholdMemberPatch, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly approvals: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    decide(input: ApprovalDecisionInput, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly phone: {
    snapshot(signal: AbortSignal): Promise<unknown>;
    command(command: PhoneCommand, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly journeys: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    create(input: JourneyCreateInput, signal: AbortSignal): Promise<OwnerActionResult>;
    edit(id: string, patch: JourneyPatch, signal: AbortSignal): Promise<OwnerActionResult>;
    delete(id: string, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly skills: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    saveDraft(id: string, instructions: string, signal: AbortSignal): Promise<OwnerActionResult>;
    execute(
      input: Readonly<{
        skillId: string;
        values: Readonly<Record<string, unknown>>;
        sessionKey: string;
        approvalGrantId?: string;
        approvalAmount?: Readonly<{ currency: string; minorUnits: number }>;
        knownPayee?: boolean;
      }>,
      signal: AbortSignal,
    ): Promise<unknown>;
  };
  readonly locale: {
    snapshot(signal: AbortSignal): Promise<unknown>;
    set(locale: string, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly costs: {
    snapshot(signal: AbortSignal): Promise<unknown>;
  };
  readonly traces: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    position(id: string, step: number, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly monitors: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
    set(id: string, enabled: boolean, signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly channels: {
    relinkWhatsApp(signal: AbortSignal): Promise<OwnerActionResult>;
  };
  readonly automation: {
    list(signal: AbortSignal): Promise<readonly unknown[]>;
  };
}
