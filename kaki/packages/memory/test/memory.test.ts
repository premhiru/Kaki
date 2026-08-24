import assert from "node:assert/strict";
import test from "node:test";
import type { Account, Household, Person, PrivacyScope } from "@kaki/core";
import {
  HouseholdGraphStore,
  HouseholdVectorIndex,
  type Preference,
  type VectorAdapter,
  type VectorDocument,
  type VectorMatch,
} from "../src/index.js";

const now = "2026-08-24T00:00:00.000Z";
const householdScope: PrivacyScope = { audience: { kind: "household" }, sensitivity: "household" };
const base = (id: string, householdId = "h1", privacy: PrivacyScope = householdScope) => ({
  id,
  householdId,
  createdAt: now,
  updatedAt: now,
  version: 1,
  privacy,
});

test("household graph resolves speakers without crossing household identity walls", () => {
  using graph = new HouseholdGraphStore(":memory:");
  const household: Household = {
    ...base("h1"),
    kind: "household",
    displayName: "Home",
    locale: "sg",
    timezone: "Asia/Singapore",
    memberPersonIds: ["wei"],
    importantPlaceIds: [],
    approvalPolicyId: "policy",
    quietHours: { start: "23:00", end: "07:00", timezone: "Asia/Singapore" },
    encryptionKeyRef: "keychain://kaki/h1",
  };
  const person: Person = {
    ...base("wei", "h1", {
      ownerPersonId: "wei",
      audience: { kind: "owner", personId: "wei" },
      sensitivity: "private",
    }),
    kind: "person",
    displayName: "Wei Ling",
    channelIdentities: [{ channel: "whatsapp", jid: "wa:wei" }],
    languages: ["en"],
  };
  graph.upsert(household);
  graph.upsert(person);
  graph.bindSpeaker("h1", "wei", "whatsapp", "wa:wei");
  assert.equal(graph.resolveSpeaker("h1", "whatsapp", "wa:wei")?.id, "wei");
  assert.equal(graph.resolveSpeaker("h2", "whatsapp", "wa:wei"), undefined);
  assert.throws(() => graph.bindSpeaker("h1", "missing", "whatsapp", "wa:x"), /not-found/);
});

test("graph privacy, child-safe retrieval, key references and safe export are enforced", () => {
  using graph = new HouseholdGraphStore(":memory:");
  graph.upsert({
    ...base("h1"),
    kind: "household",
    displayName: "Home",
    locale: "sg",
    timezone: "Asia/Singapore",
    memberPersonIds: [],
    importantPlaceIds: [],
    approvalPolicyId: "policy",
    quietHours: { start: "23:00", end: "07:00", timezone: "Asia/Singapore" },
    encryptionKeyRef: "secret://households/h1",
  });
  const preference: Preference = {
    ...base("pref", "h1", {
      ownerPersonId: "mum",
      audience: { kind: "owner", personId: "mum" },
      sensitivity: "medical",
    }),
    kind: "preference",
    ownerPersonId: "mum",
    key: "clinic",
    value: "Appointment for S1234567D",
  };
  graph.upsert(preference);
  assert.equal(graph.get("pref", "h1", "child"), undefined);
  assert.equal(graph.get("pref", "h1", "mum", undefined, true), undefined);
  assert.match((graph.get("pref", "h1", "mum") as Preference).value, /S\*\*\*D/);
  const exported = graph.exportMarkdown("h1");
  assert.doesNotMatch(exported, /secret:\/\//);
  assert.doesNotMatch(exported, /S1234567D/);
});

test("account records reject credential-like extra fields", () => {
  using graph = new HouseholdGraphStore(":memory:");
  const unsafe = {
    ...base("account"),
    kind: "account",
    provider: "bank",
    displayLabel: "Everyday",
    capabilities: ["read"],
    password: "hunter2",
  } as unknown as Account;
  assert.throws(() => graph.upsert(unsafe), /secret|account-secret-field/);
});

test("vector adapter results are filtered by household even when provider mixes tenants", async () => {
  const adapter: VectorAdapter = {
    async upsert(_document: VectorDocument) {},
    async query(): Promise<readonly VectorMatch[]> {
      return [
        { id: "other", score: 0.99, householdId: "h2" },
        { id: "mine", score: 0.9, householdId: "h1" },
      ];
    },
    async delete() {},
  };
  const index = new HouseholdVectorIndex(adapter);
  assert.deepEqual(await index.query("h1", [0.1, 0.2]), [
    { id: "mine", score: 0.9, householdId: "h1" },
  ]);
});
