export interface HouseholdPersonBinding {
  jid: string;
  personId: string;
  householdId: string;
}

export interface FamilyGroupBinding {
  chatId: string;
  householdId: string;
}

export interface InboundIdentity {
  accepted: boolean;
  householdId?: string;
  personId?: string;
  reason?: "allowlisted" | "family-group" | "outbound-thread" | "unknown-sender";
}

/** Resolves channel identities without persisting message contents. */
export class HouseholdDirectory {
  readonly #people = new Map<string, HouseholdPersonBinding>();
  readonly #groups = new Map<string, FamilyGroupBinding>();
  readonly #allowlisted = new Set<string>();
  readonly #outboundThreads = new Map<string, string>();

  constructor(
    options: {
      people?: HouseholdPersonBinding[];
      groups?: FamilyGroupBinding[];
      allowlistedJids?: string[];
    } = {},
  ) {
    for (const person of options.people ?? []) this.#people.set(person.jid, person);
    for (const group of options.groups ?? []) this.#groups.set(group.chatId, group);
    for (const jid of options.allowlistedJids ?? []) this.#allowlisted.add(jid);
  }

  markOutboundThread(jid: string, householdId: string): void {
    if (!householdId) throw new Error("outbound-thread-household-required");
    this.#outboundThreads.set(jid, householdId);
  }

  revokeOutboundThread(jid: string): void {
    this.#outboundThreads.delete(jid);
  }

  resolve(senderJid: string, chatId: string): InboundIdentity {
    const person = this.#people.get(senderJid);
    const group = this.#groups.get(chatId);
    if (group) {
      return {
        accepted: true,
        householdId: group.householdId,
        ...(person ? { personId: person.personId } : {}),
        reason: "family-group",
      };
    }
    if (person || this.#allowlisted.has(senderJid)) {
      return {
        accepted: true,
        ...(person ? { householdId: person.householdId, personId: person.personId } : {}),
        reason: "allowlisted",
      };
    }
    const outboundHousehold = this.#outboundThreads.get(senderJid);
    if (outboundHousehold)
      return { accepted: true, householdId: outboundHousehold, reason: "outbound-thread" };
    return { accepted: false, reason: "unknown-sender" };
  }
}
