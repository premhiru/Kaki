import type {
  OpenClawPluginCommandDefinition,
  PluginCommandContext,
} from "openclaw/plugin-sdk/plugin-entry";
import { approvalFactsHash, isApprovalDecisionConflict } from "./actions.js";
import type { KakiRuntimeOwners } from "./contracts.js";
import {
  projectActionResult,
  projectAutomation,
  projectCost,
  projectHousehold,
  projectJourney,
  projectLocale,
  projectSkill,
} from "./projection.js";
import { withOwnerDeadline } from "./runtime.js";

export const KAKI_CONTROL_COMMANDS = [
  { invocation: "/status", owner: "host" },
  { invocation: "/approve", owner: "host" },
  { invocation: "/deny", owner: "kaki" },
  { invocation: "/relink-wa", owner: "kaki" },
  { invocation: "/journey", owner: "kaki" },
  { invocation: "/household", owner: "kaki" },
  { invocation: "/phone", owner: "kaki" },
  { invocation: "/skills", owner: "kaki" },
  { invocation: "/cron", owner: "kaki" },
  { invocation: "/locale", owner: "kaki" },
  { invocation: "/pause", owner: "kaki" },
  { invocation: "/resume", owner: "kaki" },
  { invocation: "/cost", owner: "kaki" },
] as const;

type ResolveOwners = () => KakiRuntimeOwners | undefined;

function denied(ctx: PluginCommandContext): string | undefined {
  return ctx.isAuthorizedSender && ctx.senderIsOwner === true
    ? undefined
    : "⚠️ Kaki household controls are limited to the authenticated household owner.";
}

function args(ctx: PluginCommandContext): string[] {
  return (ctx.args ?? "").trim().split(/\s+/).filter(Boolean);
}

function lines(title: string, rows: readonly string[]): string {
  const visible = rows.slice(0, 20);
  return [
    title,
    ...(visible.length ? visible : ["None configured."]),
    ...(rows.length > 20 ? [`…and ${rows.length - 20} more.`] : []),
  ]
    .join("\n")
    .slice(0, 4_000);
}

function unavailable(): string {
  return "⚠️ Kaki runtime owners are unavailable. Finish `kaki onboard`, then restart the Gateway.";
}

function command(options: {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  scope: "operator.read" | "operator.write" | "operator.admin";
  run: (
    owners: KakiRuntimeOwners,
    ctx: PluginCommandContext,
    signal: AbortSignal,
  ) => Promise<string>;
  resolveOwners: ResolveOwners;
}): OpenClawPluginCommandDefinition {
  return {
    name: options.name,
    description: options.description,
    acceptsArgs: options.acceptsArgs ?? false,
    channels: ["telegram"],
    requireAuth: true,
    exposeSenderIsOwner: true,
    requiredScopes: [options.scope],
    handler: async (ctx) => {
      const rejection = denied(ctx);
      if (rejection) return { text: rejection };
      const owners = options.resolveOwners();
      if (!owners) return { text: unavailable() };
      try {
        return {
          text: await withOwnerDeadline((signal) => options.run(owners, ctx, signal)),
        };
      } catch (error) {
        if (isApprovalDecisionConflict(error)) {
          return {
            text: "⚠️ Approval changed. Refresh the pending approvals before deciding.",
          };
        }
        return { text: unavailable() };
      }
    },
  };
}

