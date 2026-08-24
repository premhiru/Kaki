# Security agent handoff

## Built

- Opaque, task-and-scope-bound secret handles over an injected OS keychain/encrypted backend; callers never receive a general secret store.
- HMAC-signed capability tokens bound to task, household, executor audience, canonical `@kaki/core` risk categories, scopes, expiry, and optional single use.
- Workspace-only path resolution with realpath/symlink containment and an approval-required executable allowlist that rejects shell metacharacters, traversal, and destructive commands.
- HMAC-chained, canonical, recursively redacted audit records with full-chain verification.
- Explicit untrusted-content assessments for WhatsApp text, image OCR, PDF text, vendor replies, and web content. Untrusted instructions cannot independently authorize messages, bookings, money, account changes, Singpass, or data sharing.
- Recursive log redaction and a fail-closed memory admission check for identifiers, cards, credentials, cookies, bearer tokens, API keys, OTPs, and passports.
- Outbound session guard for logout, ban, 429/rate-limit, and bounded network backoff, complementing channel transport reconnection.
- Dedicated dependency/security workflow and red-team unit coverage.

## Integration requirements

- Production implements `SecretBackend` using the OS keychain or an encrypted local store and exposes only `SecretBroker` handles to tools.
- Gateway issues capability tokens immediately before dispatch; each node verifies audience, task, household, scope, and risk immediately before execution. Irreversible operations consume single-use tokens.
- Every tool/surface call appends an audit record after policy and again after outcome/reconciliation. Persist records append-only and protect the audit HMAC key separately.
- Media/document/vendor extraction is always tagged with `UntrustedSource`. Models may summarize it, but side effects require independent trusted user intent plus normal policy/approval.
- Apply `redactJson` before logs/traces and `assertMemorySafe` before memory writes. Sensitive evidence stays in the expiring evidence store.

## Test

```sh
pnpm --filter @kaki/security lint
pnpm --filter @kaki/security test
node scripts/qa/replay-fixtures.mjs --tag security
node scripts/qa/secrets-scan.mjs
```

## Open issues

- The repository supplies backend contracts, not platform-specific macOS Keychain/libsecret/Windows Credential Manager bindings.
- Files created concurrently between path authorization and use require the executor to open via safe descriptor semantics; never authorize then reopen an arbitrary path.
- Live channel/provider traces still need redaction review before release evidence is retained.
