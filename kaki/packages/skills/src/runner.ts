import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import generatedCatalogue from "./catalogue.generated.json" with { type: "json" };

export type SkillActionSurface = "approval" | "browser" | "channel" | "data" | "phone";

export interface SkillAction {
  readonly id: string;
  readonly surface: SkillActionSurface;
  readonly operation: string;
  readonly target: string;
  readonly produces: string;
}

export interface SkillDefinition {
  readonly id: string;
  readonly scope: string;
  readonly slug: string;
  readonly title: string;
  readonly provider: string;
  readonly surface: string;
  readonly approval: string;
  readonly requiredInputs: readonly string[];
  readonly actions: readonly SkillAction[];
  readonly checks: readonly string[];
  readonly result: string;
}

export interface SkillFixture {
  readonly skillId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly context: { readonly locale: string; readonly fixture: boolean };
  readonly expect: {
    readonly status: "completed" | "needs_approval";
    readonly approval: string;
    readonly actionIds: readonly string[];
    readonly evidence: readonly string[];
  };
}

export interface SkillRunResult {
  readonly skillId: string;
  readonly fixture: true;
  readonly status: "completed" | "needs_approval";
  readonly approval: string;
  readonly actionIds: readonly string[];
  readonly evidence: readonly string[];
  readonly sideEffects: 0;
}

export interface ProductionSkillContext {
  readonly householdId: string;
  readonly personId: string;
  readonly locale: string;
  readonly approvalAmount?: Readonly<{ currency: string; minorUnits: number }>;
  readonly knownPayee?: boolean;
}

export interface SkillActionOutcome {
  readonly evidence: string;
  readonly summary?: string;
}

export interface SkillActionDispatcher {
  dispatch(
    action: SkillAction,
    input: Readonly<Record<string, unknown>>,
    context: ProductionSkillContext,
  ): Promise<SkillActionOutcome>;
}

export interface SkillApprovalRequest {
  readonly grantId: string;
  readonly skillId: string;
  readonly category: string;
  readonly householdId: string;
  readonly personId: string;
  readonly approvalActionId: string;
  readonly commitActionId: string;
  readonly commitTarget: string;
  readonly materialFingerprint: string;
  readonly amount?: Readonly<{ currency: string; minorUnits: number }>;
  readonly knownPayee?: boolean;
}

export type SkillApprovalPreparation = Omit<SkillApprovalRequest, "grantId">;

export type SkillApprovalPreparationResult =
  | { readonly status: "approval_required"; readonly approvalCardId: string }
  | { readonly status: "authorized"; readonly grantId: string };

export type SkillApprovalConsumption<T> =
  | { readonly status: "approved"; readonly value: T }
  | { readonly status: "rejected"; readonly reason: string };

export interface SkillApprovalAuthority {
  prepare(
    request: SkillApprovalPreparation,
    summary: string,
  ): Promise<SkillApprovalPreparationResult>;
  /**
   * The approval owner must atomically revalidate and consume its authoritative approval row before
   * invoking execute. It must reject stale, copied, mutated, already-consumed, or wrong-owner rows.
   */
  consumeAndExecute<T>(
    request: SkillApprovalRequest,
    execute: () => Promise<T>,
  ): Promise<SkillApprovalConsumption<T>>;
}

export interface ProductionSkillResult {
  readonly skillId: string;
  readonly status: "completed" | "needs_approval";
  readonly approval: string;
  readonly completedActions: readonly string[];
  readonly evidence: readonly string[];
  readonly summary: string;
  readonly approvalRequest?: Readonly<{
    approvalCardId: string;
    category: string;
    materialFingerprint: string;
    approvalActionId: string;
    commitActionId: string;
    commitTarget: string;
  }>;
}

export type SkillRunner = (options?: { fixturePath?: string }) => Promise<SkillRunResult>;

const definitions: ReadonlyMap<string, SkillDefinition> = new Map(
  generatedCatalogue.map((definition) => [definition.id, definition as SkillDefinition]),
);

export function getSkillDefinition(skillId: string): SkillDefinition {
  const definition = definitions.get(skillId);
  if (!definition) throw new Error(`Unknown Kaki skill: ${skillId}`);
  return definition;
}

/**
 * Runs a generated playbook through its declared OpenClaw-owned surfaces. The injected dispatcher
 * is the only effect boundary; this package never imports a browser, channel, data, or phone owner.
 */
