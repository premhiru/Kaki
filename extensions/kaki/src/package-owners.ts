import {
  ApprovalEngine,
  renderUi,
  type ApprovalCard,
  type ApprovalLedger,
} from "@kaki/approval-node";
import { loadLocalePack, type LocaleCode } from "@kaki/locale";
import { type CostLedgerContract } from "@kaki/models";
import { type SingaporeMonitorRegistry } from "@kaki/sg-data";
import type { KakiRuntimeOwners } from "./contracts.js";

type ApprovalOwner = KakiRuntimeOwners["approvals"];
type LocaleOwner = KakiRuntimeOwners["locale"];
type CostOwner = KakiRuntimeOwners["costs"];
type MonitorOwner = KakiRuntimeOwners["monitors"];

function throwIfAborted(signal: AbortSignal): void {
  signal.throwIfAborted();
}

/** Adapt an injected durable CAS ledger; production must never pass MemoryApprovalLedger here. */
export function createKakiApprovalOwner(options: {
  ledger: ApprovalLedger;
  engine?: ApprovalEngine;
  householdId: string;
  authorizeDecision: (input: { card: ApprovalCard; personId: string }) => boolean;
}): ApprovalOwner {
  const engine =
    options.engine ??
    new ApprovalEngine(options.ledger, {
      authorizeDecision: options.authorizeDecision,
    });
  return {
    async list(signal) {
      throwIfAborted(signal);
      const cards = await options.ledger.pending(options.householdId);
      throwIfAborted(signal);
      return cards.map((card) => {
        const value = renderUi(card);
        return {
          id: value.id,
          factsHash: value.factsHash,
          title: value.title,
          detail: value.summary,
          amount: value.amount ?? "",
          evidence: `${value.evidence.length} evidence item${value.evidence.length === 1 ? "" : "s"}`,
          state: value.status,
        };
      });
    },
    async decide(input, signal) {
      throwIfAborted(signal);
      const card = await engine.respond(input.id, {
        choiceId: input.decision === "approved" ? "approve" : "deny",
        personId: input.actorPersonId,
        factsHash: input.factsHash,
      });
      throwIfAborted(signal);
      return {
        ok: true,
        message: `Approval ${card.id} is ${card.status}.`,
        ...(card.grant ? { approvalGrantId: card.grant.id } : {}),
      };
    },
  };
}

const LOCALES: readonly LocaleCode[] = ["sg", "my", "id", "th", "vn", "ph", "mm", "kh"];

function localeCode(value: string): LocaleCode | undefined {
  switch (value) {
    case "sg":
    case "my":
    case "id":
    case "th":
    case "vn":
    case "ph":
    case "mm":
    case "kh":
      return value;
    default:
      return undefined;
  }
}

export function createKakiLocaleOwner(options: {
  getActive(): Promise<LocaleCode>;
  setActive(locale: LocaleCode): Promise<void>;
  packagesRoot?: string;
}): LocaleOwner {
  return {
    async snapshot(signal) {
      throwIfAborted(signal);
      const active = await options.getActive();
      const pack = await loadLocalePack(active, options.packagesRoot);
      throwIfAborted(signal);
      const currency = pack.formats.currency;
      if (typeof currency !== "string") throw new Error("locale-pack-currency-unavailable");
      return {
        active,
        available: LOCALES,
        preview: pack.persona.trim().slice(0, 4_000),
        currency,
        timeZone: pack.calendar.timezone,
      };
    },
    async set(locale, signal) {
      const parsedLocale = localeCode(locale);
      if (!parsedLocale) throw new Error("locale-unsupported");
      throwIfAborted(signal);
      await loadLocalePack(parsedLocale, options.packagesRoot);
      await options.setActive(parsedLocale);
      throwIfAborted(signal);
      return { ok: true, message: `Kaki locale changed to ${locale}.` };
    },
  };
}

export function createKakiCostOwner(options: {
  ledger: CostLedgerContract;
  monthlyBudgetUsd?: number;
  now?: () => Date;
}): CostOwner {
  return {
    async snapshot(signal) {
      throwIfAborted(signal);
      const now = options.now?.() ?? new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const monthKey = todayKey.slice(0, 7);
      const events = await options.ledger.events();
      const monthEvents = events.filter((event) =>
        event.timestamp.toISOString().startsWith(monthKey),
      );
      const monthCost = monthEvents.reduce((sum, event) => sum + event.costUsd, 0);
      const todayCost = monthEvents
        .filter((event) => event.timestamp.toISOString().startsWith(todayKey))
        .reduce((sum, event) => sum + event.costUsd, 0);
      const localCount = monthEvents.filter(
        (event) => event.provider === "ollama" || event.provider === "vllm",
      ).length;
      const localShare = monthEvents.length === 0 ? 0 : (localCount / monthEvents.length) * 100;
      return {
        month: `${monthCost.toFixed(2)} USD`,
        today: `${todayCost.toFixed(2)} USD`,
        localShare: `${localShare.toFixed(0)}%`,
        budgetRemaining:
          options.monthlyBudgetUsd === undefined
            ? "Not configured"
            : `${Math.max(0, options.monthlyBudgetUsd - monthCost).toFixed(2)} USD`,
      };
    },
  };
}

export function createKakiMonitorOwner(options: {
  registry: SingaporeMonitorRegistry;
  isEnabled(id: string): Promise<boolean>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
}): MonitorOwner {
  return {
    async list(signal) {
      throwIfAborted(signal);
      return await Promise.all(
        options.registry.list().map(async (monitor) => ({
          id: monitor.id,
          title: monitor.kind,
          detail: `Every ${monitor.intervalMs} ms`,
          status: "configured",
          enabled: await options.isEnabled(monitor.id),
        })),
      );
    },
    async set(id, enabled, signal) {
      if (!options.registry.get(id)) throw new Error("monitor-not-found");
      throwIfAborted(signal);
      await options.setEnabled(id, enabled);
      throwIfAborted(signal);
      return {
        ok: true,
        message: `${id} is ${enabled ? "enabled" : "disabled"}.`,
      };
    },
  };
}
