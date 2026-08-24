# SG-DATA handoff

## Work completed

- Added a dependency-free HTTP foundation with injectable transport, injectable clock, bounded fixed-window rate limiting, TTL cache abstraction/in-memory implementation, typed provider errors, and strict JSON shape helpers.
- Added `LtaDatamallClient` against the real `datamall2.mytransport.sg/ltaodataservice` paths with `AccountKey`, typed BusArrival/BusStops/TrainServiceAlerts mapping, approved dataset names, pagination validation, source-appropriate cache TTLs, and retryable 429/5xx classification.
- Added `DataGovSgClient` against the current v2 realtime API and official `data.gov.sg/api/action/datastore_search` path, optional `x-api-key`, date/pagination validation, and conservative unauthenticated/authenticated realtime quotas.
- Added `NeaPublicClient` for NEA-produced two-hour/24-hour forecast, rainfall, PSI, PM2.5 and UV observations exposed by data.gov.sg.
- Added `OneMapClient` for token-authenticated search, reverse geocoding, and walk/drive/cycle/public-transport routing, including Singapore coordinate bounds and typed result/route mapping.
- Strengthened the Singapore address parser with punctuation/Unicode dash handling, structured floor/unit fields, country/normalised output, postal helper and non-empty input validation.
- Strengthened SGQR/PayNow with EMV header/length checks, duplicate-tag warnings, CRC placement/validation, country/PayNow warnings, integer minor-unit output, and proxy/merchant/amount validation on encoding.
- Expanded monitor evaluation to cover dengue proximity, ERP changes, vehicle expiry, COE results and housing matches in addition to rain, train, haze, hawker and CPF/SRS signals. Dedupe keys now bind to the relevant incident/search/period.
- Added sanitised JSON fixtures for LTA BusArrival, data.gov.sg PM2.5 and OneMap Search plus deterministic transport/cache/rate-limit/provider-error tests.

## Verification

- `pnpm --filter @kaki/sg-data lint` (`tsc --noEmit`) — passed.
- `pnpm --filter @kaki/sg-data test` — passed: 2 files, 10 tests.
- Package source, tests and JSON fixtures were formatted with Prettier.

## Production endpoints represented

- LTA DataMall: `https://datamall2.mytransport.sg/ltaodataservice/{dataset}`
- data.gov.sg realtime: `https://api-open.data.gov.sg/v2/real-time/api/{dataset}`
- data.gov.sg rows: `https://data.gov.sg/api/action/datastore_search`
- OneMap search: `https://www.onemap.gov.sg/api/common/elastic/search`
- OneMap reverse geocode: `https://www.onemap.gov.sg/api/public/revgeocode`
- OneMap routing: `https://www.onemap.gov.sg/api/public/routingsvc/route`

## Open issues and live verification

- Run live verification with user-supplied `LTA_ACCOUNT_KEY`, `DATA_GOV_SG_API_KEY` and `ONEMAP_TOKEN`; fixtures intentionally contain no credentials. OneMap token creation/72-hour renewal belongs in the secrets/onboarding layer, not this data client.
- LTA introduced GTFS Realtime train feeds in 2026. The compatibility `TrainServiceAlerts` mapping remains wired, but the production integration should add the new GTFS transport/parser once the subscribed API documentation and payload media type are available, then retain the legacy adapter only while LTA supports it.
- Static data.gov.sg consumers must pin and document their current dataset IDs (hawker closures, HDB resale, holidays, COE, dengue, etc.); IDs are deliberately configuration rather than embedded guesses. Add a fixture per selected dataset before enabling its monitor.
- `NeaPublicClient` currently uses the supported data.gov.sg publication path. MOH, NLB and ActiveSG portal/browser integrations remain separate tool/skill work.
- The default cache is process-local. Production may inject a SQLite-backed cache for restart persistence and multi-worker coherence without changing client contracts.
- `decodeSgqr` accepts an extracted EMV string. QR image detection/decoding belongs in the media/vision boundary and must pass its string result through this CRC-validating codec.
- Live routing fixtures and provider schema-drift alarms should be added before declaring route planning production-ready.
