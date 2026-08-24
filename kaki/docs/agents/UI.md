# UI

## Delivered

- Completed the Kaki control centre across all §19 surfaces: Household, Approvals, Phone, Journey, Skills, Locale, Cost, Traces, and Monitors, while retaining the established forest/cream visual language.
- Replaced inert navigation with an accessible tab system. All panels are server-rendered for discoverability and use labelled tab/tabpanel relationships, visible keyboard focus, live status regions, and reduced-motion support.
- Added representative household privacy cards; actionable approval decisions; dedicated-phone status/manual controls; journey edit/delete handoffs; local skill draft editing; regional locale previews; cost/budget reporting; step-by-step trace replay; and monitor toggles with quiet-hours context.
- Preserved responsive layouts for sidebar navigation, approval cards, phone controls, editors, and trace replay.
- Reworked the application README and rendered-product tests so they describe Kaki rather than template infrastructure.

## Test

```sh
cd apps/control-ui
npm run lint
npm test
```

The product remains self-hosted and was intentionally not published.

## Integration boundary

Current interactions demonstrate the UI contracts with local component state. Gateway integration should provide household entities, approval mutations, phone WebSocket frames, journey CRUD, skill drafts, locale packs, cost events, trace artifacts, and monitor state through authenticated local endpoints. Every irreversible button must continue to resolve through the approval engine rather than writing directly from the UI.

## Open issues

- Live phone video and trace screenshots need the gateway's authenticated streaming endpoint.
- Journey deletion and skill publication need server-side authorization and durable audit entries.
- Production packaging should restrict the control centre to the household's private network or authenticated Tailscale route.
