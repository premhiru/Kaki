import { i as t, r as n } from "./framework-DTZGTDtF.js";
import { r as e } from "./rolldown-runtime-hePW80VL.js";
var r = e(t(), 1),
  i = 1e6,
  a = 1e5,
  o = 1e4,
  s = class {
    constructor(e = `/api/kaki`, t = fetch, n = o) {
      if (!e.startsWith(`/`) || e.startsWith(`//`))
        throw Error(`Kaki HTTP routes must stay on the authenticated origin.`);
      if (!Number.isSafeInteger(n) || n < 1 || n > 6e4) throw Error(`invalid-kaki-gateway-timeout`);
      ((this.basePath = e), (this.fetcher = t), (this.timeoutMs = n));
    }
    async snapshot() {
      return u(await this.request(`snapshot`, { method: `GET` }));
    }
    async perform(e) {
      let t = JSON.stringify(e);
      if (new TextEncoder().encode(t).byteLength > a)
        throw Error(`Action exceeded the control-centre request limit.`);
      let n = p(
        await this.request(`action`, {
          method: `POST`,
          headers: { "content-type": `application/json`, "x-kaki-intent": `operator-action` },
          body: t,
        }),
        `invalid-action-outcome`,
      );
      return {
        ok: h(n.ok, `invalid-action-outcome`),
        message: g(n.message, `invalid-action-outcome`),
        ...(n.snapshot === void 0 ? {} : { snapshot: u(n.snapshot) }),
      };
    }
    async request(e, t) {
      let n = new AbortController(),
        r = setTimeout(() => n.abort(), this.timeoutMs);
      try {
        let r = await this.fetcher(`${this.basePath}/${e}`, {
          ...t,
          cache: `no-store`,
          credentials: `same-origin`,
          headers: { accept: `application/json`, ...t.headers },
          signal: n.signal,
        });
        if (!r.ok) {
          let e =
            r.status === 401 || r.status === 403
              ? `Open Kaki from the authenticated Gateway and verify operator access.`
              : `Check Gateway status and retry.`;
          throw Error(`Gateway request failed (${r.status}). ${e}`);
        }
        let a = Number(r.headers.get(`content-length`));
        if (Number.isFinite(a) && a > i)
          throw Error(`Gateway response exceeded the control-centre limit.`);
        let o = await r.text();
        if (new TextEncoder().encode(o).byteLength > i)
          throw Error(`Gateway response exceeded the control-centre limit.`);
        return JSON.parse(o);
      } catch (e) {
        throw n.signal.aborted ? Error(`Gateway request timed out. Retry the action.`) : e;
      } finally {
        clearTimeout(r);
      }
    }
  };
