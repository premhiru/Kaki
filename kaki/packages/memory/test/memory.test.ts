import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import type { Account, Household, Person, PrivacyScope } from "@kaki/core";
import {
  HouseholdFieldCipher,
  HouseholdGraphStore,
  HouseholdMemoryStore,
  HouseholdVectorIndex,
  type BgeM3EmbeddingProvider,
  type Preference,
} from "../src/index.js";
import { SqliteMemoryTestRepository } from "./sqlite-memory-repository.js";
import { DeterministicTestKeyBroker } from "./test-keys.js";

const now = "2026-08-24T00:00:00.000Z";
const householdScope: PrivacyScope = {
  audience: { kind: "household" },
  sensitivity: "household",
};
const base = (id: string, householdId = "h1", privacy: PrivacyScope = householdScope) => ({
  id,
  householdId,
  createdAt: now,
  updatedAt: now,
  version: 1,
  privacy,
});

function createGraph(repository: SqliteMemoryTestRepository): HouseholdGraphStore {
  return new HouseholdGraphStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
}

function household(): Household {
  return {
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
}

function person(): Person {
  return {
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
}

test("household graph resolves blind-indexed speakers without crossing household walls", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = createGraph(repository);
  await graph.upsert(household());
  await graph.upsert(person());
  await graph.bindSpeaker("h1", "wei", "whatsapp", "wa:wei");
  assert.equal((await graph.resolveSpeaker("h1", "whatsapp", "wa:wei"))?.id, "wei");
  assert.equal(await graph.resolveSpeaker("h2", "whatsapp", "wa:wei"), undefined);
  await assert.rejects(graph.bindSpeaker("h1", "missing", "whatsapp", "wa:x"), /not-found/u);
});

test("graph privacy, child-safe retrieval, key references and safe export are enforced", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = createGraph(repository);
  await graph.upsert({ ...household(), encryptionKeyRef: "secret://households/h1" });
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
  await graph.upsert(preference);
  assert.equal(await graph.get("pref", "h1", "child"), undefined);
  assert.equal(await graph.get("pref", "h1", "mum", undefined, true), undefined);
  assert.match(((await graph.get("pref", "h1", "mum")) as Preference).value, /S\*\*\*D/u);
  const exported = await graph.exportMarkdown("h1");
  assert.doesNotMatch(exported, /secret:\/\//u);
  assert.doesNotMatch(exported, /S1234567D/u);
});

test("entity writes validate closed runtime schemas and use optimistic versions", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = createGraph(repository);
  await graph.upsert(household());
  await assert.rejects(graph.upsert(household()), /version-conflict/u);
  await graph.upsert({ ...household(), version: 2, displayName: "New Home" });
  assert.equal((await graph.get("h1", "h1"))?.version, 2);
  await assert.rejects(
    graph.upsert({ ...household(), id: "other", unexpected: true }),
    /field-rejected:unexpected/u,
  );
});

test("account records reject credential-like extra fields", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = createGraph(repository);
  const unsafe = {
    ...base("account"),
    kind: "account",
    provider: "bank",
    displayLabel: "Everyday",
    capabilities: ["read"],
    password: "hunter2",
  } as unknown as Account;
  await assert.rejects(graph.upsert(unsafe), /field-rejected:password/u);
});

test("bge-m3 vectors survive restart, reject dimension drift, and delete by household", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kaki-memory-vector-"));
  const file = join(directory, "shared.sqlite");
  const provider = embeddingProvider(3);
  const firstRepository = new SqliteMemoryTestRepository(file);
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  const first = new HouseholdVectorIndex(firstRepository, cipher, provider);
  const firstMemory = new HouseholdMemoryStore(firstRepository, cipher);
  await firstMemory.addMemory({
    id: "kopi",
    householdId: "h1",
    kind: "preference",
    text: "kopi C siew dai",
  });
  await first.upsertText({ id: "kopi", householdId: "h1", text: "kopi C siew dai" });
  await first.upsertText({ id: "tea", householdId: "h2", text: "teh O kosong" });
  firstRepository.close();

  const raw = new DatabaseSync(file);
  const persisted = raw
    .prepare("SELECT values_ciphertext FROM memory_vectors WHERE id='kopi'")
    .get() as Record<string, unknown>;
  assert.match(String(persisted.values_ciphertext), /^v1\./u);
  assert.doesNotMatch(String(persisted.values_ciphertext), /\[1,0,0\]/u);
  raw.close();

  using secondRepository = new SqliteMemoryTestRepository(file);
  const restored = new HouseholdVectorIndex(secondRepository, cipher, provider);
  assert.deepEqual(await restored.queryText("h1", "kopi", 5), [
    { id: "kopi", householdId: "h1", score: 1 },
  ]);
  const changedModelShape = new HouseholdVectorIndex(
    secondRepository,
    cipher,
    embeddingProvider(2),
  );
  await assert.rejects(changedModelShape.queryText("h1", "kopi"), /model-dimension-mismatch/u);
  const restoredMemory = new HouseholdMemoryStore(secondRepository, cipher);
  assert.equal(await restoredMemory.deleteMemory("kopi", "h2"), false);
  assert.equal(await restoredMemory.deleteMemory("kopi", "h1"), true);
  assert.deepEqual(await restored.queryText("h1", "kopi"), []);
});

function embeddingProvider(dimension: number): BgeM3EmbeddingProvider {
  return {
    model: "BAAI/bge-m3",
    dimension,
    async embed(texts) {
      return texts.map((text) => {
        const basis = text.toLocaleLowerCase("und").includes("kopi") ? [1, 0, 0] : [0, 1, 0];
        return basis.slice(0, dimension);
      });
    },
  };
}
