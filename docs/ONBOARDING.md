# Onboarding

## Before starting

Use a dedicated assistant phone number and Android device. Create assistant-owned service accounts where terms permit, set a low wallet balance, and never copy personal banking credentials into `.env`, chat, memory, or logs.

Prepare:

- household name and locale;
- household members, relationships, preferred languages/registers, privacy scope, and dietary flags;
- home, work, school, clinic, commute, and emergency places;
- Telegram bot token and the Telegram user IDs allowed to control Kaki;
- model provider and public-data credentials;
- approval caps, with S$30 known-payee auto-cap and S$200 phone wallet cap as conservative defaults;
- dedicated Android endpoint and ADB/accessibility pairing details.

## Current CLI path

Copy `.env.example` to `.env`, edit it, then run:

```sh
pnpm kaki onboard
```

For automation:

```sh
KAKI_HOUSEHOLD_NAME="Tan household" KAKI_LOCALE=sg pnpm kaki onboard --non-interactive
```

The CLI currently persists core locale, household name, caps, channel flags, phone endpoint, Chrome profile, and model/ASR names. It does not yet provide the complete graphical wizard promised by the product specification.

## Production pairing sequence

1. Start the gateway and Telegram transport, then verify the controller allowlist.
2. Link the dedicated WhatsApp number. The Baileys transport stores auth state under `~/.kaki/wa/`; scan the QR only in a trusted local UI/terminal.
3. Map the family group JID and each sender JID to household/person IDs. Unknown direct senders remain ignored unless Kaki initiated that vendor thread.
4. Install and pair the Android companion, enable its accessibility and notification services, disable battery optimisation, and confirm screenshot/tap tests with a non-sensitive app.
5. Add places through OneMap search and review postal/unit parsing.
6. Set languages, register, privacy scope, dietary needs, commute routes, schools, and clinics for each person. Never infer dietary or medical facts.
7. Configure model, ASR, and optional TTS providers. TTS is off by default.
8. Review every approval policy and test money/bookings with fixtures before any live account.

## Health check

```sh
pnpm kaki status --deep
```

The command checks configured state and directory presence. A full live health result additionally requires active transport/node/provider probes; do not treat configuration presence as service reachability.
