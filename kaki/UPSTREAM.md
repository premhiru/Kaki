# Upstream provenance

Kaki is a hard-fork project. Reproducible imports must use immutable revisions and preserve the corresponding license notices in `THIRD_PARTY_NOTICES.md`.

| Upstream                                                     | Role                                                         | Pinned revision                            | Checked    |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------ | ---------- |
| [OpenClaw](https://github.com/openclaw/openclaw)             | Complete forked runtime, Gateway, plugins, channels and apps | `ccc10bf0983219b63c09078987cb02222147e0a1` | 2026-08-26 |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Learning, recall, delegation and delivery design reference   | `9ab056d4e8b892fccb797cc5cd5dffd090ac827e` | 2026-08-24 |

## Update procedure

1. Add both remotes without changing Kaki's default remote: `git remote add openclaw-upstream https://github.com/openclaw/openclaw.git` and `git remote add hermes-upstream https://github.com/NousResearch/hermes-agent.git`.
2. Fetch tags and inspect changes between the old and proposed immutable revisions.
3. Port selected changes into the owning Kaki package. Do not restore telemetry, automatic third-party skill installation, or removed channel defaults.
4. Run `pnpm check` and fixture e2e tests, update this table and `THIRD_PARTY_NOTICES.md`, and record behavior-changing choices in `docs/DECISIONS.md`.

The repository now contains the complete OpenClaw history reachable from the pinned
revision. The Kaki integration commit descends from that immutable revision, so
`git merge-base --is-ancestor ccc10bf0983219b63c09078987cb02222147e0a1 HEAD`
must pass. The additive Kaki product source is retained under `kaki/` while the
repository root remains the canonical OpenClaw-derived runtime.
