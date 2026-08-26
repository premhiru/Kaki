import { type ApprovalCreateInput, ApprovalEngine, type RiskCategory } from "@kaki/approval-node";
import type {
  SkillApprovalAuthority,
  SkillApprovalPreparation,
  SkillApprovalRequest,
} from "@kaki/skills";

function category(value: string): RiskCategory {
  switch (value) {
    case "message.household":
    case "message.external":
    case "money.transfer":
    case "money.purchase":
    case "booking":
    case "gov.singpass":
    case "account.change":
    case "data.share":
    case "data.read":
    case "none":
      return value;
    default:
      throw new Error("skill-approval-category-invalid");
  }
}

function approvalAmount(
  amount: SkillApprovalPreparation["amount"],
): ApprovalCreateInput["amount"] | undefined {
  if (!amount) return undefined;
  switch (amount.currency) {
    case "SGD":
    case "MYR":
    case "IDR":
    case "THB":
    case "VND":
    case "PHP":
    case "USD":
      break;
    default:
      throw new Error("skill-approval-amount-invalid");
  }
  if (!Number.isSafeInteger(amount.minorUnits) || amount.minorUnits < 0) {
    throw new Error("skill-approval-amount-invalid");
  }
  return amount;
}

function materialFacts(request: SkillApprovalPreparation) {
  return {
    skillId: request.skillId,
    category: request.category,
    householdId: request.householdId,
    personId: request.personId,
    approvalActionId: request.approvalActionId,
    commitActionId: request.commitActionId,
    commitTarget: request.commitTarget,
    materialFingerprint: request.materialFingerprint,
    ...(request.amount ? { amount: request.amount } : {}),
    ...(request.knownPayee !== undefined ? { knownPayee: request.knownPayee } : {}),
  } as const;
}

function taskId(request: SkillApprovalPreparation): string {
  return `skill:${request.skillId}:${request.materialFingerprint}`;
}

/** Bridges skill preparation/resume to exact ApprovalEngine card and grant owners. */
export class KakiSkillApprovalAuthority implements SkillApprovalAuthority {
  public constructor(private readonly engine: ApprovalEngine) {}

  async prepare(request: SkillApprovalPreparation, summary: string) {
    const amount = approvalAmount(request.amount);
    if (request.category.startsWith("money.") && !amount) {
      throw new Error("skill-approval-amount-required");
    }
    const input: ApprovalCreateInput = {
      taskId: taskId(request),
      stepId: request.approvalActionId,
      householdId: request.householdId,
      requestedByPersonId: request.personId,
      category: category(request.category),
      title: `Approve ${request.skillId}`,
      summary,
      materialFacts: materialFacts(request),
      ...(amount ? { amount } : {}),
      ...(request.knownPayee !== undefined ? { knownPayee: request.knownPayee } : {}),
      evidence: [{ kind: "text", value: `Commit target: ${request.commitTarget}` }],
    };
    const authorization = await this.engine.authorize(input);
    return authorization.status === "approval_required"
      ? { status: "approval_required" as const, approvalCardId: authorization.card.id }
      : { status: "authorized" as const, grantId: authorization.grant.id };
  }

  async consumeAndExecute<T>(request: SkillApprovalRequest, execute: () => Promise<T>) {
    const preparation: SkillApprovalPreparation = request;
    try {
      await this.engine.consumeGrant(request.grantId, {
        householdId: request.householdId,
        taskId: taskId(preparation),
        stepId: request.approvalActionId,
        materialFacts: { ...materialFacts(preparation), category: category(request.category) },
      });
    } catch (error) {
      return {
        status: "rejected" as const,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    return { status: "approved" as const, value: await execute() };
  }
}
