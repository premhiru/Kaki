import { countryForRail, type SeaCountry } from "./profiles.js";
import type { QrPayment } from "./qr.js";

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
  };
  readonly message: string;
}
function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
export function crossBorderHandoff(
  payment: QrPayment,
  sourceCountry: "sg" | SeaCountry,
  supportedByBank = true,
): CrossBorderApprovalHandoff {
  if (!payment.crcValid) throw new Error("cross-border-qr-crc-invalid");
  const destinationCountry = countryForRail(payment.rail);
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
      payloadHash: fnv1a(payment.raw),
    },
    message: supportedByBank
      ? `Approve ${amountLabel} to ${payment.merchant ?? destinationCountry.toUpperCase() + " recipient"} in your ${sourceCountry.toUpperCase()} bank app.`
      : `Your bank cannot complete this rail automatically. Approve to regenerate the validated ${payment.rail} QR for one manual scan.`,
  };
}
