# Upstream provenance

Kaki is a hard-fork project. Reproducible imports must use immutable revisions and preserve the corresponding license notices in `THIRD_PARTY_NOTICES.md`.

| Upstream                                                     | Role                                                       | Pinned revision                            | Checked    |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------ | ---------- |
| [OpenClaw](https://github.com/openclaw/openclaw)             | Gateway, plugin and node architecture                      | `24c463749fb124f3bb95493ca8f96bbf78996ab1` | 2026-08-24 |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Learning, recall, delegation and delivery design reference | `9ab056d4e8b892fccb797cc5cd5dffd090ac827e` | 2026-08-24 |

## Update procedure

1. Add both remotes without changing Kaki's default remote: `git remote add openclaw-upstream https://github.com/openclaw/openclaw.git` and `git remote add hermes-upstream https://github.com/NousResearch/hermes-agent.git`.
2. Fetch tags and inspect changes between the old and proposed immutable revisions.
3. Port selected changes into the owning Kaki package. Do not restore telemetry, automatic third-party skill installation, or removed channel defaults.
4. Run `pnpm check` and fixture e2e tests, update this table and `THIRD_PARTY_NOTICES.md`, and record behavior-changing choices in `docs/DECISIONS.md`.

The initial shared workspace did not contain an OpenClaw Git history to preserve. The pinned revision above is the import boundary; importing the complete upstream history remains a release-engineering task and must not be simulated by claiming provenance for newly authored Kaki files.
