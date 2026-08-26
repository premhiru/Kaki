# Memory owner contract

Kaki memory is a household-scoped, application-encrypted projection over the OpenClaw host's shared SQLite database. The package owns validation, privacy, encryption, blind indexes, and recall behavior. It does not open a database, create a runtime sidecar, resolve key material, or own schema migration.

## Production composition

Construct all memory surfaces with one `HouseholdMemoryRepository` implementation and one `HouseholdFieldCipher`:

- The host repository implements the contract with Kysely against `state/openclaw.sqlite`. `putEntity` is an atomic compare-and-swap; a stale entity version must return `false`.
- The key broker returns exactly 32 bytes for the requested household from an OS keychain or another host secret owner. Key bytes are never part of a memory row or export.
- Memory text, privacy metadata, graph entities, journey content, and vector values cross the repository boundary only as AES-256-GCM envelopes. Associated data binds every envelope to its household, record, and field.
- FTS5 indexes deterministic per-household HMAC tokens. It never indexes plaintext memory. The repository restricts candidates by household before the package decrypts and applies audience, purpose, and child-safe policy.
- Speaker lookup persists a per-household HMAC fingerprint of channel plus JID, not the JID.
- The vector owner requires an injected `BAAI/bge-m3` provider with a declared dimension. Vector values are encrypted before persistence; query decrypts only the selected household's rows and rejects model or dimension drift.

The package intentionally exports no production `node:sqlite` adapter. The SQLite/FTS5 implementation under `packages/memory/test/` is test support and must not be used by the runtime.

## Write boundary

`HouseholdMemoryStore.addMemory`, `addJourney`, `editJourney`, and `HouseholdGraphStore.upsert` accept untrusted values and validate closed runtime schemas before acting. They reject inherited or accessor-backed records, unknown fields, invalid privacy shapes, credentials, and oversized values. Free-text identifiers are masked before encryption; structured channel identities remain encrypted for lookup and are masked in exports. Account entities contain account existence and capabilities only; unexpected credential fields fail closed.

Graph updates are immutable revisions at the row contract: create uses version 1, and every update must atomically replace exactly the previous version. A version conflict is visible as `memory-entity-version-conflict`.

## Recall, export, and deletion

- Recall requires an exact household ID, blind-token FTS candidates, and the current speaker's privacy context.
- `MEMORY.md` and journey Markdown exports reapply identifier masking and omit secret handles and encryption-key references.
- Memory, entity, journey, and vector deletion are household-scoped. The repository deletes a memory and its same-ID vector atomically, and deletes a Person entity with its speaker bindings atomically. Journey deletion does not delete the separate security audit record.
- A wrong household key or altered context fails AES-GCM authentication; it never returns corrupted plaintext.

## Verification

Run from the repository root:

```powershell
pnpm --filter @kaki/memory typecheck
pnpm --filter @kaki/memory test
```

The tests use a real SQLite/FTS5 database and prove ciphertext-only persistence, blind-index recall after restart, household/person/purpose/child walls, closed schemas, accessor rejection, entity version conflicts, speaker isolation, safe exports, bge-m3 vector restart, dimension drift, and household-scoped deletion.

## Required host and live gates

These package tests do not prove production encryption at rest. Before the product can make that claim, the runtime must provide and live-test:

1. A Kysely `HouseholdMemoryRepository` in the canonical shared-state schema, including safe older-reader open/use and candidate-reopen proof. This work must follow the repository's SQLite schema policy; this package does not bump a schema version.
2. An OS-keychain/KMS-backed `HouseholdKeyBroker`, household key provisioning, rotation, recovery, and backup behavior.
3. A live local or configured bge-m3 embedding provider whose returned dimension matches the persisted contract.
4. Authenticated runtime wiring for speaker identity, `/journey`, edit/delete, and `MEMORY.md` export.
5. Backup and restore proof showing ciphertext remains decryptable only through the restored household key owner.
