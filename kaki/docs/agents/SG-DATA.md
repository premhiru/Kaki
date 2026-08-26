# SG-DATA handoff

## Implemented owner surface

- `LtaDatamallClient` now exposes typed methods for BusArrival, BusRoutes, BusStops,
  TrainServiceAlerts, CarParkAvailability, ERPRates, TaxiAvailability,
  TrafficIncidents, EstTravelTimes, and TrafficImages. Every request uses the
  injected cache, fixed-window limiter, abort signal, and classified provider errors.
- `DataGovSgClient` covers the official v2 real-time weather endpoints, datastore
  search, and dataset-download GeoJSON flow. Its unauthenticated limits are bounded
  to the strictest current official quota used by each request class.
- `SingaporePublicDatasetClient` maps dengue GeoJSON, HDB resale rows, annual hawker
  closure periods, school/public holidays, and COE results. Dataset IDs are explicit
  configuration because annual resources rotate and must not silently bind to stale
  data.
- `OneMapClient` covers search, postal-to-building resolution, reverse geocoding,
  walk/drive/cycle/PT routes, and planning areas. Authenticated calls require the
  caller-provided OneMap token.
- `NeaPublicClient` covers forecast, rainfall, PSI/PM2.5, and UV. The public-services
  owner adds typed NEA warnings and MOH clinic hours plus injected NLB Catalogue and
  ActiveSG portal adapters, so authenticated web automation stays in the browser owner.
- The address parser covers local block/street/unit/postal syntax.
- SGQR/PayNow supports byte-correct EMVCo parsing, CRC validation, Tag 26 proxy,
  editable flag, amount, merchant, reference, Unicode merchant names, encoding, and
  image decoding through a bounded host QR decoder (ZXing or OpenClaw vision).
- The monitor registry/runner schedules and deduplicates all requested Singapore
  monitor kinds. Collection and the bounded cheap-model evaluator are injected; the
  deterministic evaluator is the fail-closed default.

## Verification

- `pnpm --dir kaki --filter @kaki/sg-data lint` — passed.
- `pnpm --dir kaki --filter @kaki/sg-data test` — passed: 3 files, 16 tests.
- Credential-free live probe of `two-hr-forecast` through `DataGovSgClient` — HTTP
  success with `code: 0` and current `area_metadata/items` payload.
- Official contracts checked on 2026-08-26: LTA DataMall Dynamic Data/API guide,
  data.gov.sg developer guide and quotas, OneMap API docs, and NLB Developer Portal.

## External live gates

- LTA calls require a registered `LTA_ACCOUNT_KEY`; OneMap reverse/routing/planning
  require a current `ONEMAP_TOKEN`. No credentials were available in this checkout,
  so these were fixture-verified but not represented as live proof.
- LTA launched GTFS Schedule/Realtime APIs in August 2026 while still listing the
  legacy Train Service Alerts product. A live subscribed-account check must certify
  the selected train feed before release.
- Current ERP rates are also published as a static DataMall resource. The legacy API
  adapter remains typed, but a live AccountKey run must determine whether the dynamic
  endpoint is still enabled for the user's subscription.
- Annual data.gov.sg resource IDs must be selected during onboarding and refreshed
  when publishers rotate them. Fixtures cover the current schemas; only the
  credential-free real-time weather flow was live-run in this lane.
- NLB Catalogue and ActiveSG authenticated browser flows require household sessions;
  the typed portal boundary is complete, but live account evidence remains required.
