# SEA data layer

`@kaki/sea-data` owns the regional capability contracts in master-prompt section 14. It does not bypass an official app, create bank credentials, or turn a structurally valid test QR into a payable scheme artifact.

## Requirement coverage

Every named requirement has a stable capability ID in `kaki/packages/sea-data/src/capabilities.ts`. Operators can bind those IDs to a live provider through `RegionalCapabilityRouter`; an unbound capability fails with its specific setup gate.

| Prompt line                                                         | Capability IDs                                                                                                            | Runtime boundary                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| MY: DuitNow, TNG, causeway/VEP, MET, JAKIM, MyDigital ID, holidays  | `my.duitnow`, `my.tng`, `my.causeway`, `my.vep`, `my.weather`, `my.prayer`, `my.identity`, `my.holidays`                  | QR parser + certified encoder injection; read-only phone handoff; official public sources; browser/identity consent handoff                 |
| ID: QRIS, Gojek/Tokopedia, BMKG, KRL/TransJakarta, prayer, IKD      | `id.qris`, `id.gojek`, `id.tokopedia`, `id.weather`, `id.krl`, `id.transjakarta`, `id.prayer`, `id.identity`              | QR parser + certified encoder injection; read-only phone handoff; official source adapter; identity consent handoff                         |
| TH: PromptPay, LINE, BTS/MRT, TMD, ThaID, Buddhist/alcohol-ban days | `th.promptpay`, `th.line`, `th.bts`, `th.mrt`, `th.weather`, `th.identity`, `th.holy-days`, `th.alcohol-ban-days`         | QR parser + certified encoder injection; configured channel; official publication/API adapter; identity consent handoff                     |
| VN: VietQR, Zalo, MoMo/ZaloPay, VNeID, Tết                          | `vn.vietqr`, `vn.zalo`, `vn.momo`, `vn.zalopay`, `vn.identity`, `vn.tet`                                                  | QR parser + certified encoder injection; configured channel; read-only phone handoff; official publication/identity handoff                 |
| PH: QR Ph, GCash/Maya, eGovPH SSO/eVerify, PAGASA, Messenger/Viber  | `ph.qrph`, `ph.gcash`, `ph.maya`, `ph.egovph-sso`, `ph.egovph-everify`, `ph.weather`, `ph.messenger`, `ph.viber`          | QR parser + certified encoder injection; read-only phone handoff; relying-party identity contract; official publication; configured channel |
| Regional: remittance, cross-border QR, halal, prayer, holidays      | `regional.wise`, `regional.remitly`, `regional.cross-border-qr`, `regional.halal`, `regional.prayer`, `regional.holidays` | Expiring licensed quote; fresh bank-capability evidence; authority-specific injected registries/calendars                                   |

## Data and transport contract

The default transport accepts HTTPS without credentials in the URL, rejects private literal hosts and cross-origin template changes, disables redirects, times out, rate-limits to four requests per minute, and reads at most 2 MiB. A source parser must return a bounded typed result before the response is cached. HTML publications are reduced to a 6,000-character text excerpt and must contain authority-specific drift markers.

The shipped machine-readable parsers validate:

- MET Malaysia/data.gov.my 7-day forecast rows;
- BMKG administrative location and hourly forecast groups;
- JAKIM e-Solat zone and prayer-day rows;
- TMD `WeatherForecast` location/hourly rows from the official token API.

`RegionalClientConfig` is the production injection seam for authorities without a stable public endpoint. Source URLs remain same-origin after parameter substitution. Use an injected transport only for a separately trusted internal source; the default internet transport intentionally rejects local-network targets.

## Live proof on 2026-08-26

The credential-free defaults below were called through `RegionalPublicClient` and the real bounded transport. The result counts are normalized output counts, not copied fixtures.

| Source                                               | Result                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MET Malaysia via `api.data.gov.my/weather/forecast/` | HTTP 200; 7 Johor Bahru forecast rows parsed                                            |
| JAKIM e-Solat                                        | HTTP 200; 1 WLY01 prayer-day row parsed                                                 |
| BMKG public forecast                                 | HTTP 200; 21 Gambir forecast rows parsed                                                |
| LTA OneMotoring causeway traffic-camera publication  | HTTP 200; bounded publication parsed                                                    |
| Malaysia Cabinet Division holiday publication        | HTTP 200; bounded holiday publication parsed                                            |
| BTS service-time publication                         | HTTP 200; bounded publication parsed                                                    |
| MRTA publication                                     | HTTP 200; bounded publication parsed                                                    |
| Vietnam NCHMF publication                            | HTTP 200; bounded publication parsed                                                    |
| Vietnam Government Portal Tết source boundary        | HTTP 200; bounded publication parsed; annual dates still require the published decision |
| DOST-PAGASA weekly outlook                           | HTTP 200; bounded publication parsed                                                    |

