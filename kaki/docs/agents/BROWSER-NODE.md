# BROWSER-NODE handoff

## Implemented owner surface

- `ManagedBrowserNode` creates one persistent profile per validated household under
  `~/.kaki/chrome/<household>`, sets `en-SG` and `Asia/Singapore`, closes sessions on
  every exit, and prevents concurrent use of one cookie profile.
- `PlaywrightManagedBrowserAdapter` is a production adapter for OpenClaw's pinned
  `playwright-core` Chromium object. It launches a persistent context, reuses or opens
  a page, starts Playwright tracing when available, and implements navigation,
  selector actions, extraction, screenshots, and cleanup.
- `OpenClawManagedBrowserAdapter` delegates lifecycle to OpenClaw's supervised managed
  browser control, preserving OpenClaw process/profile ownership instead of launching
  a competing Chrome.
- The runtime applies reviewed selector alternatives before screenshot/vision
  fallback, bounded exponential retry, dry-run mutation suppression, redacted trace
  artifacts, failure/handoff screenshots, and learned layout annotations.
- Singpass, bank-token, generic OTP, PayNow, and captcha pages stop at evidence-backed
  human handoff cards. Captchas are never solved automatically.

## Verification

- `pnpm --dir kaki --filter @kaki/browser-node typecheck` — passed.
- `pnpm --dir kaki --filter @kaki/browser-node build` — passed.
- `pnpm --dir kaki --filter @kaki/browser-node test` — passed: 5 files, 15 tests.
- Fixtures cover selector drift and every handoff class; adapter tests cover the
  Playwright launch contract, OpenClaw ownership/cleanup, and household concurrency.

## External live gates

- The host must supply OpenClaw's pinned Chromium object or managed-browser control
  when constructing the adapter. No second Playwright/Chrome dependency is bundled.
- A live browser account run is still required for NLB, ActiveSG, Singpass, and bank
  flows. No authenticated household profile or approval callback was available in
  this checkout, so fixture evidence is not represented as live evidence.
- Captcha, Singpass, OTP, and bank-token continuation resumes only after the approval
  owner confirms the exact pending task; the browser runtime correctly stops and
  returns evidence but does not mint approval authority.
