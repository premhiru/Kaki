# Models agent handoff

## Built

- Configurable policy routing for frontier planning/tool/vision, cheap local normalisation/heartbeats, SEA-LION regional generation, Typhoon Thai, Sahabat Indonesian, SEA-Guard, MERaLiON, Whisper fallback, and bge-m3.
- Real Anthropic and OpenAI-compatible adapters plus `BoundedHttpClient`: exact-origin allowlists, HTTPS by default, DNS-pinned SSRF checks, redirect caps, response-byte caps, timeout caps, and selected response headers only. Explicit cleartext origins must resolve to a private network. API keys remain request headers and are never returned or logged.
- `OpenClawRuntimeProvider` routes general completions through the host's configured model and credential owner. Locale-specialist providers are selected only when their adapter is actually installed; otherwise the host route remains live.
- `ModelRuntime` with provider availability, one-step fallback, task/locale overrides, process-serialized worst-case budget reservations held through durable accounting, actual/host-accounted cost, durable cost/cache contracts, and cached-call accounting. Cache writes require an explicit `public` data classification; household, personal, secret, safety, ASR, TTS, and vision requests fail closed to uncached execution.
- Deterministic SEA language identification and Singapore code-switch normalisation with entity extraction.
- MERaLiON-first ASR with low-confidence/error fallback to Whisper, OpenAI-compatible multipart transcription transport, optional TTS (off by default), SEA-Guard outbound assertion, and bge-m3 embedding transport.

## Production wiring

Use `BoundedHttpClient` for direct provider endpoints and declare every exact origin. Use the Kaki plugin's `createKakiHostModelRuntime` integration when Kaki should inherit the OpenClaw agent's configured model/auth; it persists cache and cost events in bounded host SQLite keyed stores. The caller must supply total/task budgets from an operator-owned setting. Direct provider adapters remain useful for SEA specialists, MERaLiON, SEA-Guard, and bge-m3.

The host completion seam propagates the caller's `AbortSignal`. It currently rejects `jsonSchema` requests because the public host completion contract does not expose schema-constrained output; use a direct OpenAI-compatible adapter for that contract instead of silently accepting unstructured output.

## Test

```sh
pnpm --filter @kaki/models lint
pnpm --filter @kaki/models test
```

Tests cover provider wire formats, exact-origin/TLS/response-limit enforcement, host runtime routing/abort/schema behavior, durable cache/cost round trips, concurrent budget reservation, sensitive-data cache refusal, specialist/local availability routing, overrides, budget denial, fallback, exact cost accounting, language/code-switch normalisation, MERaLiON fallback, disabled TTS, SEA-Guard denial, and bge-m3.

## Open issues

- Live direct-provider proof still requires operator-supplied endpoints and credentials; no paid call or credential is bundled. Model IDs and prices change, so deployment must refresh configured values and run provider smoke tests.
- The host route requires a running authenticated OpenClaw Gateway with `runtime.llm.complete` permission for the Kaki plugin and a configured model profile.
- Streaming and tool-call delta assembly are not yet exposed by the provider contract.
- MERaLiON, SEA-Guard, and TTS voice quality require live model assets and native-speaker evaluation.