export function createKakiControlCommands(
  resolveOwners: ResolveOwners,
  operatorPersonId: string | undefined,
): OpenClawPluginCommandDefinition[] {
  return [
    command({
      name: "deny",
      description: "Deny one pending Kaki approval.",
      acceptsArgs: true,
      scope: "operator.write",
      resolveOwners,
      run: async (owners, ctx, signal) => {
        const [id, factsHash, ...extra] = args(ctx);
        if (
          !id ||
          typeof factsHash !== "string" ||
          !approvalFactsHash(factsHash) ||
          extra.length ||
          !operatorPersonId
        ) {
          return "Usage: /deny <approval-id> <facts-hash>";
        }
        const result = projectActionResult(
          await owners.approvals.decide(
            {
              id,
              decision: "denied",
              actorPersonId: operatorPersonId,
              factsHash,
            },
            signal,
          ),
        );
        return result.message;
      },
    }),
    command({
      name: "relink-wa",
      description: "Start the trusted local WhatsApp relink flow.",
      scope: "operator.admin",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        projectActionResult(await owners.channels.relinkWhatsApp(signal)).message,
    }),
    command({
      name: "journey",
      description: "List the household journey timeline.",
      scope: "operator.read",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        lines(
          "Kaki journey",
          (await owners.journeys.list(signal)).map((value) => {
            const row = projectJourney(value);
            return `${row.time} — ${row.title}: ${row.detail}`;
          }),
        ),
    }),
    command({
      name: "household",
      description: "List household members and language settings.",
      scope: "operator.read",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        lines(
          "Kaki household",
          (await owners.household.list(signal)).map((value) => {
            const row = projectHousehold(value);
            return `${row.name} — ${row.relation}; ${row.language}; ${row.detail}`;
          }),
        ),
    }),
    command({
      name: "phone",
      description: "Run a bounded Kaki phone command.",
      acceptsArgs: true,
      scope: "operator.write",
      resolveOwners,
      run: async (owners, ctx, signal) => {
        const [action, ...rest] = args(ctx);
        if (action === "screenshot" && rest.length === 0) {
          return projectActionResult(await owners.phone.command({ command: "screenshot" }, signal))
            .message;
        }
        if (action === "tap" && rest.length > 0) {
          const target = rest.join(" ").slice(0, 256);
          return projectActionResult(
            await owners.phone.command({ command: "tap-target", target }, signal),
          ).message;
        }
        return "Usage: /phone screenshot | /phone tap <visible-target>";
      },
    }),
    command({
      name: "skills",
      description: "List maintained, learned, and phone Kaki skills.",
      scope: "operator.read",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        lines(
          "Kaki skills",
          (await owners.skills.list(signal)).map((value) => {
            const row = projectSkill(value);
            return `${row.id} — ${row.source}`;
          }),
        ),
    }),
    command({
      name: "cron",
      description: "List Kaki background schedules.",
      scope: "operator.read",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        lines(
          "Kaki schedules",
          (await owners.automation.list(signal)).map((value) => {
            const row = projectAutomation(value);
            return `${row.title} — ${row.status}; next ${row.nextRun}`;
          }),
        ),
    }),
    command({
      name: "locale",
      description: "Show or change the active Kaki locale.",
      acceptsArgs: true,
      scope: "operator.write",
      resolveOwners,
      run: async (owners, ctx, signal) => {
        const tokens = args(ctx);
        if (tokens.length === 0) {
          const value = projectLocale(await owners.locale.snapshot(signal));
          return `Kaki locale: ${value.active} (${value.currency}, ${value.timeZone})\n${value.preview}`;
        }
        if (tokens.length !== 1) return "Usage: /locale [sg|my|id|th|vn|ph|mm|kh]";
        return projectActionResult(await owners.locale.set(tokens[0]!, signal)).message;
      },
    }),
    command({
      name: "pause",
      description: "Pause Kaki household automation.",
      scope: "operator.write",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        projectActionResult(await owners.system.setPaused(true, signal)).message,
    }),
    command({
      name: "resume",
      description: "Resume Kaki household automation.",
      scope: "operator.write",
      resolveOwners,
      run: async (owners, _ctx, signal) =>
        projectActionResult(await owners.system.setPaused(false, signal)).message,
    }),
    command({
      name: "cost",
      description: "Show bounded Kaki model cost totals.",
      scope: "operator.read",
      resolveOwners,
      run: async (owners, _ctx, signal) => {
        const value = projectCost(await owners.costs.snapshot(signal));
        return `Kaki cost: ${value.today} today; ${value.month} this month; ${value.localShare} local; ${value.budgetRemaining} remaining.`;
      },
    }),
  ];
}
