import assert from "node:assert/strict";
import test from "node:test";
import { HouseholdMemoryStore } from "../src/index.js";

test("FTS recall respects household and per-person privacy walls", () => {
  using store = new HouseholdMemoryStore(":memory:");
  store.addMemory({ householdId: "h1", kind: "preference", text: "Mum prefers kopi C siew dai" });
  store.addMemory({
    householdId: "h1",
    kind: "medical",
    text: "Mum has a private clinic appointment",
    scopePersonId: "mum",
  });
  store.addMemory({ householdId: "h2", kind: "preference", text: "Mum prefers kopi O" });

  assert.deepEqual(
    store.recall("kopi", "h1", "child").map((entry) => entry.text),
    ["Mum prefers kopi C siew dai"],
  );
  assert.equal(store.recall("clinic", "h1", "child").length, 0);
  assert.equal(store.recall("clinic", "h1", "mum").length, 1);
});

test("journey events can be listed, edited and deleted within a household", () => {
  using store = new HouseholdMemoryStore(":memory:");
  const event = store.addJourney({
    householdId: "h1",
    taskId: "t1",
    title: "Ride booked",
    detail: "Driver assigned",
  });
  assert.equal(store.editJourney(event.id, "h2", { detail: "leak" }), false);
  assert.equal(store.editJourney(event.id, "h1", { detail: "Arriving in 4 min" }), true);
  assert.equal(store.journey("h1")[0]?.detail, "Arriving in 4 min");
  assert.equal(store.deleteJourney(event.id, "h1"), true);
  assert.equal(store.journey("h1").length, 0);
});

test("memory ingestion masks identifiers, rejects credentials, and applies purpose/child walls", () => {
  using store = new HouseholdMemoryStore(":memory:");
  const entry = store.addMemory({
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
  assert.match(entry.text, /S\*\*\*D/);
  assert.equal(store.recall("Clinic", "h1", "mum", 10, { purpose: "shopping" }).length, 0);
  assert.equal(
    store.recall("Clinic", "h1", "mum", 10, { purpose: "care", childSafe: true }).length,
    0,
  );
  assert.equal(store.recall("Clinic", "h1", "mum", 10, { purpose: "care" }).length, 1);
  assert.throws(
    () => store.addMemory({ householdId: "h1", kind: "note", text: "password=hunter2" }),
    /secret/,
  );
});

test("journey export masks identifiers and stays household scoped", () => {
  using store = new HouseholdMemoryStore(":memory:");
  store.addJourney({
    householdId: "h1",
    taskId: "t1",
    title: "Passport check",
    detail: "File E1234567",
  });
  store.addJourney({
    householdId: "h2",
    taskId: "t2",
    title: "Other home",
    detail: "Must not leak",
  });
  const markdown = store.exportJourneyMarkdown("h1");
  assert.match(markdown, /E\*\*\*/);
  assert.doesNotMatch(markdown, /Must not leak/);
});
