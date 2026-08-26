import type { AnyAgentTool, OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
import { jsonResult } from "openclaw/plugin-sdk/provider-web-search";
import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import { Type } from "typebox";
import type { KakiRuntimeOwners } from "./contracts.js";

const SkillToolSchema = Type.Object(
  {
    skillId: Type.String({ minLength: 1, maxLength: 256 }),
    input: Type.Record(Type.String({ minLength: 1, maxLength: 256 }), Type.Unknown()),
    approvalGrantId: Type.Optional(Type.String({ minLength: 1, maxLength: 256 })),
    approvalAmount: Type.Optional(
      Type.Object(
        {
          currency: Type.String({ minLength: 3, maxLength: 3 }),
          minorUnits: Type.Integer({ minimum: 0, maximum: 100_000_000_000 }),
        },
        { additionalProperties: false },
      ),
    ),
    knownPayee: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export function createKakiSkillTool(
  context: OpenClawPluginToolContext,
  resolveOwners: () => KakiRuntimeOwners | undefined,
): AnyAgentTool | null {
  if (!context.sessionKey) return null;
  const sessionKey = context.sessionKey;
  return {
    name: "kaki_skill",
    label: "Kaki Skill",
    description:
      "Run one installed Kaki household playbook through live OpenClaw surfaces. Risky skills return an approvalCardId; after the household approves it, call again with the exact approvalGrantId returned by the approval action. Never guess a grant id or change inputs between preparation and resume.",
    parameters: SkillToolSchema,
    execute: async (_toolCallId, raw, signal) => {
      signal?.throwIfAborted();
      if (!isRecord(raw) || typeof raw.skillId !== "string" || !isRecord(raw.input)) {
        throw new Error("kaki-skill-input-invalid");
      }
      const owners = resolveOwners();
      if (!owners)
        throw new Error(
          "Kaki runtime owners unavailable; finish `kaki onboard` and restart the Gateway.",
        );
      const approvalGrantId =
        typeof raw.approvalGrantId === "string" ? raw.approvalGrantId : undefined;
      const approvalAmount =
        isRecord(raw.approvalAmount) &&
        typeof raw.approvalAmount.currency === "string" &&
        typeof raw.approvalAmount.minorUnits === "number"
          ? { currency: raw.approvalAmount.currency, minorUnits: raw.approvalAmount.minorUnits }
          : undefined;
      const result = await owners.skills.execute(
        {
          skillId: raw.skillId,
          values: raw.input,
          sessionKey,
          ...(approvalGrantId ? { approvalGrantId } : {}),
          ...(approvalAmount ? { approvalAmount } : {}),
          ...(typeof raw.knownPayee === "boolean" ? { knownPayee: raw.knownPayee } : {}),
        },
        signal ?? new AbortController().signal,
      );
      return jsonResult(result);
    },
  } satisfies AnyAgentTool;
}
