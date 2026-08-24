# SEA-DATA handoff

## Work completed

- Replaced the single-file scaffold with separate profiles, EMV, national QR rail, regional client, and approval-handoff modules while preserving the original public exports.
- Added strict EMV TLV parsing, field encoding, CRC16-CCITT generation/verification, nested merchant-account parsing, duplicate-safe rail detection, and malformed-length rejection.
- Added validated decode/encode paths for DuitNow QR, QRIS, PromptPay, VietQR, and QR Ph. Decoded amounts include integer minor units, account proxies are masked, mismatched rail/currency/country and invalid CRC are surfaced, and strict rail decoders reject warnings.
- Added country profiles for MY/ID/TH/VN/PH with ISO/numeric currencies, national rail, channel, weather agency, identity handoff, apps and holiday context.
- Added a cross-border approval handoff that refuses invalid CRCs, always classifies as `money.transfer`, requires approval, binds destination/rail/currency/amount/merchant/reference plus a payload hash, and supports a regenerate-QR fallback when the source bank does not support the rail.
- Added injectable/cached/rate-limited regional public clients for official-agency weather hooks in all five starter markets, plus typed configurable public-holiday, prayer-time and MY causeway hooks. Unsupported hooks fail explicitly instead of silently switching to an unapproved third party.
- Preserved `REGIONAL_SOURCES` as a generated source catalogue for fixture/live-verification routing.
- Added deterministic fixture-transport tests for every QR rail, CRC tampering, approval material facts, caching, weather URL rendering, holidays, prayer time and causeway hooks.

## Verification

- `pnpm --filter @kaki/sea-data lint` (`tsc --noEmit`) — passed.
- `pnpm --filter @kaki/sea-data test` — passed: 1 file, 10 tests.
- Source and tests formatted with Prettier.

## Open issues and live verification

- The encoders generate structurally valid EMV payloads for deterministic fixtures. National scheme certification and real bank/wallet acceptance are still required before enabling payment; scheme-specific merchant/acquirer subfields vary and must be produced from an enrolled institution's issued template, not invented by Kaki.
- The current masked proxy is display-only. Approval identity should use the decoded merchant/acquirer identity returned by a bank or scheme directory where available, plus the full payload hash; never approve from a masked suffix alone.
- MY/ID/TH expose documented machine-readable weather hooks. VN NCHMF and PH PAGASA defaults are official HTML publications and need dedicated parsers/schema-drift fixtures or a documented official API before being used for automated alerts.
- Public-holiday and prayer-time APIs differ by state/calculation authority. They remain explicitly injectable so locale setup can choose an authoritative source (for example JAKIM state/zone in Malaysia) without sending location to an arbitrary aggregator. Add one source fixture per country/authority before enabling proactive reminders.
- The MY causeway hook points at the official OneMotoring publication and returns source text; combine it with LTA traffic-camera/data tools and add a sanitised parser fixture before claiming travel-time predictions.
- Cross-border QR availability is not universal. Bank capability, foreign-exchange rate, fees and destination merchant support must be checked immediately before creating the approval card.
- Add captured, sanitised scheme samples issued by enrolled providers for QRIS, VietQR and QR Ph. Current tests intentionally use locally generated non-payable fixtures so they cannot move money.
