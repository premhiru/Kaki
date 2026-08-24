# Kaki skill catalogue

This catalogue is generated from `packages/skills/scripts/generate.mjs`. Maintained playbooks use agentskills-compatible front matter, a fixture-safe runner, and a deterministic happy-path fixture.

## Maintained skills (79)

| ID                        | Title                           | Surface  | Approval boundary |
| ------------------------- | ------------------------------- | -------- | ----------------- |
| `sg.iras-noa`             | IRAS Notice of Assessment       | browser  | gov.singpass      |
| `sg.iras-file-assist`     | IRAS filing assistant           | browser  | gov.singpass      |
| `sg.cpf-overview`         | CPF overview                    | browser  | gov.singpass      |
| `sg.cpf-topup`            | CPF top-up                      | browser  | money.transfer    |
| `sg.srs-topup`            | SRS top-up                      | browser  | money.transfer    |
| `sg.hdb-portal`           | HDB portal                      | browser  | gov.singpass      |
| `sg.lta-vehicle`          | LTA vehicle services            | browser  | gov.singpass      |
| `sg.ura-parking`          | URA parking                     | browser  | money.purchase    |
| `sg.sp-group`             | SP utilities                    | browser  | money.purchase    |
| `sg.town-council-scc`     | Town Council S&CC               | browser  | money.purchase    |
| `sg.ica-passport-renewal` | ICA passport renewal            | browser  | gov.singpass      |
| `sg.mom-helper-levy-wp`   | MOM helper levy and work permit | browser  | gov.singpass      |
| `sg.singpass-myinfo-self` | Singpass Myinfo self-service    | browser  | data.share        |
| `sg.polyclinic-booking`   | Polyclinic booking              | browser  | booking           |
| `sg.healthhub-web`        | HealthHub web                   | browser  | data.share        |
| `sg.chas-clinic-finder`   | CHAS clinic finder              | api      | none              |
| `sg.medication-reminders` | Medication reminders            | api      | data.share        |
| `sg.elderly-care-sg`      | Elderly care Singapore          | api      | none              |
| `sg.school-calendar-sg`   | Singapore school calendar       | api      | none              |
| `sg.enrichment-booking`   | Enrichment booking              | browser  | booking           |
| `sg.kids-sea`             | Singapore school milestones     | api      | none              |
| `sg.helper-schedule`      | Helper schedule                 | api      | data.share        |
| `sg.household-ops`        | Household operations            | browser  | money.purchase    |
| `sg.kopi-order`           | Kopitiam order                  | approval | money.purchase    |
| `sg.hawker-finder`        | Hawker finder                   | api      | none              |
| `sg.bus-mrt-now`          | Bus and MRT now                 | api      | none              |
| `sg.weather-commute`      | Weather commute                 | api      | none              |
| `sg.haze-watch`           | Haze watch                      | api      | none              |
| `sg.nlb`                  | National Library Board          | browser  | booking           |
| `sg.activesg`             | ActiveSG                        | browser  | booking           |
| `sg.moving-house-sg`      | Moving house Singapore          | browser  | account.change    |
| `sg.shopee-web`           | Shopee Singapore                | browser  | money.purchase    |
| `sg.lazada-web`           | Lazada Singapore                | browser  | money.purchase    |
| `sg.amazon-sg`            | Amazon Singapore                | browser  | money.purchase    |
| `sg.carousell-buy-sell`   | Carousell buying and selling    | browser  | message.external  |
| `sg.airline-sq`           | Singapore Airlines              | browser  | booking           |
| `sg.scoot`                | Scoot                           | browser  | booking           |
| `sg.agoda`                | Agoda                           | browser  | booking           |
| `sg.klook`                | Klook                           | browser  | booking           |
| `sg.trip-sea`             | Southeast Asia trip             | browser  | booking           |
| `sg.vendor-outreach`      | Vendor outreach                 | browser  | message.external  |
| `sg.contractor-followup`  | Contractor follow-up            | browser  | message.external  |
| `sg.tuition-agency`       | Tuition agency                  | browser  | message.external  |
| `sg.family-events`        | Family events                   | browser  | booking           |
| `sg.birthday-gift-sg`     | Birthday gifts Singapore        | browser  | money.purchase    |
| `sg.wedding-sea`          | Southeast Asia wedding          | browser  | booking           |
| `sea.currency-remittance` | Currency and remittance         | api      | money.transfer    |
| `sea.cross-border-qr`     | Cross-border QR                 | approval | money.transfer    |
| `sea.halal-finder`        | Halal finder                    | api      | none              |
| `sea.prayer-times`        | Prayer times                    | api      | none              |
| `sea.jb-commute`          | Johor Bahru commute             | api      | none              |
| `sea.visa-check-sea`      | Southeast Asia visa check       | browser  | data.share        |
| `sea.regional-holidays`   | Regional holidays               | api      | none              |
| `sea.language-bridge`     | Mixed-language family bridge    | api      | data.share        |
| `my.duitnow-pay`          | DuitNow payment                 | approval | money.transfer    |
| `my.tng-topup`            | Touch 'n Go top-up              | phone    | money.purchase    |
| `my.jpj-roadtax`          | JPJ road tax                    | browser  | gov.singpass      |
| `my.lhdn-tax`             | LHDN tax                        | browser  | gov.singpass      |
| `my.myeg`                 | MyEG services                   | browser  | money.purchase    |
| `id.qris-pay`             | QRIS payment                    | approval | money.transfer    |
| `id.gojek-ride`           | Gojek ride                      | phone    | booking           |
| `id.tokopedia`            | Tokopedia                       | phone    | money.purchase    |
| `id.pln-bill`             | PLN electricity bill            | browser  | money.purchase    |
| `id.bpjs`                 | BPJS services                   | browser  | data.share        |
| `th.promptpay-pay`        | PromptPay payment               | approval | money.transfer    |
| `th.line-man`             | LINE MAN                        | phone    | money.purchase    |
| `th.bts-mrt`              | Bangkok BTS and MRT             | api      | none              |
| `th.revenue-dept`         | Thailand Revenue Department     | browser  | data.share        |
| `th.tmd-weather`          | Thailand weather                | api      | none              |
| `vn.vietqr-pay`           | VietQR payment                  | approval | money.transfer    |
| `vn.zalo-ops`             | Zalo operations                 | api      | message.external  |
| `vn.momo-read`            | MoMo read-only                  | phone    | none              |
| `vn.evn-bill`             | EVN electricity bill            | browser  | money.purchase    |
| `vn.vneid-handoff`        | VNeID handoff                   | approval | data.share        |
| `ph.qrph-pay`             | QR Ph payment                   | approval | money.transfer    |
| `ph.gcash-read`           | GCash read-only                 | phone    | none              |
| `ph.egovph`               | eGovPH services                 | browser  | data.share        |
| `ph.meralco-bill`         | Meralco electricity bill        | browser  | money.purchase    |
| `ph.pagasa-weather`       | PAGASA weather                  | api      | none              |

## Phone-node skills (11)

These mobile playbooks remain owned by the phone-node package and are catalogued here without duplication.

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

## Run a fixture

```sh
corepack pnpm --filter @kaki/skills exec tsx sg/iras-noa/run.ts
corepack pnpm --filter @kaki/skills test:e2e
```

Fixture runners never call a live surface. Production dispatch uses the front matter to select browser, phone, approval, or API execution and to enforce the listed policy boundary.
