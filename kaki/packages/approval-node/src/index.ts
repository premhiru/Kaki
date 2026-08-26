import type {
  ApprovalCard as CoreApprovalCard,
  ApprovalChoice,
  ApprovalGrant,
  ApprovalStatus,
  EvidenceRef,
  JsonObject,
  Money,
  RiskCategory,
} from "@kaki/core";
import { hashMaterialFacts, PolicyEngine, type PolicyContext } from "@kaki/security";

export type {
  ApprovalChoice,
  ApprovalGrant,
  ApprovalStatus,
  PolicyDecision,
  RiskCategory,
} from "@kaki/core";
export { hashMaterialFacts } from "@kaki/security";
export type ApprovalCard = CoreApprovalCard;

export type ApprovalAuditAction =
  | "created"
  | "approved"
  | "denied"
  | "expired"
  | "repinged"
  | "grant_consumed"
  | "replay_rejected"
  | "mutation_rejected"
  | "unauthorized_rejected";
export interface ApprovalAuditEvent {
  readonly id: string;
  readonly cardId: string;
  readonly taskId: string;
  readonly householdId: string;
  readonly action: ApprovalAuditAction;
  readonly actorPersonId?: string;
  readonly occurredAt: string;
  readonly factsHash: string;
  readonly reason?: string;
}
interface StoredGrant {
  readonly grant: ApprovalGrant;
  readonly consumedAt?: string;
}

export interface ApprovalLedger {
  put(card: ApprovalCard): Promise<void>;
  get(id: string): Promise<ApprovalCard | undefined>;
  compareAndSwap(id: string, expected: ApprovalStatus, next: ApprovalCard): Promise<boolean>;
  pending(householdId: string): Promise<readonly ApprovalCard[]>;
  due(now: string): Promise<readonly ApprovalCard[]>;
  appendAudit(event: ApprovalAuditEvent): Promise<void>;
  audit(cardId: string): Promise<readonly ApprovalAuditEvent[]>;
  putGrant(record: StoredGrant): Promise<void>;
  getGrant(id: string): Promise<StoredGrant | undefined>;
  consumeGrant(id: string, consumedAt: string): Promise<boolean>;
}

export class MemoryApprovalLedger implements ApprovalLedger {
  private readonly cards = new Map<string, ApprovalCard>();
  private readonly events: ApprovalAuditEvent[] = [];
  private readonly grants = new Map<string, StoredGrant>();
  async put(card: ApprovalCard) {
    if (this.cards.has(card.id)) throw new Error("approval-id-conflict");
    this.cards.set(card.id, structuredClone(card));
  }
  async get(id: string) {
    const card = this.cards.get(id);
    return card ? structuredClone(card) : undefined;
  }
  async compareAndSwap(id: string, expected: ApprovalStatus, next: ApprovalCard) {
    const current = this.cards.get(id);
    if (!current || current.status !== expected) return false;
    this.cards.set(id, structuredClone(next));
    return true;
  }
  async pending(householdId: string) {
    return [...this.cards.values()]
      .filter((card) => card.householdId === householdId && card.status === "pending")
      .map((card) => structuredClone(card));
  }
  async due(now: string) {
    return [...this.cards.values()]
      .filter((card) => card.status === "pending" && card.expiresAt <= now)
      .map((card) => structuredClone(card));
  }
  async appendAudit(event: ApprovalAuditEvent) {
    this.events.push(structuredClone(event));
  }
  async audit(cardId: string) {
    return this.events
      .filter((event) => event.cardId === cardId)
      .map((event) => structuredClone(event));
  }
  async putGrant(record: StoredGrant) {
    if (this.grants.has(record.grant.id)) throw new Error("approval-grant-id-conflict");
    this.grants.set(record.grant.id, structuredClone(record));
  }
  async getGrant(id: string) {
    const record = this.grants.get(id);
    return record ? structuredClone(record) : undefined;
  }
  async consumeGrant(id: string, consumedAt: string) {
    const record = this.grants.get(id);
    if (!record || record.consumedAt) return false;
    this.grants.set(id, { grant: record.grant, consumedAt });
    return true;
  }
}