The primary contracts checked were the [Malaysia weather API](https://developer.data.gov.my/realtime-api/weather), [MET Malaysia API access policy](https://api.met.gov.my/), [JAKIM e-Solat](https://www.e-solat.gov.my/), [BMKG public forecast API](https://api.bmkg.go.id/publik/prakiraan-cuaca), [TMD NWP API documentation](https://data.tmd.go.th/nwpapi/doc/), [BTS service timetable](https://www.bts.co.th/eng/traintime-frequency/), [PAGASA weekly outlook](https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-weekly), and [Malaysia Cabinet Division holidays](https://www.kabinet.gov.my/hari-kelepasan-am/).

## External gates and unavailable defaults

These are implemented contracts, but they are not claimed as live automation until the named gate is supplied:

- TMD weather requires its free OAuth bearer token. The client fails before network access when `tmd-api-token` is absent.
- MET Malaysia's separate `api.met.gov.my` service requires a free access token; the shipped MY default instead uses the credential-free official `data.gov.my` weather API.
- KAI Commuter returned HTTP 500, the TransJakarta publication was unreachable from the live runner, and the Ministry of Religious Affairs prayer page returned HTTP 502 on 2026-08-26. Those three pages are retained as discovery authorities in the capability registry but are not shipped in `REGIONAL_SOURCES`; bind a verified official adapter or use a browser handoff.
- Thailand's National Office of Buddhism returned HTTP 403. The Department of Disease Control page did not expose a stable alcohol-ban marker. Buddhist holy-day and alcohol-ban calendars therefore require an injected official parser before reminders are enabled.
- JAKIM/other halal registries, non-MY prayer authorities, and national/state holiday matrices require authority-specific adapters. A halal result must include certificate owner, certificate ID, outlet, validity and official source. Tentative holidays stay labelled `tentative`.
- Touch 'n Go, Gojek, Tokopedia, MoMo, ZaloPay, GCash and Maya are read-only through a paired phone and the user's signed-in official app. No wallet secret is accepted by this package.
- MyDigital ID, IKD, ThaID, VNeID and eGovPH return consent handoffs. eGovPH SSO/eVerify additionally need an approved relying-service integration.
- LINE, Zalo, Messenger and Viber need their configured account/channel credentials and recipient permission. The SEA package supplies the typed handoff; the channel plugin owns delivery.
- VEP, Wise and Remitly require the user's authenticated browser session, current quote/details, OTP or compliance steps when presented, and a final approval.

## Payment safety

`decodeDuitNow`, `decodeQris`, `decodePromptPay`, `decodeVietQr` and `decodeQrPh` parse EMV TLV using UTF-8 byte lengths, verify CRC16-CCITT, detect rail/currency/country mismatches, mask proxies, and expose integer minor units. More than one recognized national rail in a payload is rejected as ambiguous.

`encodeRegionalQr` requires a `CertifiedRegionalQrEncoder` supplied by an enrolled bank, acquirer or payment intermediary and verifies the returned rail, amount, merchant and reference. `encodeRegionalQrFixture` only accepts conspicuous `FIXTURE_…` proxies and `KAKI FIXTURE…` merchant names. Its output is deterministic test material, is not a payment instrument, and must not be presented for payment.

Cross-border payment preparation defaults to QR regeneration. A bank-app handoff is available only when capability evidence matches source country, destination country and rail, was checked in the last five minutes, and includes the bank identity. The approval facts include a SHA-256 payload hash plus current FX/fee facts when supplied.

Remittance handoff requires a non-expired quote with source/destination amounts, rate, fee, licence authority/reference and HTTPS source. It always returns `money.transfer` approval rather than committing a transfer.

## Verification

Focused proof:

```bash
pnpm --filter @kaki/sea-data lint
pnpm --filter @kaki/sea-data test
```

The suite protects all 44 named capability IDs, five QR rails, certified-encoder enforcement, fresh cross-border evidence, all device/identity/channel/browser handoff families, typed weather/prayer parsing, source drift, cache behavior, credential fail-closed behavior, SSRF/origin checks, redirect policy, response bounds, remittance quote validation and halal certificate validity.
