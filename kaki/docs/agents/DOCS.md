# Documentation agent handoff

## Built

- Root quickstart with explicit alpha/fixture/live status.
- Onboarding guide separating the implemented CLI from the intended production wizard and pairing flow.
- Deployment guide identifying the current Compose file as a development scaffold and documenting secure service-manager/Tailscale expectations.
- Operations runbook for WhatsApp 429/ban/relink, Android and browser reset, sensitive backups, non-overwriting restore, disaster recovery, and data exposure.
- Contribution guide covering fixtures, privacy, risk review, and acceptance semantics.
- Verification matrix mapping deterministic and live paths, plus an explicit no-live-evidence statement.
- Reconciled progress ledger and indexed subsystem handoffs.
- Local Markdown link/criterion-14 evidence checker.

## Validate

```sh
pnpm docs:check
pnpm acceptance
pnpm format:check
```

The documentation evidence portion of criterion 14 should pass. Overall release acceptance must remain pending until real live evidence exists.

## Open issues

- The onboarding UI, systemd/launchd units, production container images, encrypted backup manifest, and complete runtime replay adapters are documented targets rather than completed live integrations.
- Product screenshots are intentionally absent because no synthetic, privacy-reviewed release captures were supplied.
- External provider URLs are kept to a minimum; provider-specific live instructions should be checked against current official documentation before release.