export async function executeSkill(
  skillId: string,
  input: Readonly<Record<string, unknown>>,
  context: ProductionSkillContext,
  dispatcher: SkillActionDispatcher,
  approvalAuthority?: SkillApprovalAuthority,
  approvalGrantId?: string,
): Promise<ProductionSkillResult> {
  const definition = getSkillDefinition(skillId);
  const materialFingerprint = fingerprintMaterialFacts(input);
  validateInputs(definition, input);
  const completedActions: string[] = [];
  const evidence: string[] = [];
  let pendingApproval: SkillAction | undefined;
  let activeGrantId = approvalGrantId;

  for (const action of definition.actions) {
    if (action.surface === "approval") {
      pendingApproval = action;
      continue;
    }
    if (pendingApproval && !activeGrantId) {
      if (fingerprintMaterialFacts(input) !== materialFingerprint) {
        return {
          skillId,
          status: "needs_approval",
          approval: definition.approval,
          completedActions,
          evidence,
          summary: "Approval was not created because material facts changed during preparation.",
        };
      }
      const preparation = approvalRequest(
        definition,
        pendingApproval,
        action,
        materialFingerprint,
        context,
      );
      const summary = `Prepared ${definition.result}; approval is required before ${action.target}.`;
      if (!approvalAuthority) {
        return {
          skillId,
          status: "needs_approval",
          approval: definition.approval,
          completedActions,
          evidence,
          summary,
        };
      }
      const authorization = await approvalAuthority.prepare(preparation, summary);
      if (authorization.status === "approval_required") {
        return {
          skillId,
          status: "needs_approval",
          approval: definition.approval,
          completedActions,
          evidence,
          summary,
          approvalRequest: {
            approvalCardId: authorization.approvalCardId,
            category: preparation.category,
            materialFingerprint: preparation.materialFingerprint,
            approvalActionId: preparation.approvalActionId,
            commitActionId: preparation.commitActionId,
            commitTarget: preparation.commitTarget,
          },
        };
      }
      activeGrantId = authorization.grantId;
    }
    const outcome = pendingApproval
      ? await consumeApprovalAndDispatch(
          definition,
          pendingApproval,
          action,
          input,
          materialFingerprint,
          context,
          dispatcher,
          approvalAuthority,
          activeGrantId,
        )
      : await dispatcher.dispatch(action, input, context);
    if ("reason" in outcome) {
      return {
        skillId,
        status: "needs_approval",
        approval: definition.approval,
        completedActions,
        evidence,
        summary: `Approval was rejected before ${action.target}: ${outcome.reason}`,
      };
    }
    if (!outcome.evidence.trim()) throw new Error(`Action ${action.id} returned empty evidence`);
    if (pendingApproval) {
      completedActions.push(pendingApproval.id);
      evidence.push(`approval:${definition.approval}`);
      pendingApproval = undefined;
      activeGrantId = undefined;
    }
    completedActions.push(action.id);
    evidence.push(outcome.evidence);
  }

  return {
    skillId,
    status: "completed",
    approval: definition.approval,
    completedActions,
    evidence,
    summary: definition.result,
  };
}

/**
 * Defines a deterministic zero-effect fixture runner. Expected fixture output is deliberately not
 * read here: the result is derived from the generated action plan so fixtures cannot self-certify.
 */
export function defineSkill(moduleUrl: string, skillId: string): SkillRunner {
  const run: SkillRunner = async (options = {}) => {
    const moduleDirectory = dirname(fileURLToPath(moduleUrl));
    const fixturePath = options.fixturePath
      ? resolve(options.fixturePath)
      : resolve(moduleDirectory, "fixtures", "happy.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as SkillFixture;
    if (fixture.skillId !== skillId) {
      throw new Error(`Fixture ${fixturePath} belongs to ${fixture.skillId}, expected ${skillId}`);
    }
    if (!fixture.context.fixture) throw new Error("Fixture runner requires fixture mode");
    const definition = getSkillDefinition(skillId);
    validateInputs(definition, fixture.input);
    const approvalIndex = definition.actions.findIndex((action) => action.surface === "approval");
    const visibleActions =
      approvalIndex < 0 ? definition.actions : definition.actions.slice(0, approvalIndex);
    return {
      skillId,
      fixture: true,
      status: approvalIndex < 0 ? "completed" : "needs_approval",
      approval: definition.approval,
      actionIds: visibleActions.map((action) => action.id),
      evidence: visibleActions.map(
        (action) => `${action.surface}:${action.operation}:${action.produces}`,
      ),
      sideEffects: 0,
    };
  };
  if (isMain(moduleUrl)) {
    void run(process.argv[2] ? { fixturePath: process.argv[2] } : {}).then(
      (result) => console.log(JSON.stringify(result, null, 2)),
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      },
    );
  }
  return run;
}