export interface ApprovalCreateInput {
  readonly taskId: string;
  readonly householdId: string;
  readonly title: string;
  readonly summary: string;
  readonly category: RiskCategory;
  readonly traceId?: string;
  readonly stepId?: string;
  readonly requestedByPersonId: string;
  readonly materialFacts?: JsonObject;
  readonly evidence?:
    | readonly EvidenceRef[]
    | readonly { readonly kind: "image" | "link" | "text"; readonly value: string }[];
  readonly amount?: Money;
  readonly choices?: readonly ApprovalChoice[];
  readonly knownPayee?: boolean;
  readonly allowlisted?: boolean;
  readonly threadApproved?: boolean;
}
export interface ApprovalDecisionRequest {
  readonly choiceId: string;
  readonly personId: string;
  readonly factsHash: string;
}
export type ApprovalResponse = ApprovalCard & { readonly grant?: ApprovalGrant };
export type ApprovalAuthorization =
  | { readonly status: "approval_required"; readonly card: ApprovalCard }
  | { readonly status: "authorized"; readonly card: ApprovalCard; readonly grant: ApprovalGrant };
export interface GrantBinding {
  readonly householdId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly materialFacts: JsonObject;
}
export interface ApprovalEngineOptions {
  readonly defaultExpiryMs?: number;
  readonly policy?: PolicyEngine;
  readonly id?: () => string;
  readonly authorizeDecision?: (input: { card: ApprovalCard; personId: string }) => boolean;
}

export class ApprovalEngine {
  private readonly defaultExpiryMs: number;
  private readonly policy: PolicyEngine;
  private readonly id: () => string;
  private readonly authorizeDecision: NonNullable<ApprovalEngineOptions["authorizeDecision"]>;
  constructor(
    private readonly ledger: ApprovalLedger,
    options: ApprovalEngineOptions = {},
  ) {
    this.defaultExpiryMs = options.defaultExpiryMs ?? 2 * 60 * 60 * 1000;
    this.policy = options.policy ?? new PolicyEngine();
    this.id = options.id ?? (() => crypto.randomUUID());
    this.authorizeDecision =
      options.authorizeDecision ?? (({ card, personId }) => personId === card.requestedByPersonId);
    if (!Number.isSafeInteger(this.defaultExpiryMs) || this.defaultExpiryMs <= 0)
      throw new Error("invalid-approval-expiry");
  }

  async create(input: ApprovalCreateInput, now = new Date()): Promise<ApprovalCard> {
    const card = this.buildCard(input, now);
    if (card.policy.action === "deny")
      throw new Error(`approval-policy-denied:${card.policy.reasonCode}`);
    if (card.policy.action === "auto")
      throw new Error(`approval-not-required:${card.policy.reasonCode}`);
    await this.ledger.put(card);
    await this.log(card, "created", now);
    return card;
  }

  /**
   * Creates the authoritative pending card for an ask decision, or a durable single-use grant for
   * an auto decision. Both outcomes retain the same exact material binding and policy evidence.
   */
  async authorize(input: ApprovalCreateInput, now = new Date()): Promise<ApprovalAuthorization> {
    const card = this.buildCard(input, now);
    if (card.policy.action === "deny")
      throw new Error(`approval-policy-denied:${card.policy.reasonCode}`);
    if (card.policy.action === "ask") {
      await this.ledger.put(card);
      await this.log(card, "created", now);
      return { status: "approval_required", card };
    }
    const policyActor = `policy:${card.policy.ruleId}`;
    const approved: ApprovalCard = {
      ...card,
      status: "approved",
      decidedAt: now.toISOString(),
      decidedByPersonId: policyActor,
    };
    const grant = this.createGrant(approved, policyActor, now);
    await this.ledger.put(approved);
    await this.log(approved, "created", now);
    await this.log(approved, "approved", now, policyActor);
    await this.ledger.putGrant({ grant });
    return { status: "authorized", card: approved, grant };
  }

  private buildCard(input: ApprovalCreateInput, now: Date): ApprovalCard {
    const amount = normaliseMoney(input.amount);
    const facts: JsonObject = {
      ...(input.materialFacts ?? {}),
      category: input.category,
      ...(amount ? { amount: { currency: amount.currency, minorUnits: amount.minorUnits } } : {}),
    };
    const factsHash = hashMaterialFacts(facts);
    const context: PolicyContext = {
      category: input.category,
      materialFacts: facts,
      factsHash,
      now,
      ...(amount ? { amount } : {}),
      ...(input.knownPayee !== undefined ? { knownPayee: input.knownPayee } : {}),
      ...(input.allowlisted !== undefined ? { allowlisted: input.allowlisted } : {}),
      ...(input.threadApproved !== undefined ? { threadApproved: input.threadApproved } : {}),
    };
    const policy = this.policy.decide(context);
    const cardId = this.id();
    const createdAt = now.toISOString();
    const card: ApprovalCard = {
      id: cardId,
      taskId: input.taskId,
      traceId: input.traceId ?? input.taskId,
      stepId: input.stepId ?? `${input.taskId}:approval`,
      householdId: input.householdId,
      requestedByPersonId: input.requestedByPersonId,
      category: input.category,
      title: input.title,
      summary: input.summary,
      materialFacts: facts,
      factsHash,
      ...(amount ? { amount } : {}),
      evidence: normaliseEvidence(input.evidence, input.householdId, cardId, createdAt),
      choices: input.choices ?? defaultChoices,
      policy,
      status: "pending",
      createdAt,
      expiresAt: new Date(now.getTime() + this.defaultExpiryMs).toISOString(),
    };
    return card;
  }

