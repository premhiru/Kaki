import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { HouseholdFieldCipher, HouseholdMemoryStore } from "../src/index.js";
import { SqliteMemoryTestRepository } from "./sqlite-memory-repository.js";
import { DeterministicTestKeyBroker } from "./test-keys.js";

function createStore(file = ":memory:"): {
  repository: SqliteMemoryTestRepository;
  store: HouseholdMemoryStore;
} {
  const repository = new SqliteMemoryTestRepository(file);
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  return { repository, store };
}

test("blind search indexes stay bounded before persistence", async () => {
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  const tokens = await cipher.searchTokens(
    "h1",
    Array.from({ length: 400 }, (_, index) => `token${String(index).padStart(3, "0")}`).join(" "),
  );

  assert.equal(tokens.split(" ").length, 256);
  assert.equal(
    tokens.split(" ").every((token) => /^[a-f0-9]{64}$/u.test(token)),
    true,
  );
});

test("blind-token FTS recall respects household and per-person privacy walls", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  await store.addMemory({
    householdId: "h1",
    kind: "preference",
    text: "Mum prefers kopi C siew dai",
  });
  await store.addMemory({
    householdId: "h1",
    kind: "medical",
    text: "Mum has a private clinic appointment",
    scopePersonId: "mum",
  });
  await store.addMemory({
    householdId: "h2",
    kind: "preference",
    text: "Mum prefers kopi O",
  });

  assert.deepEqual(
    (await store.recall("kopi", "h1", "child")).map((entry) => entry.text),
    ["Mum prefers kopi C siew dai"],
  );
  assert.equal((await store.recall("clinic", "h1", "child")).length, 0);
  assert.equal((await store.recall("clinic", "h1", "mum")).length, 1);
});

test("SQLite persists only ciphertext and blind index tokens across restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kaki-memory-cipher-"));
  const file = join(directory, "shared.sqlite");
  const first = createStore(file);
  const entry = await first.store.addMemory({
    householdId: "h1",
    kind: "preference",
    text: "Mum prefers kopi C siew dai",
  });
  first.repository.close();

  using raw = new DatabaseSync(file);
  const row = raw
    .prepare("SELECT payload_ciphertext, search_tokens FROM memory_entries WHERE id=?")
    .get(entry.id) as Record<string, unknown>;
  assert.match(String(row.payload_ciphertext), /^v1\./u);
  assert.doesNotMatch(String(row.payload_ciphertext), /kopi|Mum/u);
  assert.doesNotMatch(String(row.search_tokens), /kopi|mum/u);
  raw.close();

  const second = createStore(file);
  assert.equal((await second.store.recall("kopi", "h1"))[0]?.text, "Mum prefers kopi C siew dai");
  second.repository.close();

  using wrongKeyRepository = new SqliteMemoryTestRepository(file);
  const wrongKeyStore = new HouseholdMemoryStore(
    wrongKeyRepository,
    new HouseholdFieldCipher({
      async getHouseholdKey() {
        return new Uint8Array(32).fill(9);
      },
    }),
  );
  await assert.rejects(
    wrongKeyStore.getMemory(entry.id, "h1"),
    /ciphertext-authentication-failed/u,
  );
});

test("journey events can be listed, edited and deleted within a household", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  const event = await store.addJourney({
    householdId: "h1",
    taskId: "t1",
    title: "Ride booked",
    detail: "Driver assigned",
  });
  assert.equal(await store.editJourney(event.id, "h2", { detail: "leak" }), false);
  assert.equal(await store.editJourney(event.id, "h1", { detail: "Arriving in 4 min" }), true);
  assert.equal((await store.journey("h1"))[0]?.detail, "Arriving in 4 min");
  assert.equal(await store.deleteJourney(event.id, "h1"), true);
  assert.equal((await store.journey("h1")).length, 0);
});

test("concurrent journey edits reject the stale writer instead of losing an update", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  const event = await store.addJourney({
    householdId: "h1",
    taskId: "t1",
    title: "Ride booked",
    detail: "Driver assigned",
  });
  const results = await Promise.all([
    store.editJourney(event.id, "h1", { detail: "Four minutes" }),
    store.editJourney(event.id, "h1", { detail: "Five minutes" }),
  ]);
  assert.deepEqual(results.toSorted(), [false, true]);
});

test("untrusted writes reject extra fields, accessors, credentials and invalid privacy", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  await assert.rejects(
    store.addMemory({ householdId: "h1", kind: "note", text: "safe", extra: true }),
    /memory-input-invalid:extra/u,
  );
  await assert.rejects(
    store.addMemory({ householdId: "h1", kind: "note", text: "password=hunter2" }),
    /secret/u,
  );
  const accessor = Object.defineProperty({ householdId: "h1", kind: "note" }, "text", {
    enumerable: true,
    get: () => "must not run",
  });
  await assert.rejects(store.addMemory(accessor), /memory-input-invalid:text/u);
  await assert.rejects(
    store.addMemory({
      householdId: "h1",
      kind: "medical",
      text: "Clinic",
      privacy: { audience: { kind: "everybody" }, sensitivity: "medical" },
    }),
    /audience/u,
  );
});

test("memory ingestion masks identifiers and applies purpose and child walls", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  const entry = await store.addMemory({
    householdId: "h1",
    kind: "medical",
    text: "Clinic file S1234567D",
    privacy: {
      ownerPersonId: "mum",
      audience: { kind: "owner", personId: "mum" },
      sensitivity: "medical",
      purposes: ["care"],
    },
  });
  assert.match(entry.text, /S\*\*\*D/u);
  assert.equal((await store.recall("Clinic", "h1", "mum", 10, { purpose: "shopping" })).length, 0);
  assert.equal(
    (await store.recall("Clinic", "h1", "mum", 10, { purpose: "care", childSafe: true })).length,
    0,
  );
  assert.equal((await store.recall("Clinic", "h1", "mum", 10, { purpose: "care" })).length, 1);
});

test("journey export masks identifiers and stays household scoped", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const store = new HouseholdMemoryStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
  await store.addJourney({
    householdId: "h1",
    taskId: "t1",
    title: "Passport check",
    detail: "File E1234567",
  });
  await store.addJourney({
    householdId: "h2",
    taskId: "t2",
    title: "Other home",
    detail: "Must not leak",
  });
  const markdown = await store.exportJourneyMarkdown("h1");
  assert.match(markdown, /E\*\*\*/u);
  assert.doesNotMatch(markdown, /Must not leak/u);
});