function validateInputs(
  definition: SkillDefinition,
  input: Readonly<Record<string, unknown>>,
): void {
  for (const name of definition.requiredInputs) {
    const value = input[name];
    if (value === undefined || value === null || value === "") {
      throw new Error(`${definition.id} requires input: ${name}`);
    }
  }
}

async function consumeApprovalAndDispatch(
  definition: SkillDefinition,
  approvalAction: SkillAction,
  commitAction: SkillAction,
  input: Readonly<Record<string, unknown>>,
  admittedMaterialFingerprint: string,
  context: ProductionSkillContext,
  dispatcher: SkillActionDispatcher,
  authority: SkillApprovalAuthority | undefined,
  grantId: string | undefined,
): Promise<SkillActionOutcome | { readonly reason: string }> {
  if (!authority || !grantId)
    throw new Error("Approval authority and grant id are required for a commit action");
  const currentMaterialFingerprint = fingerprintMaterialFacts(input);
  if (currentMaterialFingerprint !== admittedMaterialFingerprint) {
    return { reason: "material facts changed during preparation" };
  }
  const request: SkillApprovalRequest = {
    grantId,
    skillId: definition.id,
    category: definition.approval,
    householdId: context.householdId,
    personId: context.personId,
    approvalActionId: approvalAction.id,
    commitActionId: commitAction.id,
    commitTarget: commitAction.target,
    materialFingerprint: admittedMaterialFingerprint,
    ...(context.approvalAmount ? { amount: context.approvalAmount } : {}),
    ...(context.knownPayee !== undefined ? { knownPayee: context.knownPayee } : {}),
  };
  const consumed = await authority.consumeAndExecute(request, () =>
    dispatcher.dispatch(commitAction, input, context),
  );
  return consumed.status === "approved" ? consumed.value : { reason: consumed.reason };
}

function approvalRequest(
  definition: SkillDefinition,
  approvalAction: SkillAction,
  commitAction: SkillAction,
  materialFingerprint: string,
  context: ProductionSkillContext,
): SkillApprovalPreparation {
  return {
    skillId: definition.id,
    category: definition.approval,
    householdId: context.householdId,
    personId: context.personId,
    approvalActionId: approvalAction.id,
    commitActionId: commitAction.id,
    commitTarget: commitAction.target,
    materialFingerprint,
    ...(context.approvalAmount ? { amount: context.approvalAmount } : {}),
    ...(context.knownPayee !== undefined ? { knownPayee: context.knownPayee } : {}),
  };
}

function fingerprintMaterialFacts(input: Readonly<Record<string, unknown>>): string {
  return createHash("sha256").update(canonicalize(input)).digest("hex");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Skill input contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return canonicalizeArray(value);
  if (typeof value !== "object") throw new Error("Skill input must contain JSON-compatible values");
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Skill input must be a plain record");
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error("Skill input symbol properties are not allowed");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  return `{${keys
    .map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable) throw new Error("Skill input properties must be enumerable");
      if (!("value" in descriptor)) throw new Error("Skill input accessors are not allowed");
      return `${JSON.stringify(key)}:${canonicalize(descriptor.value)}`;
    })
    .join(",")}}`;
}

function canonicalizeArray(value: readonly unknown[]): string {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error("Skill input symbol properties are not allowed");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new Error("Skill input arrays must be dense data arrays");
    }
    entries.push(canonicalize(descriptor.value));
  }
  const extraKeys = Object.keys(descriptors).filter(
    (key) => key !== "length" && !/^(0|[1-9]\d*)$/u.test(key),
  );
  if (extraKeys.length > 0) throw new Error("Skill input arrays cannot have extra properties");
  return `[${entries.join(",")}]`;
}

function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(resolve(entry)).href === moduleUrl);
}
