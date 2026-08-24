# Channels agent handoff

## Built

- `@kaki/channels` defines the shared normalized inbound/outbound contract for WhatsApp, Telegram, WebChat, LINE, Zalo, Viber, Messenger, and WeChat.
- `WhatsAppChannel` is a Baileys-facing production port with persistent-auth-directory injection, allowlist/family-group/person resolution, group mention/reply handling, media/location normalization, numbered approval cards, reactions, typing/pacing hook, outbound vendor-thread admission, QR relink alerts, automatic bounded-backoff reconnect, and logout/ban/429 outbound suspension.
- `TelegramChannel` exposes the control-plane command set and inline approval callbacks while rejecting non-allowlisted controllers.
- `WebChatChannel` accepts authenticated sessions only and supports replies and reactions.
- `VoiceNotePipeline` accepts OGG/Opus, MPEG, or MP4 media and delegates byte retrieval plus MERaLiON/Whisper transcription without losing code-switch metadata.
- `@kaki/channels-extra` provides consistent webhook adapters and injected production transports for LINE, Zalo, Viber, Messenger, and WeChat, plus deterministic fixture transports and timing-safe HMAC verification.

## Production wiring

Core supplies concrete transports at composition time:

- Baileys implements `WhatsAppTransport`; its multi-file auth state lives at `~/.kaki/wa/` and never crosses the interface.
- Telegram Bot API implements `TelegramTransport`, including callback acknowledgement and native inline buttons.
- The gateway WebSocket server implements `WebChatTransport` after authenticating a UI session.
- Provider SDK/webhook modules implement `RegionalTransport`; webhook routes must verify the raw request body before parsing and calling `normalise`.
- The models package implements `VoiceAsr` with MERaLiON-2 and Whisper fallback. Channel transports implement `AudioFetcher` for authenticated media downloads.
- Security pacing implements `OutboundGate`; the channel displays typing state only for the returned delay.

## Test

```sh
pnpm --filter @kaki/channels lint
pnpm --filter @kaki/channels test
pnpm --filter @kaki/channels-extra lint
pnpm --filter @kaki/channels-extra test
```

Tests cover unknown sender rejection, family/person mapping, vendor reply admission, mention handling, numbered approvals, reactions, voice transcription, Telegram callbacks, WebChat authentication, relink suspension, reconnect backoff, all five regional fixture transports, and webhook signatures.

## Open issues

- Concrete SDK dependencies and credentials remain deployment choices; only typed production wiring points are included here.
- Provider-specific webhook event parsing should live beside each HTTP route and convert to `RawWebhook` only after signature verification.
- Live WhatsApp ban/relink, Telegram callbacks, and provider webhook checks remain in `docs/VERIFY.md`.
