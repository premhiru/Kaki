# Upstream provenance

Kaki is a hard fork of [OpenClaw](https://github.com/openclaw/openclaw) under the
MIT License.

- Upstream remote: `https://github.com/openclaw/openclaw.git`
- Imported revision: `ccc10bf0983219b63c09078987cb02222147e0a1`
- Imported revision date: 2026-08-23 21:24:49 -0700
- Upstream history at import: 81,834 commits reachable from `main`
- Kaki integration branch: `codex/openclaw-integration`

The original OpenClaw copyright and license remain in `LICENSE`, and dependency
attribution remains in `THIRD_PARTY_NOTICES.md`. The `openclaw` command is retained
as a compatibility alias; Kaki operators should use `kaki`.

The Kaki product built before the upstream import is preserved under `kaki/`.
That overlay is additive: it must integrate through OpenClaw's public plugin,
skill, channel, and gateway seams rather than replacing upstream functionality
with parallel stubs.
