import type {
  ApprovalAuditEvent,
  ApprovalCard,
  ApprovalGrant,
  ApprovalLedger,
  ApprovalStatus,
} from "@kaki/approval-node";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

type StoredGrant = Readonly<{ grant: ApprovalGrant; consumedAt?: string }>;
type ApprovalRecord =
  | Readonly<{ kind: "card"; card: ApprovalCard }>
  | Readonly<{ kind: "audit"; event: ApprovalAuditEvent }>
  | Readonly<{ kind: "grant"; record: StoredGrant }>;

function cardKey(id: string): string {
  return `card:${id}`;
}

function grantKey(id: string): string {
  return `grant:${id}`;
}

export class KakiPluginStateApprovalLedger implements ApprovalLedger {
  constructor(private readonly store: PluginStateKeyedStore<ApprovalRecord>) {
    if (!store.update) throw new Error("Kaki approvals require atomic plugin-state update support");
  }

  async put(card: ApprovalCard): Promise<void> {
    if (
      !(await this.store.registerIfAbsent(cardKey(card.id), {
        kind: "card",
        card,
      }))
    ) {
      throw new Error("approval-id-conflict");
    }
  }

  async get(id: string): Promise<ApprovalCard | undefined> {
    const value = await this.store.lookup(cardKey(id));
    if (!value) return undefined;
    if (value.kind !== "card") throw new Error("approval-ledger-corrupt-card");
    return value.card;
  }

  async compareAndSwap(id: string, expected: ApprovalStatus, next: ApprovalCard): Promise<boolean> {
    let matched = false;
    await this.store.update!(cardKey(id), (current) => {
      if (!current || current.kind !== "card" || current.card.status !== expected) return current;
      matched = true;
      return { kind: "card", card: next };
    });
    return matched;
  }

  async pending(householdId: string): Promise<readonly ApprovalCard[]> {
    return (await this.store.entries())
      .flatMap(({ value }) => (value.kind === "card" ? [value.card] : []))
      .filter((card) => card.householdId === householdId && card.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async due(now: string): Promise<readonly ApprovalCard[]> {
    return (await this.store.entries())
      .flatMap(({ value }) => (value.kind === "card" ? [value.card] : []))
      .filter((card) => card.status === "pending" && card.expiresAt <= now)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }

  async appendAudit(event: ApprovalAuditEvent): Promise<void> {
    if (
      !(await this.store.registerIfAbsent(`audit:${event.id}`, {
        kind: "audit",
        event,
      }))
    ) {
      throw new Error("approval-audit-id-conflict");
    }
  }

  async audit(cardId: string): Promise<readonly ApprovalAuditEvent[]> {
    return (await this.store.entries())
      .flatMap(({ value }) => (value.kind === "audit" ? [value.event] : []))
      .filter((event) => event.cardId === cardId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async putGrant(record: StoredGrant): Promise<void> {
    if (
      !(await this.store.registerIfAbsent(grantKey(record.grant.id), {
        kind: "grant",
        record,
      }))
    ) {
      throw new Error("approval-grant-id-conflict");
    }
  }

  async getGrant(id: string): Promise<StoredGrant | undefined> {
    const value = await this.store.lookup(grantKey(id));
    if (!value) return undefined;
    if (value.kind !== "grant") throw new Error("approval-ledger-corrupt-grant");
    return value.record;
  }

  async consumeGrant(id: string, consumedAt: string): Promise<boolean> {
    let consumed = false;
    await this.store.update!(grantKey(id), (current) => {
      if (!current || current.kind !== "grant" || current.record.consumedAt) return current;
      consumed = true;
      return {
        kind: "grant",
        record: { grant: current.record.grant, consumedAt },
      };
    });
    return consumed;
  }
}
