# Operate Kaki from the household Control UI

The Kaki control centre renders household state and actions supplied by the authenticated OpenClaw Gateway. It does not ship demo household records or mutate durable state in browser-local component state.

## Open the control centre

Enable the Kaki plugin and open its **Kaki** sidebar tab in the authenticated OpenClaw Control UI. The plugin registers `surface: "tab"` at `/plugins/kaki/control` and serves its packaged Vinext client through the same Gateway-authenticated plugin route. The default `HttpKakiGatewayClient` reads `GET /api/kaki/snapshot` and sends typed actions to `POST /api/kaki/action` on that same origin. A host that already owns a connected Gateway client may inject a `KakiGatewayClient` as `window.__KAKI_GATEWAY__` instead. Opening copied assets without those routes shows a visible unavailable state and disables all state-changing controls.

The packaged client implements two owner boundaries:

- `snapshot()` returns the current household projection.
- `perform(action)` returns a visible success, denial, approval requirement, or failure outcome and may return the refreshed projection.

An optional `subscribe()` stream updates live state. The same-origin routes are registered by the Kaki plugin through OpenClaw's existing authenticated plugin HTTP surface; this does not define or version a new Gateway wire protocol. Responses are capped at 1 MB, parsed into a closed snapshot shape, and bounded by a 10-second timeout.

## Available surfaces

- **Household** reads people, language preferences, and privacy-safe details; edits go through the Gateway.
- **Approvals** sends the exact lowercase SHA-256 `factsHash` received in the snapshot with approve or deny decisions. Stale material facts return a conflict that tells the operator to refresh, without disclosing changed facts.
- **Phone** shows a redacted live frame and sends screenshot, Back, Home, tap-target, accessibility-refresh, and relaunch commands. It never receives or renders a raw WhatsApp channel-link QR.
- **Journey** reads the audit-backed journey and routes edit or delete through policy and approval.
- **Skills** reads installed maintained, learned, and phone skills and saves an authorized draft through the Gateway.
- **Locale** reads available packs and submits locale changes.
- **Cost** renders Gateway-reported spend, budget, and local-model share.
- **Traces** replays redacted evidence and reports replay position changes.
- **Monitors** reads and toggles monitor state with a visible audited outcome.

Pause and resume are also Gateway actions. Every action shows a waiting state and then the exact returned outcome; a network or authorization failure includes a retry direction instead of failing silently.

## Verify

```sh
pnpm --dir kaki --filter @kaki/control-ui lint
pnpm --dir kaki --filter @kaki/control-ui test
```

The rendered/client tests verify all required tabs, accessibility relationships, same-origin snapshot/action calls, exact `factsHash` round trips, disconnected behavior, and absence of representative demo records. Plugin tests additionally verify the authenticated route/tab registration and immutable asset responses. Full live interaction proof still requires a running authenticated Gateway session; standalone static hosting cannot provide that authority.

## Production readiness

- Serve the control centre only from the authenticated Gateway origin or an authenticated household Tailnet route.
- Validate every snapshot and action at the Gateway boundary; browser types are not authorization.
- Keep approval, journey deletion, skill publication, locale changes, phone actions, and monitor changes policy-owned and audited.
- Restrict phone frames to short-lived authenticated same-origin URLs with no referrer, and redact frames and trace artifacts before exposure. The UI does not embed frames in iframes.
- Never expose raw WhatsApp QR data through the general UI snapshot.

The remaining browser gate is a running authenticated OpenClaw Gateway with the Kaki plugin enabled; the tab must not be pointed at `chatgpt.site` or another origin. Phone frames/commands additionally require a paired dedicated Android device, and household/provider credentials remain required for end-to-end channel and live-provider proof.
