import { createHash } from "node:crypto";
import type {
  JsonObject,
  JsonValue,
  Money,
  PolicyAction,
  PolicyDecision,
  RiskCategory,
} from "@kaki/core";

export type { PolicyAction, PolicyDecision, RiskCategory } from "@kaki/core";

export interface PolicyContext {
  readonly category: RiskCategory;
  readonly amount?: Money;
  /** Compatibility input; canonical callers use integer minor units in `amount`. */
  readonly amountSgd?: number;
  readonly knownPayee?: boolean;
  readonly paymentRail?: "bank" | "card" | "wallet";
  readonly allowlisted?: boolean;
  readonly threadApproved?: boolean;
  readonly materialFacts?: JsonObject;
  readonly factsHash?: string;
  readonly now?: Date;
}

export interface PolicyConfig {
  readonly moneyAutoCapMinor?: number;
  readonly denyMoneyAboveMinor?: number;
  readonly walletCapMinor?: number;
  /** Compatibility options, converted to cents once at construction. */
  readonly moneyAutoCapSgd?: number;
  readonly denyMoneyAboveSgd?: number;
  readonly walletCapSgd?: number;
  readonly quietHours: { readonly start: number; readonly end: number };
}

const defaults: PolicyConfig = { moneyAutoCapMinor: 3_000, quietHours: { start: 23, end: 7 } };

function canonical(value: JsonValue): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("material-facts-non-finite-number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const array = value as readonly JsonValue[];
    return `[${array.map((item) => canonical(item)).join(",")}]`;
  }
  const object = value as JsonObject;
  return `{${Object.keys(object)
    .sort()
    .map((key) => {
      const item = object[key];
      if (item === undefined) throw new Error("material-facts-undefined");
      return `${JSON.stringify(key)}:${canonical(item)}`;
    })
    .join(",")}}`;
}

export function canonicalMaterialFacts(facts: JsonObject): string {
  return canonical(facts);
}
export function hashMaterialFacts(facts: JsonObject): string {
  return createHash("sha256").update(canonicalMaterialFacts(facts), "utf8").digest("hex");
}

export class PolicyEngine {
  private readonly autoCapMinor: number;
  private readonly denyAboveMinor: number | undefined;
  private readonly walletCapMinor: number;

  constructor(private readonly config: PolicyConfig = defaults) {
    this.autoCapMinor =
      config.moneyAutoCapMinor ?? Math.round((config.moneyAutoCapSgd ?? 30) * 100);
    this.denyAboveMinor =
      config.denyMoneyAboveMinor ??
      (config.denyMoneyAboveSgd === undefined
        ? undefined
        : Math.round(config.denyMoneyAboveSgd * 100));
    this.walletCapMinor = config.walletCapMinor ?? Math.round((config.walletCapSgd ?? 200) * 100);
    if (
      !Number.isSafeInteger(this.autoCapMinor) ||
      this.autoCapMinor < 0 ||
      !Number.isSafeInteger(this.walletCapMinor) ||
      this.walletCapMinor < 0
    )
      throw new Error("invalid-money-auto-cap");
  }

  decide(context: PolicyContext): PolicyDecision {
    const factsHash = context.factsHash ?? hashMaterialFacts(context.materialFacts ?? {});
    const evaluatedAt = (context.now ?? new Date()).toISOString();
    const result = (
      action: PolicyAction,
      reasonCode: string,
      reason: string,
      ruleId: string,
    ): PolicyDecision => ({ action, reasonCode, reason, ruleId, factsHash, evaluatedAt });
    if (context.category === "gov.singpass")
      return result(
        "ask",
        "singpass_always_ask",
        "Singpass always requires a human handoff",
        "singpass-always-ask",
      );
    if (context.category === "account.change")
      return result(
        "ask",
        "account_change_ask",
        "Account changes require confirmation",
        "account-change-ask",
      );
    if (context.category === "message.household")
      return result(
        "auto",
        "household_allowlisted",
        "Household messages are allowlisted",
        "household-auto",
      );
    if (context.category === "message.external") {
      if (!context.allowlisted && !context.threadApproved)
        return result(
          "ask",
          "external_first_contact",
          "First contact with an external party",
          "external-first-contact",
        );
      return result(
        "auto",
        "external_thread_approved",
        "External thread was approved",
        "external-approved-thread",
      );
    }
    if (context.category === "booking")
      return result("ask", "booking_ask", "Bookings require confirmation", "booking-ask");
    if (context.category === "data.share")
      return result(
        "ask",
        "data_share_ask",
        "Sharing household data requires confirmation",
        "data-share-ask",
      );
    if (context.category === "none" || context.category === "data.read")
      return result("auto", "read_only", "Read-only operation", "read-auto");
    const amount = context.amount
      ? context.amount.currency === "SGD"
        ? context.amount.minorUnits
        : Number.POSITIVE_INFINITY
      : context.amountSgd === undefined
        ? Number.POSITIVE_INFINITY
        : Math.round(context.amountSgd * 100);
    if (this.denyAboveMinor !== undefined && amount > this.denyAboveMinor)
      return result(
        "deny",
        "money_hard_limit",
        "Amount exceeds the household hard limit",
        "money-hard-limit",
      );
    if (!Number.isSafeInteger(amount) || amount < 0)
      return result(
        "deny",
        "money_invalid",
        "Amount must be non-negative integer minor units",
        "money-invalid",
      );
    if (context.paymentRail === "wallet" && amount > this.walletCapMinor)
      return result(
        "deny",
        "wallet_hard_limit",
        "Amount exceeds the household wallet cap",
        "wallet-hard-limit",
      );
    if (context.knownPayee && amount < this.autoCapMinor)
      return result(
        "auto",
        "money_known_under_cap",
        "Known payee below auto-approval cap",
        "money-known-under-cap",
      );
    return result("ask", "money_ask", "Payment requires confirmation", "money-ask");
  }
}
