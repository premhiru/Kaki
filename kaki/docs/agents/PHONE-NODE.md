# PHONE-NODE

## Delivered

- Expanded `@kaki/phone-node` into an injectable ADB transport with screenshot, accessibility dump, text/id/description targeting, tap, long press, swipe, Unicode typing through ADBKeyboard, keys, app launch, intents, clipboard bridge, notification read, wait, scrolling, and Home primitives.
- Added health/reconnect and screen-on support plus a Gateway-facing daemon that registers `kaki.phone.task.execute`, executes 40-step tasks, reports health, and emits disconnect/reconnect/task events.
- Gateway task execution now requires an injected authority lease bound to household, session, run, and lifecycle generation. The daemon revalidates its closure before and after awaited device/model/trace work and releases it on every terminal path.
- Strengthened the vision loop with strict action shapes, irreversible-screen approval enforcement against both the accessibility tree and model decision, one accessibility dump per step, screenshot-difference stall detection, BACK/relaunch recovery, and replayable PNG/XML/JSONL traces under an injected task root.
- Added a dependency-free Python 3.11 strict JSON decision boundary in `packages/phone-node/vision` with approval tests.
- Added a `CompanionTransport` production contract for the native Android accessibility, gesture, notification, screenshot, and health RPC. It refuses non-loopback endpoints and sends pairing authorization on every call. Pairing uses `adb forward`, so the service is not exposed to the LAN.
- Added fixture-backed playbooks for Grab ride, GrabFood, foodpanda, SimplyGo, Parents Gateway, HealthHub, bank read-only, Touch 'n Go, GCash read-only, MoMo read-only, and generic app tasks.

## Test

```sh
corepack pnpm --filter @kaki/phone-node typecheck
corepack pnpm --filter @kaki/phone-node test
python -m pytest packages/phone-node/vision/tests
```

The focused TypeScript lane passes 18 tests with injected ADB, Gateway, authority, and companion clients; no phone is mutated in CI. Python parser behavior was also probed directly because `pytest` is not installed in the current runner. See `apps/companion-android/README.md` for physical-device pairing.

## Live verification

1. Install ADBKeyboard and the Kaki companion on a dedicated Android 10+ assistant phone.
2. Enable accessibility and notification access, connect ADB, and forward TCP 8765.
3. Verify `health`, screenshot, tree dump, Unicode type, tap, long-press, swipe, Back/Home, and notification retrieval.
4. Run Grab ride fixture inputs against a test account. The agent must stop on the fare confirmation screen, persist screenshot evidence, and return `need_approval`; only a valid approval may resume the confirmation action.
5. Disable Wi-Fi/ADB briefly and verify a disconnect event followed by successful reconnect and health reporting.

## Open issues

- Android build tooling and an SDK are not present in the workspace runner, so Kotlin compilation and physical-device interaction require the live verification above.
- Raw ADB notification and clipboard fallbacks depend on device/ROM support; the companion service is the supported path when those commands are unavailable.
- Bank, GCash, and MoMo playbooks are deliberately read-only. Payments route through explicit approval/payment flows owned by the approval node.
- Nightly reboot scheduling belongs to deployment/cron wiring; the daemon exposes the health and reconnect primitives it needs.
