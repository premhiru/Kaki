# Channels agent handoff

## Built

- `@kaki/channels` defines the shared normalized inbound/outbound contract for WhatsApp, Telegram, WebChat, LINE, Zalo, Viber, Messenger, and WeChat.
- `WhatsAppChannel` is a Baileys-facing production port with persistent-auth-directory injection, allowlist/family-group/person resolution, group mention/reply handling, media/location normalization, numbered approval cards, reactions, read/presence/typing hooks, outbound vendor-thread admission, automatic bounded-backoff reconnect, and logout/ban/429 outbound suspension.
- Raw linked-device QR payloads never enter `AlertSink`. `TrustedLocalQrSurface` keeps the latest QR in an expiring in-memory slot and requires both a loopback socket address and an authenticated operator session to read it; the alert carries only the local wizard path and expiry.
- `TelegramChannel` exposes the control-plane command set and inline approval callbacks while rejecting non-allowlisted controllers.
- `WebChatChannel` accepts authenticated sessions only and supports replies and reactions.
- `VoiceNotePipeline` accepts OGG/Opus, MPEG, or MP4 media. `FallbackVoiceAsr` records MERaLiON/Whisper ownership without losing code-switch metadata; `VoiceReplyPipeline` is disabled unless TTS is explicitly enabled.
- `@kaki/channels-extra` provides flagged webhook adapters and injected production transports for LINE, Zalo, Viber, Messenger, and WeChat. The signed raw envelope is verified before household identity resolution or normalization.

## Production wiring

Core supplies concrete transports at composition time:

- Baileys implements `WhatsAppTransport`; its multi-file auth state lives at `~/.kaki/wa/` and never crosses the interface.
- Telegram Bot API implements `TelegramTransport`, including callback acknowledgement and native inline buttons.
- The gateway WebSocket server implements `WebChatTransport` after authenticating a UI session.
- Provider SDK/webhook modules implement `RegionalTransport` and pass the exact signed raw body with the parsed provider event. The adapter rejects an invalid signature before parsing it into Kaki ingress and ignores non-household identities with an optional recorded reason.
- The models package implements `VoiceAsr` with MERaLiON-2 and Whisper fallback. Channel transports implement `AudioFetcher` for authenticated media downloads.
- Security pacing implements `OutboundGate`; the channel displays typing state only for the returned delay.

## Test

```sh
pnpm --filter @kaki/channels lint
pnpm --filter @kaki/channels test
pnpm --filter @kaki/channels-extra lint
pnpm --filter @kaki/channels-extra test
```

Focused tests cover 13 channel and 7 regional-channel behaviors, including raw QR non-leak plus loopback/auth denial, unknown sender rejection, family/person mapping, vendor reply admission, mention handling, reactions, ASR fallback, TTS default-off, Telegram callbacks, WebChat authentication, relink suspension, reconnect backoff, all five regional transport contracts, and signed-envelope verification.

## Open issues

- Concrete SDK dependencies and credentials remain deployment choices; only typed production wiring points are included here.
- Provider-specific webhook event parsing should live beside each HTTP route and convert to `RawWebhook` while preserving the exact raw body used for adapter verification.
- Live WhatsApp QR/relink/ban behavior, authenticated Telegram callbacks, media downloads, and LINE/Zalo/Viber/Messenger/WeChat provider webhooks still require dedicated accounts and remain in `docs/VERIFY.md`.
