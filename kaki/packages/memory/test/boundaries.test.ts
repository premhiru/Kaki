import assert from "node:assert/strict";
import test from "node:test";
import type { PrivacyScope } from "@kaki/core";
import {
  HouseholdFieldCipher,
  HouseholdGraphStore,
  HouseholdMemoryStore,
  HouseholdVectorIndex,
  type BgeM3EmbeddingProvider,
  type StoredVectorRow,
} from "../src/index.js";
import { SqliteMemoryTestRepository } from "./sqlite-memory-repository.js";
import { DeterministicTestKeyBroker } from "./test-keys.js";

const now = "2026-08-24T00:00:00.000Z";
const householdPrivacy: PrivacyScope = {
  audience: { kind: "household" },
  sensitivity: "household",
};

function entityBase(id: string, privacy: PrivacyScope = householdPrivacy) {
  return {
    id,
    householdId: "h1",
    createdAt: now,
    updatedAt: now,
    version: 1,
    privacy,
  };
}

function graphStore(repository: SqliteMemoryTestRepository): HouseholdGraphStore {
  return new HouseholdGraphStore(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
  );
}

function embeddingProvider(
  values: readonly number[] | undefined,
  dimension = values?.length ?? 3,
): BgeM3EmbeddingProvider {
  return {
    model: "BAAI/bge-m3",
    dimension,
    async embed() {
      return values === undefined ? [] : [values];
    },
  };
}

test("field encryption binds ciphertext to household, context, and a 32-byte root key", async () => {
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  const envelope = await cipher.encrypt("h1", "memory:one:payload", "private text");

  assert.equal(await cipher.decrypt("h1", "memory:one:payload", envelope), "private text");
  await assert.rejects(cipher.decrypt("h2", "memory:one:payload", envelope), /authentication/u);
  await assert.rejects(cipher.decrypt("h1", "memory:two:payload", envelope), /authentication/u);
  for (const malformed of ["", "v2.a.b.c", "v1.a.b", "v1...ciphertext"]) {
    await assert.rejects(
      cipher.decrypt("h1", "memory:one:payload", malformed),
      /ciphertext-invalid/u,
    );
  }
  await assert.rejects(cipher.encrypt("", "context", "value"), /household-required/u);
  const shortKeyCipher = new HouseholdFieldCipher({
    async getHouseholdKey() {
      return new Uint8Array(31);
    },
  });
  await assert.rejects(shortKeyCipher.encrypt("h1", "context", "value"), /32-bytes/u);
});

test("blind indexes normalize, deduplicate, bound, and isolate searchable identifiers", async () => {
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  const repeated = await cipher.searchTokens("h1", " Kopi kopi ＫＯＰＩ! ");
  assert.equal(repeated.split(" ").length, 1);
  assert.equal(repeated.length, 64);
  assert.notEqual(repeated, await cipher.searchTokens("h2", "kopi"));
  assert.notEqual(
    await cipher.speakerFingerprint("h1", "whatsapp", "same-user"),
    await cipher.speakerFingerprint("h1", "telegram", "same-user"),
  );
  assert.equal(await cipher.searchTokens("h1", "---"), "");
});

