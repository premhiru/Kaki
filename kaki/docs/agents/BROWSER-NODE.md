# BROWSER-NODE

## Delivered

- Expanded `@kaki/browser-node` into an injectable managed-browser contract suitable for a Playwright persistent-context adapter in production and deterministic pages in CI.
- Added one persistent Chrome profile per validated household under `~/.kaki/chrome/<household>`, with Singapore locale/timezone defaults and guaranteed session cleanup.
- Applied resilient selector chains to click, fill, wait, and extraction operations, using reviewed alternatives before an injected screenshot/vision selector.
- Added layout-drift annotations whenever an alternative or vision selector repairs a failed primary selector. File annotations are grouped by portal host for nightly consolidation into learned skills.
- Added Singpass, bank-token, generic OTP, and captcha handoffs with screenshot evidence. Detection runs before and after each executed step.
- Added dry-run mode, bounded retry with exponential backoff, redacted in-memory/file traces, failure screenshots, and extracted-data results. Fill values are never written to traces.
- Added fixture coverage for portal selector drift and all four handoff classes.

## Production adapter contract

Implement `ManagedBrowserAdapter.launchPersistent()` using Playwright's `chromium.launchPersistentContext(userDataDir, options)` and return a `BrowserPage` wrapper plus `close()`. The core package deliberately does not import or download Playwright, so CI and unit tests do not require Chrome.

The adapter must:

1. Use the supplied persistent profile directory, locale, timezone, headless, and download settings.
2. Keep profiles household-isolated and never share pages or cookies across household IDs.
3. Implement locator actions without evaluating untrusted page-provided JavaScript.
4. Preserve screenshots for captcha, OTP, Singpass, failure, and explicit approval handoffs.
5. Route vision results back as a selector understood by the page adapter, such as a coordinate-backed synthetic selector.

## Test

```sh
corepack pnpm --filter @kaki/browser-node typecheck
corepack pnpm --filter @kaki/browser-node test
corepack pnpm --filter @kaki/browser-node test:e2e
```

All current tests use injectable page/adapter fixtures and do not launch a browser.

## Open issues

- Live Chrome/Playwright installation and process supervision belong to deployment wiring; this lane defines and tests the complete adapter boundary.
- Captcha solving is intentionally not automated. The runtime returns evidence and waits for a human handoff.
- A Singpass or bank-token resume coordinator must resume the remaining steps after the approval node confirms authentication.
- Visual selection quality depends on the model adapter supplied by the models package; failed vision resolution remains fail-closed.
