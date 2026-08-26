import fs from "node:fs";
import path from "node:path";
import { createPluginStateKeyedStoreForTests } from "openclaw/plugin-sdk/plugin-state-test-runtime";
import { resolvePreferredOpenClawTmpDir } from "openclaw/plugin-sdk/temp-path";
import { describe, expect, it } from "vitest";
import { KakiPluginStateMemoryRepository } from "./memory-repository.js";

const stateDir = fs.mkdtempSync(
  path.join(resolvePreferredOpenClawTmpDir(), "kaki-memory-adapter-"),
);
const repository = new KakiPluginStateMemoryRepository(
  createPluginStateKeyedStoreForTests("kaki", {
    namespace: "memory-adapter-test",
    maxEntries: 100,
    overflowPolicy: "reject-new",
    env: { ...process.env, OPENCLAW_STATE_DIR: stateDir },
  }),
);

describe("Kaki shared-SQLite memory adapter", () => {
  it("deletes a memory and its same-id vector as one linked record", async () => {
    await repository.insertMemory({
      id: "memory-1",
      householdId: "home",
      kind: "note",
      payloadCiphertext: "ciphertext",
      searchTokens: "token",
      createdAt: "2026-08-26T00:00:00.000Z",
      updatedAt: "2026-08-26T00:00:00.000Z",
    });
    await repository.putVector({
      id: "memory-1",
      householdId: "home",
      model: "BAAI/bge-m3",
      dimension: 2,
      valuesCiphertext: "vector-ciphertext",
      updatedAt: "2026-08-26T00:00:00.000Z",
    });

    await expect(repository.deleteMemory("memory-1", "home")).resolves.toBe(true);
    await expect(repository.findMemory("memory-1", "home")).resolves.toBeUndefined();
    await expect(repository.listVectors("home", 10)).resolves.toEqual({
      rows: [],
      truncated: false,
    });
  });

  it("atomically prevents one speaker fingerprint from binding to two people", async () => {
    for (const id of ["person-1", "person-2"]) {
      await repository.putEntity(
        {
          id,
          householdId: "speaker-home",
          kind: "person",
          version: 1,
          payloadCiphertext: `ciphertext-${id}`,
          updatedAt: "2026-08-26T00:00:00.000Z",
        },
        null,
      );
    }

    const results = await Promise.all(
      ["person-1", "person-2"].map((personId) =>
        repository.bindSpeaker({
          householdId: "speaker-home",
          personId,
          channel: "whatsapp",
          jidFingerprint: "same-fingerprint",
          createdAt: "2026-08-26T00:00:00.000Z",
        }),
      ),
    );

    expect(results.toSorted()).toEqual(["conflict", "created"]);
    const boundPerson = await repository.findSpeaker(
      "speaker-home",
      "whatsapp",
      "same-fingerprint",
    );
    expect(["person-1", "person-2"]).toContain(boundPerson);
    await repository.deleteEntity(boundPerson!, "speaker-home");
    await expect(
      repository.findSpeaker("speaker-home", "whatsapp", "same-fingerprint"),
    ).resolves.toBeUndefined();
  });
});
