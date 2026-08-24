# MEMORY handoff

## Work completed

- Preserved the existing SQLite WAL, FTS5, journey and disposable-store implementation and added backward-compatible privacy metadata migration for existing databases.
- Added canonical household-graph persistence for `Household`, `Person`, `Place`, `Vendor`, `Account`, `Routine`, `Preference` and `Event` entities.
- Added household/person audience, sensitivity, purpose and child-safe checks on graph reads and FTS recall. Household filtering occurs in SQL and privacy filtering occurs again before return.
- Added channel JID to person binding/resolution scoped by household, with conflict and missing-person rejection.
- Enforced per-household encryption key references on household records. Raw key values are not accepted or exported.
- Restricted account records to the canonical existence/capability/secret-handle shape and rejected credential-like extra fields.
- Added memory and journey ingestion guards that reject credential/token patterns and mask NRIC/FIN/passport-like identifiers and long payment numbers before persistence.
- Hardened FTS input by converting free-form queries into quoted Unicode token conjunctions instead of accepting raw FTS syntax.
- Added memory get/delete, journey Markdown export, graph delete and privacy-filtered `MEMORY.md` export. Exports remove key/secret handles and reapply masking.
- Added a vector adapter contract and tenant-enforcing wrapper that filters mixed-provider results by household even if the underlying vector service ignores metadata.

## Verification

- `pnpm --filter @kaki/memory typecheck` — passed.
- `pnpm --filter @kaki/memory test` — passed: 8 tests.
- Tests cover FTS household/person/purpose/child walls, graph speaker identity, cross-household isolation, safe export, identifier masking, secret rejection, account-field rejection, mixed-tenant vector results, and journey edit/delete/export.
- Memory source, tests and package manifest formatted with Prettier.

## Open issues and live verification

- Graph and FTS/journey stores can use the same SQLite file but currently expose separate classes/connections. The integration layer should construct them from the same configured path; a future unified repository may coordinate multi-table transactions.
- Per-household encryption key references are validated, but application-layer field encryption and key rotation are not implemented in this package. The security/key-broker layer must resolve handles and encrypt sensitive entity JSON/backups without exposing key material here.
- `VectorAdapter` is intentionally provider-neutral. Add the bge-m3 embedding pipeline and a SQLite vector adapter, then test restart persistence, dimension mismatch and deletion reconciliation.
- FTS retrieves an oversized tenant-scoped candidate set and applies complex audience/purpose rules in process. This is safe but may miss a low-ranked permitted hit when many inaccessible hits rank first; a production query planner should express audience filters in SQL or page until enough permitted hits are found.
- Secret detection is defense in depth, not a complete DLP system. Runtime schemas, model-output filtering, screenshot/document redaction and key-broker controls remain required.
- Journey deletion removes the user-facing projection. Minimum append-only security audit retention belongs in the security audit store and must not be reconstructed from deleted journey content.
- Runtime schema validation and optimistic entity-version checks are still needed before accepting graph writes from channels/models. Current TypeScript types do not validate untrusted JSON.
- Graph export intentionally respects the requester's audience, but administrator export/backup needs a separate authenticated capability and encrypted format rather than bypassing privacy in `MEMORY.md`.
