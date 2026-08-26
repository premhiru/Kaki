import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { RiskCategory } from "@kaki/core";

export interface CapabilityClaims {
  readonly version: number;
  readonly id: string;
  readonly taskId: string;
  readonly householdId: string;
  readonly audience: string;
  readonly scopes: readonly string[];
  readonly riskCategories: readonly RiskCategory[];
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly singleUse: boolean;
}
export class CapabilityIssuer {
  readonly #consumed = new Set<string>();
  constructor(
    private readonly signingKey: Uint8Array,
    private readonly clock: () => Date = () => new Date(),
  ) {
    if (signingKey.byteLength < 32) throw new Error("capability-signing-key-too-short");
  }
  issue(input: {
    taskId: string;
    householdId: string;
    audience: string;
    scopes: string[];
    riskCategories: RiskCategory[];
    ttlMs?: number;
    singleUse?: boolean;
  }): string {
    const now = this.clock();
    const claims: CapabilityClaims = {
      version: 1,
      id: randomUUID(),
      taskId: input.taskId,
      householdId: input.householdId,
      audience: input.audience,
      scopes: [...new Set(input.scopes)].sort(),
      riskCategories: [...new Set(input.riskCategories)].sort(),
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? 120_000)).toISOString(),
      singleUse: input.singleUse ?? true,
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${this.sign(payload)}`;
  }
  verify(
    token: string,
    required: {
      audience: string;
      taskId: string;
      householdId: string;
      scope: string;
      riskCategory: RiskCategory;
      consume?: boolean;
    },
  ): CapabilityClaims {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) throw new Error("capability-malformed");
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error("capability-invalid-signature");
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as CapabilityClaims;
    if (
      claims.version !== 1 ||
      claims.audience !== required.audience ||
      claims.taskId !== required.taskId ||
      claims.householdId !== required.householdId
    )
      throw new Error("capability-context-denied");
    if (
      !claims.scopes.includes(required.scope) ||
      !claims.riskCategories.includes(required.riskCategory)
    )
      throw new Error("capability-scope-denied");
    if (new Date(claims.expiresAt) <= this.clock()) throw new Error("capability-expired");
    if (this.#consumed.has(claims.id)) throw new Error("capability-already-consumed");
    if (required.consume && claims.singleUse) this.#consumed.add(claims.id);
    return claims;
  }
  private sign(payload: string): string {
    return createHmac("sha256", this.signingKey).update(payload).digest("base64url");
  }
}
