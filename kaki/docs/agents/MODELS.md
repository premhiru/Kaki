# Models agent handoff

## Built

- Configurable policy routing for frontier planning/tool/vision, cheap local normalisation/heartbeats, SEA-LION regional generation, Typhoon Thai, Sahabat Indonesian, SEA-Guard, MERaLiON, Whisper fallback, and bge-m3.
- Injectable real HTTP adapters for Anthropic and OpenAI-compatible OpenAI/OpenRouter/Ollama/vLLM/SEA-LION/Typhoon/Sahabat endpoints. API keys remain request headers and are never returned or logged.
- `ModelRuntime` with provider availability, one-step fallback, task/locale overrides, hard pre-call budgets, actual token cost accounting, TTL cache, and cached-call accounting.
- Deterministic SEA language identification and Singapore code-switch normalisation with entity extraction.
- MERaLiON-first ASR with low-confidence/error fallback to Whisper, OpenAI-compatible multipart transcription transport, optional TTS (off by default), SEA-Guard outbound assertion, and bge-m3 embedding transport.

## Production wiring

Provide an `HttpClient` that enforces TLS, abort timeouts, proxy policy, and redacted structured logging. Instantiate one adapter per configured provider and pass only available adapters to `ModelRuntime`. Configure pricing and total/task caps from household settings. Do not cache safety, external-message, secret-bearing, or personal medical/financial prompts.

## Test

```sh
pnpm --filter @kaki/models lint
pnpm --filter @kaki/models test
```

Fixture tests cover provider wire formats, specialist/local routing, overrides, budget denial, fallback, cache hits, exact cost accounting, language/code-switch normalisation, MERaLiON fallback, disabled TTS, SEA-Guard denial, and bge-m3.

## Open issues

- Live provider model IDs and prices change; deployment must refresh configured values and run provider smoke tests.
- Streaming and tool-call delta assembly are not yet exposed by the provider contract.
- MERaLiON, SEA-Guard, and TTS voice quality require live model assets and native-speaker evaluation.