  async respond(
    id: string,
    request: ApprovalDecisionRequest,
    now = new Date(),
  ): Promise<ApprovalResponse> {
    const card = await this.requiredCard(id);
    validateDecisionRequest(request);
    if (!request.personId.trim()) throw new Error("approval-actor-required");
    if (!this.authorizeDecision({ card, personId: request.personId })) {
      await this.log(card, "unauthorized_rejected", now, request.personId);
      throw new Error("approval-actor-unauthorized");
    }
    if (card.status !== "pending") {
      await this.log(card, "replay_rejected", now, request.personId, card.status);
      throw new Error(`approval-replay:${card.status}`);
    }
    if (now >= new Date(card.expiresAt)) {
      const expired = { ...card, status: "expired" as const };
      await this.ledger.compareAndSwap(card.id, "pending", expired);
      await this.log(expired, "expired", now, request.personId);
      throw new Error("approval-expired");
    }
    if (request.factsHash !== card.factsHash) {
      await this.log(card, "mutation_rejected", now, request.personId, "facts-hash-mismatch");
      throw new Error("approval-material-facts-changed");
    }
    const selected = card.choices.find(
      (item) => item.id === request.choiceId || item.label === request.choiceId,
    );
    if (!selected) throw new Error("approval-choice-invalid");
    if (selected.action === "edit") return card;
    const status = selected.action === "approve" ? "approved" : "denied";
    const next: ApprovalCard = {
      ...card,
      status,
      decidedAt: now.toISOString(),
      decidedByPersonId: request.personId,
    };
    if (!(await this.ledger.compareAndSwap(card.id, "pending", next))) {
      await this.log(card, "replay_rejected", now, request.personId, "concurrent-decision");
      throw new Error("approval-replay:concurrent");
    }
    await this.log(next, status, now, request.personId);
    if (status === "denied") return next;
    const grant = this.createGrant(card, request.personId, now);
    await this.ledger.putGrant({ grant });
    return { ...next, grant };
  }

  async respondFromTelegramCallback(
    callbackData: string,
    personId: string,
    now = new Date(),
  ): Promise<ApprovalResponse> {
    const match = /^approval:([^:]+):([^:]+)$/u.exec(callbackData);
    if (!match?.[1] || !match[2]) throw new Error("approval-callback-invalid");
    const card = await this.requiredCard(match[1]);
    return this.respond(card.id, { choiceId: match[2], personId, factsHash: card.factsHash }, now);
  }

  async respondFromWhatsAppReply(
    cardId: string,
    reply: string,
    personId: string,
    now = new Date(),
  ): Promise<ApprovalResponse> {
    const card = await this.requiredCard(cardId);
    const value = reply.trim();
    const numbered = /^\d+$/u.test(value) ? card.choices[Number(value) - 1]?.id : undefined;
    return this.respond(
      card.id,
      { choiceId: numbered ?? value, personId, factsHash: card.factsHash },
      now,
    );
  }

  async consumeGrant(
    grantId: string,
    binding: GrantBinding,
    now = new Date(),
  ): Promise<ApprovalGrant> {
    const record = await this.ledger.getGrant(grantId);
    if (!record) throw new Error("approval-grant-not-found");
    if (record.consumedAt) throw new Error("approval-grant-replayed");
    const grant = record.grant;
    const currentHash = hashMaterialFacts(binding.materialFacts);
    if (
      grant.householdId !== binding.householdId ||
      grant.taskId !== binding.taskId ||
      grant.stepId !== binding.stepId ||
      grant.factsHash !== currentHash
    ) {
      const card = await this.requiredCard(grant.approvalCardId);
      await this.log(card, "mutation_rejected", now, undefined, "grant-binding-mismatch");
      throw new Error("approval-grant-binding-mismatch");
    }
    if (now >= new Date(grant.expiresAt)) throw new Error("approval-grant-expired");
    const card = await this.requiredCard(grant.approvalCardId);
    const recheck = this.policy.decide({
      category: card.category,
      materialFacts: binding.materialFacts,
      factsHash: currentHash,
      now,
      ...(card.amount ? { amount: card.amount } : {}),
    });
    if (recheck.action === "deny") throw new Error(`approval-policy-drift:${recheck.reasonCode}`);
    if (!(await this.ledger.consumeGrant(grant.id, now.toISOString())))
      throw new Error("approval-grant-replayed");
    await this.log(card, "grant_consumed", now, grant.approvedByPersonId);
    return grant;
  }