test("graph accepts every entity shape and preserves optional fields and privacy audiences", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = graphStore(repository);
  const peoplePrivacy: PrivacyScope = {
    ownerPersonId: "mum",
    audience: { kind: "people", personIds: ["mum", "dad"] },
    sensitivity: "private",
    purposes: ["care"],
  };
  const entities = [
    {
      ...entityBase("place"),
      kind: "place",
      label: "Home",
      countryCode: "sg",
      formattedAddress: "1 Main Street",
      latitude: 1.3,
      longitude: 103.8,
      postalCode: "123456",
      planningArea: "Central",
      source: "manual",
    },
    {
      ...entityBase("vendor", peoplePrivacy),
      kind: "vendor",
      displayName: "Handyman",
      trade: "repairs",
      channelIdentities: [
        { channel: "phone", address: "+6500000000" },
        { channel: "email", address: "vendor@example.invalid" },
      ],
      rating: 4.5,
      ratingSource: "household",
      lastQuoteSummary: "$80 estimate",
      lastContactAt: now,
      threadApproved: true,
    },
    {
      ...entityBase("account"),
      kind: "account",
      provider: "calendar",
      displayLabel: "Family",
      ownerPersonId: "mum",
      capabilities: ["read", "prepare", "submit"],
      secretHandle: "secret://accounts/family",
    },
    {
      ...entityBase("routine"),
      kind: "routine",
      title: "School run",
      schedule: "weekdays",
      placeIds: ["place"],
    },
    {
      ...entityBase("event"),
      kind: "event",
      title: "Appointment",
      startsAt: now,
      endsAt: "2026-08-24T01:00:00.000Z",
      placeId: "place",
    },
  ];

  for (const entity of entities) await graph.upsert(entity);
  const stored = await graph.list("h1", "mum", "care");
  assert.deepEqual(stored.map((entity) => entity.kind).toSorted(), [
    "account",
    "event",
    "place",
    "routine",
    "vendor",
  ]);
  assert.equal(stored.find((entity) => entity.kind === "vendor")?.privacy.audience.kind, "people");
});

test("graph rejects malformed entity and privacy values before persistence", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const graph = graphStore(repository);
  const validPlace = {
    ...entityBase("place"),
    kind: "place",
    label: "Home",
    countryCode: "sg",
    formattedAddress: "1 Main Street",
    latitude: 1.3,
    longitude: 103.8,
  };
  const invalidCases: readonly [unknown, RegExp][] = [
    [{ ...validPlace, latitude: 91 }, /coordinates-invalid/u],
    [{ ...validPlace, longitude: Number.NaN }, /longitude-invalid/u],
    [{ ...validPlace, countryCode: "xx" }, /country-invalid/u],
    [{ ...validPlace, version: 0 }, /version-invalid/u],
    [{ ...validPlace, createdAt: "not-a-date" }, /created-at-invalid/u],
    [{ ...validPlace, privacy: { ...householdPrivacy, sensitivity: "secret" } }, /sensitivity/u],
    [
      { ...validPlace, privacy: { audience: { kind: "owner" }, sensitivity: "private" } },
      /audience-person/u,
    ],
    [
      {
        ...validPlace,
        privacy: { audience: { kind: "people", personIds: "mum" }, sensitivity: "private" },
      },
      /audience-people/u,
    ],
    [Object.assign(Object.create({ inherited: true }) as object, validPlace), /entity-invalid/u],
    [Object.defineProperty({ ...validPlace }, "hidden", { value: true }), /entity-invalid/u],
    [
      {
        ...entityBase("vendor"),
        kind: "vendor",
        displayName: "Vendor",
        trade: "repairs",
        channelIdentities: [],
        rating: 6,
        threadApproved: true,
      },
      /rating-invalid/u,
    ],
    [
      {
        ...entityBase("account"),
        kind: "account",
        provider: "bank",
        displayLabel: "Bank",
        capabilities: ["transfer"],
      },
      /capabilities-invalid/u,
    ],
    [
      {
        ...entityBase("account"),
        kind: "account",
        provider: "bank",
        displayLabel: "Bank",
        capabilities: ["read"],
        secretHandle: "plaintext-secret",
      },
      /account-handle-invalid/u,
    ],
  ];

  for (const [input, expected] of invalidCases) await assert.rejects(graph.upsert(input), expected);
  assert.deepEqual(await graph.list("h1"), []);
});