function c() {
  return (window.__KAKI_GATEWAY__ ??= new s());
}
function l(e, t) {
  if (e)
    try {
      let n = new URL(t),
        r = new URL(e, n);
      return r.origin === n.origin ? r.href : void 0;
    } catch {
      return;
    }
}
function u(e) {
  let t = p(e, `invalid-control-snapshot`),
    n = p(t.phone, `invalid-control-snapshot`),
    r = p(t.locale, `invalid-control-snapshot`),
    i = p(t.cost, `invalid-control-snapshot`),
    a = p(t.health, `invalid-control-snapshot`),
    o = g(a.state, `invalid-control-snapshot`);
  if (o !== `steady` && o !== `degraded`) throw Error(`invalid-control-snapshot`);
  return {
    householdName: g(t.householdName, `invalid-control-snapshot`),
    operatorName: g(t.operatorName, `invalid-control-snapshot`),
    paused: h(t.paused, `invalid-control-snapshot`),
    health: { state: o, checkedAt: g(a.checkedAt, `invalid-control-snapshot`) },
    household: m(t.household, `invalid-control-snapshot`).map((e) => {
      let t = p(e, `invalid-control-snapshot`);
      return {
        id: g(t.id, `invalid-control-snapshot`),
        initials: g(t.initials, `invalid-control-snapshot`),
        name: g(t.name, `invalid-control-snapshot`),
        relation: g(t.relation, `invalid-control-snapshot`),
        language: g(t.language, `invalid-control-snapshot`),
        detail: g(t.detail, `invalid-control-snapshot`),
      };
    }),
    approvals: m(t.approvals, `invalid-control-snapshot`).map(d),
    phone: {
      connected: h(n.connected, `invalid-control-snapshot`),
      name: g(n.name, `invalid-control-snapshot`),
      ...(n.batteryPercent === void 0 ? {} : { batteryPercent: _(n.batteryPercent) }),
      ...(n.frameUrl === void 0 ? {} : { frameUrl: g(n.frameUrl, `invalid-control-snapshot`) }),
      summary: g(n.summary, `invalid-control-snapshot`),
    },
    journey: m(t.journey, `invalid-control-snapshot`).map((e) => {
      let t = p(e, `invalid-control-snapshot`);
      return {
        id: g(t.id, `invalid-control-snapshot`),
        time: g(t.time, `invalid-control-snapshot`),
        title: g(t.title, `invalid-control-snapshot`),
        detail: g(t.detail, `invalid-control-snapshot`),
      };
    }),
    skills: m(t.skills, `invalid-control-snapshot`).map((e) => {
      let t = p(e, `invalid-control-snapshot`),
        n = g(t.source, `invalid-control-snapshot`);
      if (n !== `maintained` && n !== `learned` && n !== `phone`)
        throw Error(`invalid-control-snapshot`);
      return {
        id: g(t.id, `invalid-control-snapshot`),
        source: n,
        instructions: g(t.instructions, `invalid-control-snapshot`, 64e3),
      };
    }),
    locale: {
      active: g(r.active, `invalid-control-snapshot`),
      available: m(r.available, `invalid-control-snapshot`).map((e) =>
        g(e, `invalid-control-snapshot`),
      ),
      preview: g(r.preview, `invalid-control-snapshot`),
      currency: g(r.currency, `invalid-control-snapshot`),
      timeZone: g(r.timeZone, `invalid-control-snapshot`),
    },
    cost: {
      month: g(i.month, `invalid-control-snapshot`),
      today: g(i.today, `invalid-control-snapshot`),
      localShare: g(i.localShare, `invalid-control-snapshot`),
      budgetRemaining: g(i.budgetRemaining, `invalid-control-snapshot`),
    },
    traces: m(t.traces, `invalid-control-snapshot`).map((e) => {
      let t = p(e, `invalid-control-snapshot`);
      return {
        id: g(t.id, `invalid-control-snapshot`),
        title: g(t.title, `invalid-control-snapshot`),
        steps: m(t.steps, `invalid-control-snapshot`).map((e) => {
          let t = p(e, `invalid-control-snapshot`);
          return {
            title: g(t.title, `invalid-control-snapshot`),
            evidence: g(t.evidence, `invalid-control-snapshot`),
          };
        }),
      };
    }),
    monitors: m(t.monitors, `invalid-control-snapshot`).map((e) => {
      let t = p(e, `invalid-control-snapshot`);
      return {
        id: g(t.id, `invalid-control-snapshot`),
        title: g(t.title, `invalid-control-snapshot`),
        detail: g(t.detail, `invalid-control-snapshot`),
        status: g(t.status, `invalid-control-snapshot`),
        enabled: h(t.enabled, `invalid-control-snapshot`),
      };
    }),
  };
}
function d(e) {
  let t = p(e, `invalid-control-snapshot`),
    n = g(t.state, `invalid-control-snapshot`);
  if (n !== `pending` && n !== `approved` && n !== `denied`)
    throw Error(`invalid-control-snapshot`);
  return {
    id: g(t.id, `invalid-control-snapshot`),
    factsHash: f(t.factsHash),
    title: g(t.title, `invalid-control-snapshot`),
    detail: g(t.detail, `invalid-control-snapshot`),
    amount: g(t.amount, `invalid-control-snapshot`),
    evidence: g(t.evidence, `invalid-control-snapshot`),
    state: n,
  };
}
function f(e) {
  if (typeof e != `string` || !/^[a-f0-9]{64}$/u.test(e)) throw Error(`invalid-control-snapshot`);
  return e;
}
function p(e, t) {
  if (!e || typeof e != `object` || Array.isArray(e)) throw Error(t);
  return e;
}
function m(e, t) {
  if (!Array.isArray(e) || e.length > 1e3) throw Error(t);
  return e;
}
function h(e, t) {
  if (typeof e != `boolean`) throw Error(t);
  return e;
}
function g(e, t, n = 4e3) {
  if (typeof e != `string` || e.length > n) throw Error(t);
  return e;
}
function _(e) {
  if (typeof e != `number` || !Number.isFinite(e) || e < 0 || e > 100)
    throw Error(`invalid-control-snapshot`);
  return e;
}
var v = n(),
  y = [
    `Today`,
    `Household`,
    `Approvals`,
    `Phone`,
    `Journey`,
    `Skills`,
    `Locale`,
    `Cost`,
    `Traces`,
    `Monitors`,
  ];
