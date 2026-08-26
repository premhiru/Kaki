# Kaki skill catalogue

Generated from `packages/skills/scripts/generate.mjs`. Each maintained playbook declares a provider-specific action sequence. OpenClaw owns the live browser, phone, data, channel, and approval dispatchers; fixture runners simulate no effects and derive results without reading fixture expectations.

## Maintained skills (79)

| ID                        | Title                           | Provider                                           | Declared action sequence                                           | Approval boundary |
| ------------------------- | ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ | ----------------- |
| `sg.iras-noa`             | IRAS Notice of Assessment       | IRAS myTax Portal                                  | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.iras-file-assist`     | IRAS filing assistant           | IRAS myTax Portal                                  | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.cpf-overview`         | CPF overview                    | CPF Board member portal                            | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.cpf-topup`            | CPF top-up                      | CPF e-Cashier                                      | browser.open → browser.prepare → approval.request → browser.commit | money.transfer    |
| `sg.srs-topup`            | SRS top-up                      | configured SRS bank portal                         | browser.open → browser.prepare → approval.request → browser.commit | money.transfer    |
| `sg.hdb-portal`           | HDB portal                      | HDB Flat Portal                                    | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.lta-vehicle`          | LTA vehicle services            | OneMotoring                                        | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.ura-parking`          | URA parking                     | Parking.sg or URA carpark service                  | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.sp-group`             | SP utilities                    | SP Utilities portal                                | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.town-council-scc`     | Town Council S&CC               | owning Town Council portal                         | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.ica-passport-renewal` | ICA passport renewal            | ICA e-Service                                      | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.mom-helper-levy-wp`   | MOM helper levy and work permit | MOM FDW eServices                                  | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `sg.singpass-myinfo-self` | Singpass Myinfo self-service    | Singpass Myinfo                                    | browser.open → browser.prepare → approval.request → channel.commit | data.share        |
| `sg.polyclinic-booking`   | Polyclinic booking              | HealthHub appointment service                      | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.healthhub-web`        | HealthHub web                   | HealthHub                                          | browser.open → browser.prepare → approval.request → channel.commit | data.share        |
| `sg.chas-clinic-finder`   | CHAS clinic finder              | MOH CHAS clinic directory                          | data.query → data.normalize → data.verify                          | none              |
| `sg.medication-reminders` | Medication reminders            | household reminder scheduler                       | data.query → data.normalize → approval.request → channel.commit    | data.share        |
| `sg.elderly-care-sg`      | Elderly care Singapore          | AIC and Silver Generation directories              | data.query → data.normalize → data.verify                          | none              |
| `sg.school-calendar-sg`   | Singapore school calendar       | MOE school calendar                                | data.query → data.normalize → data.verify                          | none              |
| `sg.enrichment-booking`   | Enrichment booking              | selected enrichment provider                       | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.kids-sea`             | Singapore school milestones     | MOE and SEAB calendars                             | data.query → data.normalize → data.verify                          | none              |
| `sg.helper-schedule`      | Helper schedule                 | household calendar                                 | data.query → data.normalize → approval.request → channel.commit    | data.share        |
| `sg.household-ops`        | Household operations            | household task and grocery services                | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.kopi-order`           | Kopitiam order                  | kopitiam order translator                          | data.query → data.normalize → approval.request → channel.commit    | money.purchase    |
| `sg.hawker-finder`        | Hawker finder                   | NEA hawker directory and closure feed              | data.query → data.normalize → data.verify                          | none              |
| `sg.bus-mrt-now`          | Bus and MRT now                 | LTA DataMall                                       | data.query → data.normalize → data.verify                          | none              |
| `sg.weather-commute`      | Weather commute                 | data.gov.sg weather and OneMap routing             | data.query → data.normalize → data.verify                          | none              |
| `sg.haze-watch`           | Haze watch                      | NEA PSI and PM2.5 feeds                            | data.query → data.normalize → data.verify                          | none              |
| `sg.nlb`                  | National Library Board          | NLB catalogue                                      | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.activesg`             | ActiveSG                        | MyActiveSG+                                        | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.moving-house-sg`      | Moving house Singapore          | HDB, utilities, and address-change services        | browser.open → browser.prepare → approval.request → browser.commit | account.change    |
| `sg.shopee-web`           | Shopee Singapore                | Shopee Singapore                                   | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.lazada-web`           | Lazada Singapore                | Lazada Singapore                                   | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.amazon-sg`            | Amazon Singapore                | Amazon.sg                                          | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.carousell-buy-sell`   | Carousell buying and selling    | Carousell                                          | browser.open → browser.prepare → approval.request → channel.commit | message.external  |
| `sg.airline-sq`           | Singapore Airlines              | Singapore Airlines                                 | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.scoot`                | Scoot                           | Scoot                                              | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.agoda`                | Agoda                           | Agoda                                              | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.klook`                | Klook                           | Klook                                              | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.trip-sea`             | Southeast Asia trip             | airline, hotel, visa, and holiday sources          | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.vendor-outreach`      | Vendor outreach                 | Maps, Carousell, Facebook, and vendor channels     | browser.open → browser.prepare → approval.request → channel.commit | message.external  |
| `sg.contractor-followup`  | Contractor follow-up            | contractor conversation channel                    | browser.open → browser.prepare → approval.request → channel.commit | message.external  |
| `sg.tuition-agency`       | Tuition agency                  | Singapore tuition agencies                         | browser.open → browser.prepare → approval.request → channel.commit | message.external  |
| `sg.family-events`        | Family events                   | household calendar and venue services              | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sg.birthday-gift-sg`     | Birthday gifts Singapore        | Singapore gift merchants                           | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `sg.wedding-sea`          | Southeast Asia wedding          | regional wedding vendors and etiquette sources     | browser.open → browser.prepare → approval.request → browser.commit | booking           |
| `sea.currency-remittance` | Currency and remittance         | MAS-licensed rate and remittance sources           | data.query → data.normalize → approval.request → browser.commit    | money.transfer    |
| `sea.cross-border-qr`     | Cross-border QR                 | PayNow, DuitNow, PromptPay, QRIS, VietQR, or QR Ph | data.query → data.normalize → approval.request → browser.commit    | money.transfer    |
| `sea.halal-finder`        | Halal finder                    | official national halal registries                 | data.query → data.normalize → data.verify                          | none              |
| `sea.prayer-times`        | Prayer times                    | JAKIM and regional official prayer feeds           | data.query → data.normalize → data.verify                          | none              |
| `sea.jb-commute`          | Johor Bahru commute             | LTA, Causeway camera, immigration, and VEP sources | data.query → data.normalize → data.verify                          | none              |
| `sea.visa-check-sea`      | Southeast Asia visa check       | official immigration and foreign ministry sites    | browser.open → browser.prepare → approval.request → browser.commit | data.share        |
| `sea.regional-holidays`   | Regional holidays               | official Southeast Asian holiday calendars         | data.query → data.normalize → data.verify                          | none              |
| `sea.language-bridge`     | Mixed-language family bridge    | Kaki locale normaliser and translator              | data.query → data.normalize → approval.request → channel.commit    | data.share        |
| `my.duitnow-pay`          | DuitNow payment                 | DuitNow QR and configured bank                     | data.query → data.normalize → approval.request → browser.commit    | money.transfer    |
| `my.tng-topup`            | Touch 'n Go top-up              | Touch 'n Go eWallet                                | phone.launch → phone.inspect → approval.request → phone.commit     | money.purchase    |
| `my.jpj-roadtax`          | JPJ road tax                    | JPJ or MyJPJ                                       | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `my.lhdn-tax`             | LHDN tax                        | MyTax LHDN                                         | browser.open → browser.prepare → approval.request → browser.commit | gov.singpass      |
| `my.myeg`                 | MyEG services                   | MyEG                                               | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `id.qris-pay`             | QRIS payment                    | QRIS and configured bank or wallet                 | data.query → data.normalize → approval.request → phone.commit      | money.transfer    |
| `id.gojek-ride`           | Gojek ride                      | Gojek                                              | phone.launch → phone.inspect → approval.request → phone.commit     | booking           |
| `id.tokopedia`            | Tokopedia                       | Tokopedia                                          | phone.launch → phone.inspect → approval.request → phone.commit     | money.purchase    |
| `id.pln-bill`             | PLN electricity bill            | PLN Mobile or payment portal                       | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `id.bpjs`                 | BPJS services                   | BPJS Kesehatan or Ketenagakerjaan                  | browser.open → browser.prepare → approval.request → channel.commit | data.share        |
| `th.promptpay-pay`        | PromptPay payment               | PromptPay and configured bank                      | data.query → data.normalize → approval.request → phone.commit      | money.transfer    |
| `th.line-man`             | LINE MAN                        | LINE MAN                                           | phone.launch → phone.inspect → approval.request → phone.commit     | money.purchase    |
| `th.bts-mrt`              | Bangkok BTS and MRT             | BTS, MRT, and Bangkok transit sources              | data.query → data.normalize → data.verify                          | none              |
| `th.revenue-dept`         | Thailand Revenue Department     | Thai Revenue Department e-Filing                   | browser.open → browser.prepare → approval.request → channel.commit | data.share        |
| `th.tmd-weather`          | Thailand weather                | Thai Meteorological Department                     | data.query → data.normalize → data.verify                          | none              |
| `vn.vietqr-pay`           | VietQR payment                  | VietQR and configured bank                         | data.query → data.normalize → approval.request → phone.commit      | money.transfer    |
| `vn.zalo-ops`             | Zalo operations                 | Zalo OA or approved personal channel               | data.query → data.normalize → approval.request → channel.commit    | message.external  |
| `vn.momo-read`            | MoMo read-only                  | MoMo                                               | phone.launch → phone.inspect → phone.verify                        | none              |
| `vn.evn-bill`             | EVN electricity bill            | regional EVN customer portal                       | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `vn.vneid-handoff`        | VNeID handoff                   | VNeID                                              | data.query → data.normalize → approval.request → channel.commit    | data.share        |
| `ph.qrph-pay`             | QR Ph payment                   | QR Ph and configured bank or wallet                | data.query → data.normalize → approval.request → phone.commit      | money.transfer    |
| `ph.gcash-read`           | GCash read-only                 | GCash                                              | phone.launch → phone.inspect → phone.verify                        | none              |
| `ph.egovph`               | eGovPH services                 | eGovPH                                             | browser.open → browser.prepare → approval.request → channel.commit | data.share        |
| `ph.meralco-bill`         | Meralco electricity bill        | Meralco Online                                     | browser.open → browser.prepare → approval.request → browser.commit | money.purchase    |
| `ph.pagasa-weather`       | PAGASA weather                  | PAGASA                                             | data.query → data.normalize → data.verify                          | none              |

## Phone-node skills (11)

The mobile playbooks remain owned by the phone-node package and are audited here without duplication.

| ID                        | Source                                         |
| ------------------------- | ---------------------------------------------- |
| `phone.grab-ride`         | `packages/phone-node/skills/grab-ride`         |
| `phone.grab-food`         | `packages/phone-node/skills/grab-food`         |
| `phone.foodpanda`         | `packages/phone-node/skills/foodpanda`         |
| `phone.simplygo`          | `packages/phone-node/skills/simplygo`          |
| `phone.parents-gateway`   | `packages/phone-node/skills/parents-gateway`   |
| `phone.healthhub-app`     | `packages/phone-node/skills/healthhub-app`     |
| `phone.bank-app-readonly` | `packages/phone-node/skills/bank-app-readonly` |
| `phone.touch-n-go`        | `packages/phone-node/skills/touch-n-go`        |
| `phone.gcash`             | `packages/phone-node/skills/gcash`             |
| `phone.momo`              | `packages/phone-node/skills/momo`              |
| `phone.generic-app-task`  | `packages/phone-node/skills/generic-app-task`  |

## Verification

`pnpm --filter @kaki/skills generate:check` detects catalogue drift. `pnpm --filter @kaki/skills test` verifies unique bodies, meaningful fixtures, approval fencing, and real dispatcher calls. Live account or credential claims require the release evidence workflow; deterministic fixtures are not live proof.