test("vector boundaries reject invalid identities, embeddings, capacity, and persisted payloads", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  assert.throws(
    () => new HouseholdVectorIndex(repository, cipher, embeddingProvider([1], 0)),
    /dimension-invalid/u,
  );

  const validIndex = new HouseholdVectorIndex(repository, cipher, embeddingProvider([1, 0, 0]));
  await assert.rejects(
    validIndex.upsertText({ id: "", householdId: "h1", text: "text" }),
    /identity/u,
  );
  await assert.rejects(validIndex.upsertText({ id: "id", householdId: "h1", text: " " }), /text/u);
  await assert.rejects(validIndex.queryText("", "query"), /query-invalid/u);
  await assert.rejects(validIndex.queryText("h1", "query", 0), /limit-invalid/u);

  const missing = new HouseholdVectorIndex(repository, cipher, embeddingProvider(undefined, 3));
  await assert.rejects(
    missing.upsertText({ id: "id", householdId: "h1", text: "text" }),
    /embedding-missing/u,
  );
  await assert.rejects(missing.queryText("h1", "query"), /embedding-missing/u);

  for (const values of [
    [1, 2],
    [1, Number.NaN, 3],
  ]) {
    const invalid = new HouseholdVectorIndex(repository, cipher, embeddingProvider(values, 3));
    await assert.rejects(
      invalid.upsertText({ id: "id", householdId: "h1", text: "text" }),
      /dimension-mismatch/u,
    );
  }

  await repository.putVector({
    id: "bad-json",
    householdId: "h1",
    model: "BAAI/bge-m3",
    dimension: 3,
    valuesCiphertext: await cipher.encrypt("h1", "vector:bad-json:values", "not-json"),
    updatedAt: now,
  });
  await assert.rejects(validIndex.queryText("h1", "query"), /payload-invalid/u);
  assert.equal(await validIndex.delete("bad-json", "h1"), true);

  await repository.putVector({
    id: "not-array",
    householdId: "h1",
    model: "BAAI/bge-m3",
    dimension: 3,
    valuesCiphertext: await cipher.encrypt("h1", "vector:not-array:values", "{}"),
    updatedAt: now,
  });
  await assert.rejects(validIndex.queryText("h1", "query"), /payload-invalid/u);
  assert.equal(await validIndex.delete("not-array", "h1"), true);

  await validIndex.upsertText({ id: "zero", householdId: "h1", text: "zero" });
  const zeroIndex = new HouseholdVectorIndex(repository, cipher, embeddingProvider([0, 0, 0]));
  assert.deepEqual(await zeroIndex.queryText("h1", "zero", 500), [
    { id: "zero", householdId: "h1", score: 0 },
  ]);
});

test("vector query refuses a repository result truncated at the household safety cap", async () => {
  class TruncatedRepository extends SqliteMemoryTestRepository {
    public override async listVectors(
      _householdId: string,
      _limit: number,
    ): Promise<{ readonly rows: readonly StoredVectorRow[]; readonly truncated: boolean }> {
      return { rows: [], truncated: true };
    }
  }

  using repository = new TruncatedRepository(":memory:");
  const index = new HouseholdVectorIndex(
    repository,
    new HouseholdFieldCipher(new DeterministicTestKeyBroker()),
    embeddingProvider([1, 0, 0]),
  );
  await assert.rejects(index.queryText("h1", "query"), /capacity-exceeded/u);
});

test("memory and journey reads fail closed on malformed authenticated payloads", async () => {
  using repository = new SqliteMemoryTestRepository(":memory:");
  const cipher = new HouseholdFieldCipher(new DeterministicTestKeyBroker());
  const store = new HouseholdMemoryStore(repository, cipher);
  await repository.insertMemory({
    id: "invalid-memory",
    householdId: "h1",
    kind: "note",
    payloadCiphertext: await cipher.encrypt("h1", "memory:invalid-memory:payload", "[]"),
    searchTokens: await cipher.searchTokens("h1", "invalid"),
    createdAt: now,
    updatedAt: now,
  });
  await assert.rejects(store.getMemory("invalid-memory", "h1"), /payload-invalid/u);

  await repository.insertJourney({
    id: "invalid-journey",
    householdId: "h1",
    taskId: "task",
    version: 1,
    payloadCiphertext: await cipher.encrypt(
      "h1",
      "journey:invalid-journey:payload",
      '{"title":"ok","detail":"ok","extra":true}',
    ),
    createdAt: now,
    updatedAt: now,
  });
  await assert.rejects(store.journey("h1"), /journey-payload-invalid/u);
});