  async reping(id: string, now = new Date()): Promise<ApprovalCard> {
    const card = await this.requiredCard(id);
    if (card.status !== "pending" || card.repingedAt)
      throw new Error("approval-reping-not-allowed");
    if (now >= new Date(card.expiresAt)) throw new Error("approval-expired");
    const next = { ...card, repingedAt: now.toISOString() };
    if (!(await this.ledger.compareAndSwap(id, "pending", next)))
      throw new Error("approval-replay:concurrent");
    await this.log(next, "repinged", now);
    return next;
  }

  async expireDue(now = new Date()): Promise<number> {
    let count = 0;
    for (const card of await this.ledger.due(now.toISOString())) {
      const expired = { ...card, status: "expired" as const };
      if (await this.ledger.compareAndSwap(card.id, "pending", expired)) {
        count += 1;
        await this.log(expired, "expired", now);
      }
    }
    return count;
  }

  private async requiredCard(id: string) {
    const card = await this.ledger.get(id);
    if (!card) throw new Error("approval-not-found");
    return card;
  }
  private createGrant(card: ApprovalCard, approvedByPersonId: string, now: Date): ApprovalGrant {
    return {
      id: this.id(),
      approvalCardId: card.id,
      taskId: card.taskId,
      stepId: card.stepId,
      householdId: card.householdId,
      approvedByPersonId,
      factsHash: card.factsHash,
      issuedAt: now.toISOString(),
      expiresAt: card.expiresAt,
      singleUse: true,
    };
  }
  private async log(
    card: ApprovalCard,
    action: ApprovalAuditAction,
    now: Date,
    actorPersonId?: string,
    reason?: string,
  ) {
    await this.ledger.appendAudit({
      id: this.id(),
      cardId: card.id,
      taskId: card.taskId,
      householdId: card.householdId,
      action,
      occurredAt: now.toISOString(),
      factsHash: card.factsHash,
      ...(actorPersonId ? { actorPersonId } : {}),
      ...(reason ? { reason } : {}),
    });
  }
}

function validateDecisionRequest(value: unknown): asserts value is ApprovalDecisionRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    !("choiceId" in value) ||
    typeof value.choiceId !== "string" ||
    value.choiceId.length > 256 ||
    !("personId" in value) ||
    typeof value.personId !== "string" ||
    value.personId.length > 256 ||
    !("factsHash" in value) ||
    typeof value.factsHash !== "string" ||
    !/^[a-f\d]{64}$/u.test(value.factsHash)
  )
    throw new Error("approval-decision-invalid");
}

const defaultChoices: readonly ApprovalChoice[] = [
  { id: "approve", label: "Approve", action: "approve" },
  { id: "deny", label: "Deny", action: "deny" },
];
function normaliseMoney(amount: ApprovalCreateInput["amount"]): Money | undefined {
  if (!amount) return undefined;
  if (
    !/^[A-Z]{3}$/.test(amount.currency) ||
    !Number.isSafeInteger(amount.minorUnits) ||
    amount.minorUnits < 0
  )
    throw new Error("approval-money-invalid");
  return amount;
}
function normaliseEvidence(
  evidence: ApprovalCreateInput["evidence"],
  householdId: string,
  cardId: string,
  now: string,
): readonly EvidenceRef[] {
  return (evidence ?? []).map((item, index) =>
    "id" in item
      ? item
      : {
          id: `${cardId}:evidence:${index}`,
          kind: item.kind,
          label: item.kind,
          uri: item.value,
          redacted: true,
          createdAt: now,
          audience: { kind: "household" as const },
        },
  );
}

