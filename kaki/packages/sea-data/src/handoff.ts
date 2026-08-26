import { createHash } from "node:crypto";
import { countryForRail, type SeaCountry } from "./profiles.js";
import type { QrPayment } from "./qr.js";

export interface CrossBorderCapabilityEvidence {
  readonly bankId: string;
  readonly checkedAt: string;
  readonly sourceCountry: "sg" | SeaCountry;
  readonly destinationCountry: SeaCountry;
  readonly rail: QrPayment["rail"];
  readonly supported: boolean;
  readonly fxRate?: number;
  readonly feeMinor?: number;
}

export interface CrossBorderApprovalHandoff {
  readonly action: "bank-handoff" | "regenerate-qr";
  readonly category: "money.transfer";
  readonly requiresApproval: true;
  readonly facts: {
    readonly sourceCountry: "sg" | SeaCountry;
    readonly destinationCountry: SeaCountry;
    readonly rail: QrPayment["rail"];
    readonly currency: string;
    readonly amountMinor?: number;
    readonly merchant?: string;
    readonly reference?: string;
    readonly payloadHash: string;
    readonly bankId?: string;
    readonly capabilityCheckedAt?: string;
    readonly fxRate?: number;
    readonly feeMinor?: number;
  };
  readonly message: string;
}
export function crossBorderHandoff(
  payment: QrPayment,
  sourceCountry: "sg" | SeaCountry,
  evidence?: CrossBorderCapabilityEvidence,
  now = Date.now(),
): CrossBorderApprovalHandoff {
  if (!payment.crcValid) throw new Error("cross-border-qr-crc-invalid");
  const destinationCountry = countryForRail(payment.rail);
  const evidenceTime = evidence ? Date.parse(evidence.checkedAt) : Number.NaN;
  if (
    evidence &&
    (!/^[A-Za-z0-9._-]{2,64}$/u.test(evidence.bankId) ||
      (evidence.fxRate !== undefined &&
        (!Number.isFinite(evidence.fxRate) || evidence.fxRate <= 0)) ||
      (evidence.feeMinor !== undefined &&
        (!Number.isSafeInteger(evidence.feeMinor) || evidence.feeMinor < 0)))
  ) {
    throw new Error("cross-border-capability-evidence-invalid");
  }
  const evidenceMatches = Boolean(
    evidence &&
    evidence.sourceCountry === sourceCountry &&
    evidence.destinationCountry === destinationCountry &&
    evidence.rail === payment.rail &&
    Number.isFinite(evidenceTime) &&
    evidenceTime <= now &&
    now - evidenceTime <= 5 * 60_000,
  );
  if (evidence && !evidenceMatches) throw new Error("cross-border-capability-evidence-invalid");
  const supportedByBank = evidenceMatches && evidence?.supported === true;
  const amountLabel =
    payment.amount === undefined
      ? "merchant-entered amount"
      : `${payment.currency} ${payment.amount.toFixed(2)}`;
  return {
    action: supportedByBank ? "bank-handoff" : "regenerate-qr",
    category: "money.transfer",
    requiresApproval: true,
    facts: {
      sourceCountry,
      destinationCountry,
      rail: payment.rail,
      currency: payment.currency,
      ...(payment.amountMinor !== undefined ? { amountMinor: payment.amountMinor } : {}),
      ...(payment.merchant ? { merchant: payment.merchant } : {}),
      ...(payment.reference ? { reference: payment.reference } : {}),
      payloadHash: createHash("sha256").update(payment.raw, "utf8").digest("hex"),
      ...(evidenceMatches && evidence
        ? {
            bankId: evidence.bankId,
            capabilityCheckedAt: evidence.checkedAt,
            ...(evidence.fxRate !== undefined ? { fxRate: evidence.fxRate } : {}),
            ...(evidence.feeMinor !== undefined ? { feeMinor: evidence.feeMinor } : {}),
          }
        : {}),
    },
    message: supportedByBank
      ? `Approve ${amountLabel} to ${payment.merchant ?? destinationCountry.toUpperCase() + " recipient"} in your ${sourceCountry.toUpperCase()} bank app.`
      : `Your bank cannot complete this rail automatically. Approve to regenerate the validated ${payment.rail} QR for one manual scan.`,
  };
}