function b() {
  let [e, t] = (0, r.useState)(`Today`),
    [n, i] = (0, r.useState)(),
    [a, o] = (0, r.useState)(`Connecting to the authenticated Gateway…`),
    [s, u] = (0, r.useState)(`No action requested.`),
    [d, f] = (0, r.useState)(!1),
    [p, m] = (0, r.useState)(``),
    [h, g] = (0, r.useState)(``),
    [_, b] = (0, r.useState)({});
  (0, r.useEffect)(() => {
    let e = window.location.hash.slice(1).toLowerCase(),
      n = y.find((t) => t.toLowerCase() === e);
    n && queueMicrotask(() => t(n));
    let r = c();
    if (!r) {
      queueMicrotask(() =>
        o(`Gateway client unavailable. Open Kaki from the authenticated OpenClaw Control UI.`),
      );
      return;
    }
    let a = !0;
    r.snapshot()
      .then((e) => {
        if (!a) return;
        (i(e), o(`Connected to the household Gateway.`));
        let t = e.skills[0];
        t && (m(t.id), g(t.instructions));
      })
      .catch((e) => {
        a && o(`Gateway connection failed: ${T(e)}`);
      });
    let s = r.subscribe?.((e) => {
      a && i(e);
    });
    return () => {
      ((a = !1), s?.());
    };
  }, []);
  let D = n?.approvals.filter((e) => e.state === `pending`).length ?? 0,
    O = (0, r.useMemo)(() => n?.skills.find((e) => e.id === p) ?? n?.skills[0], [p, n]),
    k = l(n?.phone.frameUrl, window.location.href);
  function A(e) {
    (t(e), window.history.replaceState(null, ``, `#${e.toLowerCase()}`));
  }
  async function j(e) {
    let t = c();
    if (!t) {
      u(`Action not sent: connect through the authenticated Gateway and retry.`);
      return;
    }
    (f(!0), u(`Waiting for Gateway outcome…`));
    try {
      let n = await t.perform(e);
      (u(n.message), i(n.snapshot ?? (await t.snapshot())));
    } catch (e) {
      u(`Action failed: ${T(e)}. Check Gateway status and retry.`);
    } finally {
      f(!1);
    }
  }
  return (0, v.jsxs)(`main`, {
    className: `shell`,
    children: [
      (0, v.jsxs)(`aside`, {
        className: `sidebar`,
        children: [
          (0, v.jsxs)(`div`, {
            className: `brand`,
            children: [
              (0, v.jsx)(`span`, { className: `brandMark`, "aria-hidden": `true`, children: `K` }),
              (0, v.jsxs)(`div`, {
                children: [
                  (0, v.jsx)(`strong`, { children: `Kaki` }),
                  (0, v.jsx)(`small`, { children: n?.householdName ?? `Household control centre` }),
                ],
              }),
            ],
          }),
          (0, v.jsx)(`div`, {
            className: `nav`,
            "aria-label": `Control centre`,
            role: `tablist`,
            "aria-orientation": `vertical`,
            children: y.map((t) =>
              (0, v.jsxs)(
                `button`,
                {
                  "aria-controls": `panel-${t.toLowerCase()}`,
                  "aria-selected": e === t,
                  className: e === t ? `active` : ``,
                  id: `tab-${t.toLowerCase()}`,
                  onClick: () => A(t),
                  role: `tab`,
                  children: [
                    t,
                    (0, v.jsx)(`span`, { children: t === `Approvals` && D > 0 ? D : `` }),
                  ],
                },
                t,
              ),
            ),
          }),
          (0, v.jsxs)(`div`, {
            className: `system`,
            role: `status`,
            children: [(0, v.jsx)(`i`, { "aria-hidden": `true` }), a],
          }),
        ],
      }),
      (0, v.jsxs)(`section`, {
        className: `workspace`,
        children: [
          (0, v.jsxs)(`header`, {
            className: `topbar`,
            children: [
              (0, v.jsxs)(`div`, {
                children: [
                  (0, v.jsx)(`p`, { className: `eyebrow`, children: `LIVE HOUSEHOLD GATEWAY` }),
                  (0, v.jsx)(`h1`, {
                    children:
                      e === `Today` ? `Hello${n?.operatorName ? `, ${n.operatorName}` : ``}.` : e,
                  }),
                  (0, v.jsx)(`p`, { className: `lede`, children: E(e) }),
                ],
              }),
              (0, v.jsx)(`button`, {
                "aria-pressed": n?.paused ?? !1,
                className: n?.paused ? `pause paused` : `pause`,
                disabled: !n || d,
                onClick: () => void j({ type: `system.pause`, paused: !n?.paused }),
                children: n?.paused ? `Resume Kaki` : `Pause Kaki`,
              }),
            ],
          }),
          !n &&
            (0, v.jsxs)(`div`, {
              className: `privacyNote`,
              role: `status`,
              children: [
                (0, v.jsx)(`strong`, { children: `Live data is not loaded.` }),
                (0, v.jsx)(`span`, { children: a }),
              ],
            }),
          (0, v.jsx)(`p`, { className: `statusLine`, "aria-live": `polite`, children: s }),
          (0, v.jsxs)(x, {
            active: e === `Today`,
            id: `today`,
            children: [
              (0, v.jsx)(S, {
                eyebrow: `NEEDS YOUR TAP`,
                title: `Approvals`,
                meta: `${D} pending`,
              }),
              (0, v.jsx)(`div`, {
                className: `approvalGrid`,
                children: n?.approvals.map((e) =>
                  (0, v.jsx)(
                    C,
                    {
                      approval: e,
                      busy: d,
                      onDecision: (t) =>
                        void j({
                          type: `approval.decide`,
                          id: e.id,
                          decision: t,
                          factsHash: e.factsHash,
                        }),
                    },
                    e.id,
                  ),
                ),
              }),
              (0, v.jsxs)(`div`, {
                className: `lowerGrid`,
                children: [
                  (0, v.jsxs)(`section`, {
                    className: `panel householdSummary`,
                    children: [
                      (0, v.jsx)(S, { eyebrow: `HOUSEHOLD`, title: `People and privacy` }),
                      (0, v.jsx)(`div`, {
                        className: `people`,
                        children: n?.household.map((e) =>
                          (0, v.jsx)(`span`, { children: e.initials }, e.id),
                        ),
                      }),
                      (0, v.jsx)(`button`, {
                        className: `textButton`,
                        onClick: () => A(`Household`),
                        children: `View household →`,
                      }),
                    ],
                  }),
                  (0, v.jsxs)(`section`, {
                    className: `panel`,
                    children: [
                      (0, v.jsx)(S, { eyebrow: `MONITORS`, title: `Quietly watching` }),
                      (0, v.jsxs)(`p`, {
                        children: [
                          n?.monitors.filter((e) => e.enabled).length ?? 0,
                          ` active monitors`,
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          (0, v.jsxs)(x, {
            active: e === `Household`,
            id: `household`,
            children: [
              (0, v.jsx)(`div`, {
                className: `memberGrid`,
                children: n?.household.map((e) =>
                  (0, v.jsxs)(
                    `article`,
                    {
                      className: `panel member`,
                      children: [
                        (0, v.jsx)(`span`, { className: `avatar`, children: e.initials }),
                        (0, v.jsxs)(`div`, {
                          children: [
                            (0, v.jsx)(`p`, { className: `eyebrow`, children: e.relation }),
                            (0, v.jsx)(`h2`, { children: e.name }),
                            (0, v.jsx)(`p`, { children: e.language }),
                            (0, v.jsx)(`small`, { children: e.detail }),
                          ],
                        }),
                        (0, v.jsx)(`button`, {
                          disabled: d,
                          onClick: () => void j({ type: `household.edit`, id: e.id }),
                          children: `Edit`,
                        }),
                      ],
                    },
                    e.id,
                  ),
                ),
              }),
              (0, v.jsxs)(`div`, {
                className: `privacyNote`,
                children: [
                  (0, v.jsx)(`strong`, { children: `Privacy walls are enforced by the Gateway.` }),
                  (0, v.jsx)(`span`, {
                    children: `Edits return a visible policy or approval outcome.`,
                  }),
                ],
              }),
            ],
          }),
          (0, v.jsx)(x, {
            active: e === `Approvals`,
            id: `approvals`,
            children: (0, v.jsx)(`div`, {
              className: `approvalGrid`,
              children: n?.approvals.map((e) =>
                (0, v.jsx)(
                  C,
                  {
                    approval: e,
                    busy: d,
                    onDecision: (t) =>
                      void j({
                        type: `approval.decide`,
                        id: e.id,
                        decision: t,
                        factsHash: e.factsHash,
                      }),
                  },
                  e.id,
                ),
              ),
            }),
          }),
          (0, v.jsx)(x, {
            active: e === `Phone`,
            id: `phone`,
            children: (0, v.jsxs)(`div`, {
              className: `phoneLayout`,
              children: [
                (0, v.jsxs)(`section`, {
                  className: `phoneFrame`,
                  "aria-label": `Live phone view`,
                  children: [
                    (0, v.jsxs)(`div`, {
                      className: `phoneTop`,
                      children: [
                        (0, v.jsx)(`span`, { children: n?.phone.name ?? `Phone` }),
                        (0, v.jsx)(`span`, {
                          children:
                            n?.phone.batteryPercent === void 0 ? `—` : `${n.phone.batteryPercent}%`,
                        }),
                      ],
                    }),
                    (0, v.jsxs)(`div`, {
                      className: `phoneScreen`,
                      children: [
                        k
                          ? (0, v.jsx)(`img`, {
                              alt: `Latest redacted assistant phone frame`,
                              className: `phoneImage`,
                              referrerPolicy: `no-referrer`,
                              src: k,
                            })
                          : (0, v.jsx)(`p`, { children: `No live frame available.` }),
                        (0, v.jsx)(`strong`, { children: n?.phone.summary }),
                      ],
                    }),
                  ],
                }),
                (0, v.jsxs)(`section`, {
                  className: `panel manual`,
                  children: [
                    (0, v.jsx)(`p`, {
                      className: `eyebrow`,
                      children: `DEDICATED ASSISTANT PHONE`,
                    }),
                    (0, v.jsx)(`h2`, { children: `Live and manual control` }),
                    (0, v.jsx)(`p`, {
                      children: n?.phone.connected ? `Connected` : `Disconnected`,
                    }),
                    (0, v.jsx)(`div`, {
                      className: `manualGrid`,
                      children: [
                        `screenshot`,
                        `back`,
                        `home`,
                        `tap-target`,
                        `refresh-tree`,
                        `relaunch`,
                      ].map((e) =>
                        (0, v.jsx)(
                          `button`,
                          {
                            disabled: !n?.phone.connected || d,
                            onClick: () => void j({ type: `phone.command`, command: e }),
                            children: e.replace(`-`, ` `),
                          },
                          e,
                        ),
                      ),
                    }),
                    (0, v.jsxs)(`div`, {
                      className: `privacyNote`,
                      children: [
                        (0, v.jsx)(`strong`, { children: `Channel-link QR hidden.` }),
                        (0, v.jsx)(`span`, {
                          children: `Raw WhatsApp QR credentials are available only on an authenticated loopback or Tailnet operator surface.`,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
          (0, v.jsx)(x, {
            active: e === `Journey`,
            id: `journey`,
            children: (0, v.jsx)(`div`, {
              className: `journeyList`,
              children: n?.journey.map((e, t) =>
                (0, v.jsxs)(
                  `article`,
                  {
                    className: `journeyItem`,
                    children: [
                      (0, v.jsx)(`div`, { className: `journeyDot`, children: t + 1 }),
                      (0, v.jsx)(`time`, { children: e.time }),
                      (0, v.jsxs)(`div`, {
                        children: [
                          (0, v.jsx)(`h2`, { children: e.title }),
                          (0, v.jsx)(`p`, { children: e.detail }),
                        ],
                      }),
                      (0, v.jsxs)(`div`, {
                        className: `rowActions`,
                        children: [
                          (0, v.jsx)(`button`, {
                            disabled: d,
                            onClick: () => void j({ type: `journey.edit`, id: e.id }),
                            children: `Edit`,
                          }),
                          (0, v.jsx)(`button`, {
                            disabled: d,
                            onClick: () => void j({ type: `journey.delete`, id: e.id }),
                            children: `Delete`,
                          }),
                        ],
                      }),
                    ],
                  },
                  e.id,
                ),
              ),
            }),
          }),
          (0, v.jsx)(x, {
            active: e === `Skills`,
            id: `skills`,
            children: (0, v.jsxs)(`div`, {
              className: `editorLayout`,
              children: [
                (0, v.jsx)(`aside`, {
                  className: `skillList`,
                  "aria-label": `Installed skills`,
                  children: n?.skills.map((e) =>
                    (0, v.jsxs)(
                      `button`,
                      {
                        "aria-pressed": O?.id === e.id,
                        className: O?.id === e.id ? `selected` : ``,
                        onClick: () => {
                          (m(e.id), g(e.instructions));
                        },
                        children: [e.id, (0, v.jsx)(`small`, { children: e.source })],
                      },
                      e.id,
                    ),
                  ),
                }),
                (0, v.jsxs)(`section`, {
                  className: `panel editor`,
                  children: [
                    (0, v.jsx)(`div`, {
                      className: `editorHead`,
                      children: (0, v.jsxs)(`div`, {
                        children: [
                          (0, v.jsx)(`p`, { className: `eyebrow`, children: `SKILL.MD` }),
                          (0, v.jsx)(`h2`, { children: O?.id ?? `Select a skill` }),
                        ],
                      }),
                    }),
                    (0, v.jsx)(`label`, {
                      htmlFor: `skill-instructions`,
                      children: `Safe execution notes`,
                    }),
                    (0, v.jsx)(`textarea`, {
                      id: `skill-instructions`,
                      maxLength: 64e3,
                      onChange: (e) => g(e.target.value),
                      rows: 12,
                      value: h,
                    }),
                    (0, v.jsxs)(`div`, {
                      className: `editorFooter`,
                      children: [
                        (0, v.jsx)(`span`, { children: `Drafts require Gateway authorization.` }),
                        (0, v.jsx)(`button`, {
                          className: `primary`,
                          disabled: !O || d,
                          onClick: () =>
                            O && void j({ type: `skill.save-draft`, id: O.id, instructions: h }),
                          children: `Save draft`,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
          (0, v.jsx)(x, {
            active: e === `Locale`,
            id: `locale`,
            children: (0, v.jsxs)(`div`, {
              className: `localeGrid`,
              children: [
                (0, v.jsxs)(`section`, {
                  className: `panel`,
                  children: [
                    (0, v.jsx)(`p`, { className: `eyebrow`, children: `ACTIVE HOUSEHOLD LOCALE` }),
                    (0, v.jsx)(`h2`, { children: n?.locale.active ?? `Not loaded` }),
                    (0, v.jsx)(`label`, { htmlFor: `locale-select`, children: `Regional pack` }),
                    (0, v.jsxs)(`select`, {
                      disabled: !n || d,
                      id: `locale-select`,
                      onChange: (e) => void j({ type: `locale.set`, locale: e.target.value }),
                      value: n?.locale.active ?? ``,
                      children: [
                        (0, v.jsx)(`option`, {
                          disabled: !0,
                          value: ``,
                          children: `Choose a locale`,
                        }),
                        n?.locale.available.map((e) => (0, v.jsx)(`option`, { children: e }, e)),
                      ],
                    }),
                    (0, v.jsxs)(`div`, {
                      className: `localeFacts`,
                      children: [
                        (0, v.jsxs)(`span`, {
                          children: [
                            `Currency `,
                            (0, v.jsx)(`b`, { children: n?.locale.currency }),
                          ],
                        }),
                        (0, v.jsxs)(`span`, {
                          children: [
                            `Timezone `,
                            (0, v.jsx)(`b`, { children: n?.locale.timeZone }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                (0, v.jsxs)(`section`, {
                  className: `panel`,
                  children: [
                    (0, v.jsx)(`p`, { className: `eyebrow`, children: `REGISTER PREVIEW` }),
                    (0, v.jsx)(`blockquote`, {
                      children: n?.locale.preview ?? `Locale preview unavailable.`,
                    }),
                  ],
                }),
              ],
            }),
          }),
          (0, v.jsxs)(x, {
            active: e === `Cost`,
            id: `cost`,
            children: [
              (0, v.jsxs)(`div`, {
                className: `summaryStrip`,
                children: [
                  (0, v.jsx)(w, { value: n?.cost.month ?? `—`, label: `this month` }),
                  (0, v.jsx)(w, { value: n?.cost.today ?? `—`, label: `today` }),
                  (0, v.jsx)(w, { value: n?.cost.localShare ?? `—`, label: `local model share` }),
                ],
              }),
              (0, v.jsx)(`section`, {
                className: `panel costPanel`,
                children: (0, v.jsxs)(`div`, {
                  className: `budget`,
                  children: [
                    (0, v.jsx)(`span`, { children: `Budget remaining` }),
                    (0, v.jsx)(`strong`, { children: n?.cost.budgetRemaining ?? `Unavailable` }),
                  ],
                }),
              }),
            ],
          }),
          (0, v.jsx)(x, {
            active: e === `Traces`,
            id: `traces`,
            children: (0, v.jsx)(`div`, {
              className: `monitorGrid`,
              children: n?.traces.map((e) => {
                let t = Math.min(_[e.id] ?? 1, Math.max(e.steps.length, 1)),
                  n = e.steps[t - 1];
                return (0, v.jsxs)(
                  `section`,
                  {
                    className: `panel replay`,
                    children: [
                      (0, v.jsx)(`p`, { className: `eyebrow`, children: `TRACE REPLAY` }),
                      (0, v.jsx)(`h2`, { children: e.title }),
                      (0, v.jsx)(`p`, { children: n?.title ?? `No replayable steps` }),
                      (0, v.jsx)(`div`, {
                        className: `selectorBox`,
                        children: n?.evidence ?? `No secret-bearing evidence retained.`,
                      }),
                      (0, v.jsx)(`label`, {
                        htmlFor: `trace-${e.id}`,
                        children: `Replay position`,
                      }),
                      (0, v.jsx)(`input`, {
                        disabled: e.steps.length < 2,
                        id: `trace-${e.id}`,
                        max: Math.max(e.steps.length, 1),
                        min: `1`,
                        onChange: (t) => {
                          let n = Number(t.target.value);
                          (b((t) => ({ ...t, [e.id]: n })),
                            j({ type: `trace.position`, id: e.id, step: n }));
                        },
                        type: `range`,
                        value: t,
                      }),
                    ],
                  },
                  e.id,
                );
              }),
            }),
          }),
          (0, v.jsxs)(x, {
            active: e === `Monitors`,
            id: `monitors`,
            children: [
              (0, v.jsx)(`div`, {
                className: `monitorGrid`,
                children: n?.monitors.map((e) =>
                  (0, v.jsxs)(
                    `article`,
                    {
                      className: `panel monitor`,
                      children: [
                        (0, v.jsxs)(`span`, {
                          className: `switch`,
                          children: [
                            (0, v.jsx)(`input`, {
                              "aria-label": `Enable ${e.title}`,
                              checked: e.enabled,
                              disabled: d,
                              id: `monitor-${e.id}`,
                              onChange: (t) =>
                                void j({
                                  type: `monitor.set`,
                                  id: e.id,
                                  enabled: t.target.checked,
                                }),
                              type: `checkbox`,
                            }),
                            (0, v.jsx)(`i`, { "aria-hidden": `true` }),
                          ],
                        }),
                        (0, v.jsxs)(`div`, {
                          children: [
                            (0, v.jsx)(`h2`, {
                              children: (0, v.jsx)(`label`, {
                                htmlFor: `monitor-${e.id}`,
                                children: e.title,
                              }),
                            }),
                            (0, v.jsx)(`p`, { children: e.detail }),
                            (0, v.jsx)(`small`, { children: e.status }),
                          ],
                        }),
                      ],
                    },
                    e.id,
                  ),
                ),
              }),
              (0, v.jsxs)(`div`, {
                className: `privacyNote`,
                children: [
                  (0, v.jsx)(`strong`, { children: `Quiet hours are policy-owned.` }),
                  (0, v.jsx)(`span`, {
                    children: `Every change returns an audited Gateway outcome.`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function x({ active: e, children: t, id: n }) {
  return (0, v.jsx)(`section`, {
    "aria-labelledby": `tab-${n}`,
    className: `tabPanel`,
    hidden: !e,
    id: `panel-${n}`,
    role: `tabpanel`,
    tabIndex: 0,
    children: t,
  });
}
function S({ eyebrow: e, title: t, meta: n }) {
  return (0, v.jsxs)(`div`, {
    className: `sectionTitle`,
    children: [
      (0, v.jsxs)(`div`, {
        children: [
          (0, v.jsx)(`p`, { className: `eyebrow`, children: e }),
          (0, v.jsx)(`h2`, { children: t }),
        ],
      }),
      n && (0, v.jsx)(`span`, { children: n }),
    ],
  });
}
function C({ approval: e, busy: t, onDecision: n }) {
  return (0, v.jsxs)(`article`, {
    className: `approvalCard ${e.state}`,
    children: [
      (0, v.jsxs)(`div`, {
        className: `cardTop`,
        children: [
          (0, v.jsx)(`span`, { children: e.state === `pending` ? `Needs approval` : e.state }),
          (0, v.jsx)(`strong`, { children: e.amount }),
        ],
      }),
      (0, v.jsx)(`h3`, { children: e.title }),
      (0, v.jsx)(`p`, { children: e.detail }),
      (0, v.jsx)(`div`, { className: `evidence`, children: e.evidence }),
      e.state === `pending`
        ? (0, v.jsxs)(`div`, {
            className: `actions`,
            children: [
              (0, v.jsx)(`button`, {
                className: `approve`,
                disabled: t,
                onClick: () => n(`approved`),
                children: `Approve`,
              }),
              (0, v.jsx)(`button`, { disabled: t, onClick: () => n(`denied`), children: `Deny` }),
            ],
          })
        : (0, v.jsxs)(`p`, { className: `decision`, children: [`Decision recorded: `, e.state] }),
    ],
  });
}
function w({ value: e, label: t }) {
  return (0, v.jsxs)(`div`, {
    children: [(0, v.jsx)(`strong`, { children: e }), (0, v.jsx)(`span`, { children: t })],
  });
}
function T(e) {
  return e instanceof Error ? e.message : String(e);
}
function E(e) {
  return {
    Today: `Live household status and decisions.`,
    Household: `People, preferences and privacy walls.`,
    Approvals: `One audited outcome for every irreversible step.`,
    Phone: `The dedicated assistant phone, live and traceable.`,
    Journey: `What Kaki did, in household time.`,
    Skills: `Reviewed playbooks and learned improvements.`,
    Locale: `Language, register and regional defaults.`,
    Cost: `Gateway-reported spend, budgets and model mix.`,
    Traces: `Replay redacted browser and phone steps.`,
    Monitors: `Useful heads-ups, never noise.`,
  }[e];
}
export { b as default };
