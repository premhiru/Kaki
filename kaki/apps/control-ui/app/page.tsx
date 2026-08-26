"use client";

import { useEffect, useMemo, useState } from "react";
import {
  currentKakiGatewayClient,
  resolveTrustedPhoneFrameUrl,
  type ApprovalDecision,
  type ApprovalItem,
  type KakiControlAction,
  type KakiControlSnapshot,
} from "./gateway";

const tabs = [
  "Today",
  "Household",
  "Approvals",
  "Phone",
  "Journey",
  "Skills",
  "Locale",
  "Cost",
  "Traces",
  "Monitors",
] as const;
type Tab = (typeof tabs)[number];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Today");
  const [snapshot, setSnapshot] = useState<KakiControlSnapshot>();
  const [connection, setConnection] = useState("Connecting to the authenticated Gateway…");
  const [outcome, setOutcome] = useState("No action requested.");
  const [busy, setBusy] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillText, setSkillText] = useState("");
  const [tracePositions, setTracePositions] = useState<Record<string, number>>({});

  useEffect(() => {
    const hash = window.location.hash.slice(1).toLowerCase();
    const requested = tabs.find((tab) => tab.toLowerCase() === hash);
    if (requested) queueMicrotask(() => setActiveTab(requested));
    const client = currentKakiGatewayClient();
    if (!client) {
      queueMicrotask(() =>
        setConnection(
          "Gateway client unavailable. Open Kaki from the authenticated OpenClaw Control UI.",
        ),
      );
      return;
    }
    let active = true;
    client
      .snapshot()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setConnection("Connected to the household Gateway.");
        const firstSkill = next.skills[0];
        if (firstSkill) {
          setSelectedSkill(firstSkill.id);
          setSkillText(firstSkill.instructions);
        }
      })
      .catch((error: unknown) => {
        if (active) setConnection(`Gateway connection failed: ${errorMessage(error)}`);
      });
    const unsubscribe = client.subscribe?.((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const pendingCount = snapshot?.approvals.filter((item) => item.state === "pending").length ?? 0;
  const selectedSkillItem = useMemo(
    () => snapshot?.skills.find((skill) => skill.id === selectedSkill) ?? snapshot?.skills[0],
    [selectedSkill, snapshot],
  );
  const phoneFrameUrl = resolveTrustedPhoneFrameUrl(
    snapshot?.phone.frameUrl,
    typeof window === "undefined" ? "http://localhost/" : window.location.href,
  );

  function chooseTab(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab.toLowerCase()}`);
  }

  async function perform(action: KakiControlAction) {
    const client = currentKakiGatewayClient();
    if (!client) {
      setOutcome("Action not sent: connect through the authenticated Gateway and retry.");
      return;
    }
    setBusy(true);
    setOutcome("Waiting for Gateway outcome…");
    try {
      const result = await client.perform(action);
      setOutcome(result.message);
      setSnapshot(result.snapshot ?? (await client.snapshot()));
    } catch (error) {
      setOutcome(`Action failed: ${errorMessage(error)}. Check Gateway status and retry.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">
            K
          </span>
          <div>
            <strong>Kaki</strong>
            <small>{snapshot?.householdName ?? "Household control centre"}</small>
          </div>
        </div>
        <div className="nav" aria-label="Control centre" role="tablist" aria-orientation="vertical">
          {tabs.map((item) => (
            <button
              aria-controls={`panel-${item.toLowerCase()}`}
              aria-selected={activeTab === item}
              className={activeTab === item ? "active" : ""}
              id={`tab-${item.toLowerCase()}`}
              key={item}
              onClick={() => chooseTab(item)}
              role="tab"
            >
              {item}
              <span>{item === "Approvals" && pendingCount > 0 ? pendingCount : ""}</span>
            </button>
          ))}
        </div>
        <div className="system" role="status">
          <i aria-hidden="true" />
          {connection}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">LIVE HOUSEHOLD GATEWAY</p>
            <h1>
              {activeTab === "Today"
                ? `Hello${snapshot?.operatorName ? `, ${snapshot.operatorName}` : ""}.`
                : activeTab}
            </h1>
            <p className="lede">{sectionDescription(activeTab)}</p>
          </div>
          <button
            aria-pressed={snapshot?.paused ?? false}
            className={snapshot?.paused ? "pause paused" : "pause"}
            disabled={!snapshot || busy}
            onClick={() => void perform({ type: "system.pause", paused: !snapshot?.paused })}
          >
            {snapshot?.paused ? "Resume Kaki" : "Pause Kaki"}
          </button>
        </header>

        {!snapshot && (
          <div className="privacyNote" role="status">
            <strong>Live data is not loaded.</strong>
            <span>{connection}</span>
          </div>
        )}
        <p className="statusLine" aria-live="polite">
          {outcome}
        </p>

        <TabPanel active={activeTab === "Today"} id="today">
          <SectionHeading
            eyebrow="NEEDS YOUR TAP"
            title="Approvals"
            meta={`${pendingCount} pending`}
          />
          <div className="approvalGrid">
            {snapshot?.approvals.map((approval) => (
              <ApprovalCard
                approval={approval}
                busy={busy}
                key={approval.id}
                onDecision={(decision) =>
                  void perform({
                    type: "approval.decide",
                    id: approval.id,
                    decision,
                    factsHash: approval.factsHash,
                  })
                }
              />
            ))}
          </div>
          <div className="lowerGrid">
            <section className="panel householdSummary">
              <SectionHeading eyebrow="HOUSEHOLD" title="People and privacy" />
              <div className="people">
                {snapshot?.household.map((person) => (
                  <span key={person.id}>{person.initials}</span>
                ))}
              </div>
              <button className="textButton" onClick={() => chooseTab("Household")}>
                View household →
              </button>
            </section>
            <section className="panel">
              <SectionHeading eyebrow="MONITORS" title="Quietly watching" />
              <p>
                {snapshot?.monitors.filter((monitor) => monitor.enabled).length ?? 0} active
                monitors
              </p>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Household"} id="household">
          <div className="memberGrid">
            {snapshot?.household.map((person) => (
              <article className="panel member" key={person.id}>
                <span className="avatar">{person.initials}</span>
                <div>
                  <p className="eyebrow">{person.relation}</p>
                  <h2>{person.name}</h2>
                  <p>{person.language}</p>
                  <small>{person.detail}</small>
                </div>
                <button
                  disabled={busy}
                  onClick={() => void perform({ type: "household.edit", id: person.id })}
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
          <div className="privacyNote">
            <strong>Privacy walls are enforced by the Gateway.</strong>
            <span>Edits return a visible policy or approval outcome.</span>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Approvals"} id="approvals">
          <div className="approvalGrid">
            {snapshot?.approvals.map((approval) => (
              <ApprovalCard
                approval={approval}
                busy={busy}
                key={approval.id}
                onDecision={(decision) =>
                  void perform({
                    type: "approval.decide",
                    id: approval.id,
                    decision,
                    factsHash: approval.factsHash,
                  })
                }
              />
            ))}
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Phone"} id="phone">
          <div className="phoneLayout">
            <section className="phoneFrame" aria-label="Live phone view">
              <div className="phoneTop">
                <span>{snapshot?.phone.name ?? "Phone"}</span>
                <span>
                  {snapshot?.phone.batteryPercent === undefined
                    ? "—"
                    : `${snapshot.phone.batteryPercent}%`}
                </span>
              </div>
              <div className="phoneScreen">
                {phoneFrameUrl ? (
                  // A short-lived authenticated frame URL must remain byte-exact; image optimization would detach auth.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Latest redacted assistant phone frame"
                    className="phoneImage"
                    referrerPolicy="no-referrer"
                    src={phoneFrameUrl}
                  />
                ) : (
                  <p>No live frame available.</p>
                )}
                <strong>{snapshot?.phone.summary}</strong>
              </div>
            </section>
            <section className="panel manual">
              <p className="eyebrow">DEDICATED ASSISTANT PHONE</p>
              <h2>Live and manual control</h2>
              <p>{snapshot?.phone.connected ? "Connected" : "Disconnected"}</p>
              <div className="manualGrid">
                {(
                  ["screenshot", "back", "home", "tap-target", "refresh-tree", "relaunch"] as const
                ).map((command) => (
                  <button
                    disabled={!snapshot?.phone.connected || busy}
                    key={command}
                    onClick={() => void perform({ type: "phone.command", command })}
                  >
                    {command.replace("-", " ")}
                  </button>
                ))}
              </div>
              <div className="privacyNote">
                <strong>Channel-link QR hidden.</strong>
                <span>
                  Raw WhatsApp QR credentials are available only on an authenticated loopback or
                  Tailnet operator surface.
                </span>
              </div>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Journey"} id="journey">
          <div className="journeyList">
            {snapshot?.journey.map((item, index) => (
              <article className="journeyItem" key={item.id}>
                <div className="journeyDot">{index + 1}</div>
                <time>{item.time}</time>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.detail}</p>
                </div>
                <div className="rowActions">
                  <button
                    disabled={busy}
                    onClick={() => void perform({ type: "journey.edit", id: item.id })}
                  >
                    Edit
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void perform({ type: "journey.delete", id: item.id })}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Skills"} id="skills">
          <div className="editorLayout">
            <aside className="skillList" aria-label="Installed skills">
              {snapshot?.skills.map((skill) => (
                <button
                  aria-pressed={selectedSkillItem?.id === skill.id}
                  className={selectedSkillItem?.id === skill.id ? "selected" : ""}
                  key={skill.id}
                  onClick={() => {
                    setSelectedSkill(skill.id);
                    setSkillText(skill.instructions);
                  }}
                >
                  {skill.id}
                  <small>{skill.source}</small>
                </button>
              ))}
            </aside>
            <section className="panel editor">
              <div className="editorHead">
                <div>
                  <p className="eyebrow">SKILL.MD</p>
                  <h2>{selectedSkillItem?.id ?? "Select a skill"}</h2>
                </div>
              </div>
              <label htmlFor="skill-instructions">Safe execution notes</label>
              <textarea
                id="skill-instructions"
                maxLength={64_000}
                onChange={(event) => setSkillText(event.target.value)}
                rows={12}
                value={skillText}
              />
              <div className="editorFooter">
                <span>Drafts require Gateway authorization.</span>
                <button
                  className="primary"
                  disabled={!selectedSkillItem || busy}
                  onClick={() =>
                    selectedSkillItem &&
                    void perform({
                      type: "skill.save-draft",
                      id: selectedSkillItem.id,
                      instructions: skillText,
                    })
                  }
                >
                  Save draft
                </button>
              </div>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Locale"} id="locale">
          <div className="localeGrid">
            <section className="panel">
              <p className="eyebrow">ACTIVE HOUSEHOLD LOCALE</p>
              <h2>{snapshot?.locale.active ?? "Not loaded"}</h2>
              <label htmlFor="locale-select">Regional pack</label>
              <select
                disabled={!snapshot || busy}
                id="locale-select"
                onChange={(event) =>
                  void perform({ type: "locale.set", locale: event.target.value })
                }
                value={snapshot?.locale.active ?? ""}
              >
                <option disabled value="">
                  Choose a locale
                </option>
                {snapshot?.locale.available.map((locale) => (
                  <option key={locale}>{locale}</option>
                ))}
              </select>
              <div className="localeFacts">
                <span>
                  Currency <b>{snapshot?.locale.currency}</b>
                </span>
                <span>
                  Timezone <b>{snapshot?.locale.timeZone}</b>
                </span>
              </div>
            </section>
            <section className="panel">
              <p className="eyebrow">REGISTER PREVIEW</p>
              <blockquote>{snapshot?.locale.preview ?? "Locale preview unavailable."}</blockquote>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Cost"} id="cost">
          <div className="summaryStrip">
            <Summary value={snapshot?.cost.month ?? "—"} label="this month" />
            <Summary value={snapshot?.cost.today ?? "—"} label="today" />
            <Summary value={snapshot?.cost.localShare ?? "—"} label="local model share" />
          </div>
          <section className="panel costPanel">
            <div className="budget">
              <span>Budget remaining</span>
              <strong>{snapshot?.cost.budgetRemaining ?? "Unavailable"}</strong>
            </div>
          </section>
        </TabPanel>

        <TabPanel active={activeTab === "Traces"} id="traces">
          <div className="monitorGrid">
            {snapshot?.traces.map((trace) => {
              const position = Math.min(
                tracePositions[trace.id] ?? 1,
                Math.max(trace.steps.length, 1),
              );
              const step = trace.steps[position - 1];
              return (
                <section className="panel replay" key={trace.id}>
                  <p className="eyebrow">TRACE REPLAY</p>
                  <h2>{trace.title}</h2>
                  <p>{step?.title ?? "No replayable steps"}</p>
                  <div className="selectorBox">
                    {step?.evidence ?? "No secret-bearing evidence retained."}
                  </div>
                  <label htmlFor={`trace-${trace.id}`}>Replay position</label>
                  <input
                    disabled={trace.steps.length < 2}
                    id={`trace-${trace.id}`}
                    max={Math.max(trace.steps.length, 1)}
                    min="1"
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setTracePositions((current) => ({ ...current, [trace.id]: next }));
                      void perform({ type: "trace.position", id: trace.id, step: next });
                    }}
                    type="range"
                    value={position}
                  />
                </section>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Monitors"} id="monitors">
          <div className="monitorGrid">
            {snapshot?.monitors.map((monitor) => (
              <article className="panel monitor" key={monitor.id}>
                <span className="switch">
                  <input
                    aria-label={`Enable ${monitor.title}`}
                    checked={monitor.enabled}
                    disabled={busy}
                    id={`monitor-${monitor.id}`}
                    onChange={(event) =>
                      void perform({
                        type: "monitor.set",
                        id: monitor.id,
                        enabled: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  <i aria-hidden="true" />
                </span>
                <div>
                  <h2>
                    <label htmlFor={`monitor-${monitor.id}`}>{monitor.title}</label>
                  </h2>
                  <p>{monitor.detail}</p>
                  <small>{monitor.status}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="privacyNote">
            <strong>Quiet hours are policy-owned.</strong>
            <span>Every change returns an audited Gateway outcome.</span>
          </div>
        </TabPanel>
      </section>
    </main>
  );
}

function TabPanel({
  active,
  children,
  id,
}: {
  active: boolean;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      aria-labelledby={`tab-${id}`}
      className="tabPanel"
      hidden={!active}
      id={`panel-${id}`}
      role="tabpanel"
      tabIndex={0}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="sectionTitle">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function ApprovalCard({
  approval,
  busy,
  onDecision,
}: {
  approval: ApprovalItem;
  busy: boolean;
  onDecision: (decision: ApprovalDecision) => void;
}) {
  return (
    <article className={`approvalCard ${approval.state}`}>
      <div className="cardTop">
        <span>{approval.state === "pending" ? "Needs approval" : approval.state}</span>
        <strong>{approval.amount}</strong>
      </div>
      <h3>{approval.title}</h3>
      <p>{approval.detail}</p>
      <div className="evidence">{approval.evidence}</div>
      {approval.state === "pending" ? (
        <div className="actions">
          <button className="approve" disabled={busy} onClick={() => onDecision("approved")}>
            Approve
          </button>
          <button disabled={busy} onClick={() => onDecision("denied")}>
            Deny
          </button>
        </div>
      ) : (
        <p className="decision">Decision recorded: {approval.state}</p>
      )}
    </article>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sectionDescription(tab: Tab): string {
  return (
    {
      Today: "Live household status and decisions.",
      Household: "People, preferences and privacy walls.",
      Approvals: "One audited outcome for every irreversible step.",
      Phone: "The dedicated assistant phone, live and traceable.",
      Journey: "What Kaki did, in household time.",
      Skills: "Reviewed playbooks and learned improvements.",
      Locale: "Language, register and regional defaults.",
      Cost: "Gateway-reported spend, budgets and model mix.",
      Traces: "Replay redacted browser and phone steps.",
      Monitors: "Useful heads-ups, never noise.",
    } satisfies Record<Tab, string>
  )[tab];
}