function formatMoney(amount: Money): string {
  const zeroDecimal = amount.currency === "IDR" || amount.currency === "VND";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: amount.currency,
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(amount.minorUnits / (zeroDecimal ? 1 : 100));
}
export function renderWhatsApp(card: ApprovalCard): string {
  const amount = card.amount ? `\nAmount: ${formatMoney(card.amount)}` : "";
  const choices = card.choices.map((choice, index) => `${index + 1}. ${choice.label}`).join("\n");
  return `*${card.title}*\n${card.summary}${amount}\n\n${choices}\nExpires ${new Date(card.expiresAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}\nRef: ${card.id.slice(0, 8)}`;
}
export interface TelegramApprovalModel {
  readonly text: string;
  readonly inlineKeyboard: readonly (readonly {
    readonly text: string;
    readonly callbackData: string;
  }[])[];
}
export function renderTelegram(card: ApprovalCard): TelegramApprovalModel {
  return {
    text: `${card.title}\n${card.summary}${card.amount ? `\n${formatMoney(card.amount)}` : ""}\nExpires: ${card.expiresAt}`,
    inlineKeyboard: [
      card.choices.map((choice) => ({
        text: choice.label,
        callbackData: `approval:${card.id}:${choice.id}`,
      })),
    ],
  };
}
export interface UiApprovalModel {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly category: RiskCategory;
  readonly status: ApprovalStatus;
  readonly amount?: string;
  readonly expiresAt: string;
  readonly evidence: readonly EvidenceRef[];
  readonly actions: readonly ApprovalChoice[];
  readonly factsHash: string;
}
export function renderUi(card: ApprovalCard): UiApprovalModel {
  return {
    id: card.id,
    title: card.title,
    summary: card.summary,
    category: card.category,
    status: card.status,
    ...(card.amount ? { amount: formatMoney(card.amount) } : {}),
    expiresAt: card.expiresAt,
    evidence: card.evidence,
    actions: card.choices,
    factsHash: card.factsHash,
  };
}

export type HandoffKind = "singpass" | "otp" | "bank-2fa" | "paynow" | "captcha";
export function detectHandoff(pageText: string): HandoffKind | undefined {
  if (/singpass|scan.*qr.*singpass/i.test(pageText)) return "singpass";
  if (/paynow|sgqr/i.test(pageText)) return "paynow";
  if (/digital token|approve.*bank app/i.test(pageText)) return "bank-2fa";
  if (/one[- ]time password|\botp\b|verification code/i.test(pageText)) return "otp";
  if (/captcha|verify you are human/i.test(pageText)) return "captcha";
  return undefined;
}
export interface HandoffModel {
  readonly kind: HandoffKind;
  readonly category: RiskCategory;
  readonly title: string;
  readonly instruction: string;
  readonly poll: boolean;
  readonly neverRequestSecret: boolean;
}
export function buildHandoff(kind: HandoffKind): HandoffModel {
  const models: Record<HandoffKind, HandoffModel> = {
    singpass: {
      kind,
      category: "gov.singpass",
      title: "Singpass needed",
      instruction: "Scan with Singpass to continue. Kaki will resume after the portal confirms.",
      poll: true,
      neverRequestSecret: true,
    },
    otp: {
      kind,
      category: "account.change",
      title: "Verification code needed",
      instruction:
        "Complete the one-time-code step on the provider's trusted page. Do not send the code to Kaki.",
      poll: true,
      neverRequestSecret: true,
    },
    "bank-2fa": {
      kind,
      category: "money.transfer",
      title: "Approve in your bank app",
      instruction:
        "Check the amount and recipient in your bank app, then approve the digital-token request.",
      poll: true,
      neverRequestSecret: true,
    },
    paynow: {
      kind,
      category: "money.transfer",
      title: "PayNow confirmation",
      instruction:
        "Check merchant, amount and reference. Approval prepares the bank handoff; it does not bypass bank confirmation.",
      poll: true,
      neverRequestSecret: true,
    },
    captcha: {
      kind,
      category: "data.read",
      title: "Human check needed",
      instruction: "Complete the captcha in the prefilled browser, then Kaki will resume.",
      poll: true,
      neverRequestSecret: true,
    },
  };
  return models[kind];
}

export type PaymentRail = "paynow" | "duitnow" | "promptpay" | "qris" | "vietqr" | "qrph";
export interface PaymentHandoffModel {
  readonly rail: PaymentRail;
  readonly category: "money.transfer";
  readonly requiresApproval: true;
  readonly requiresBankConfirmation: true;
  readonly receiptRequired: true;
  readonly qrFallback: "regenerate-for-user-scan";
}
export function buildPaymentHandoff(rail: PaymentRail): PaymentHandoffModel {
  return {
    rail,
    category: "money.transfer",
    requiresApproval: true,
    requiresBankConfirmation: true,
    receiptRequired: true,
    qrFallback: "regenerate-for-user-scan",
  };
}
