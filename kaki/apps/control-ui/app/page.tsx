"use client";

import { useState } from "react";

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

const approvals = [
  {
    id: "grab",
    title: "Grab to Raffles Place",
    detail: "Tomorrow, 8:00 am · 2 pax",
    amount: "$18.20",
    evidence: "Standard ride · no surge · pickup at Blk 432 lobby",
  },
  {
    id: "aircon",
    title: "Aircon servicing",
    detail: "CoolCare · Saturday, 10:00 am",
    amount: "$138.00",
    evidence: "4.8 stars · 90-day warranty · 3 fan coils",
  },
];

const people = [
  {
    initials: "WL",
    name: "Wei Ling",
    relation: "You",
    language: "Singlish · English",
    detail: "School run · North-South Line",
  },
  {
    initials: "AM",
    name: "Ah Ma",
    relation: "Mother",
    language: "中文 · Hokkien",
    detail: "Short sentences · medical private",
  },
  {
    initials: "F",
    name: "Farid",
    relation: "Family",
    language: "Bahasa Melayu",
    detail: "JB commute · halal",
  },
  {
    initials: "P",
    name: "Priya",
    relation: "Family",
    language: "தமிழ் · English",
    detail: "Yishun · parents’ support",
  },
];

const journey = [
  {
    time: "09:42",
    title: "Parents Gateway notice handled",
    detail: "Sports Day added to family calendar · consent waiting",
  },
  { time: "09:18", title: "Rain monitor fired", detail: "School-run alert sent once to Wei Ling" },
  {
    time: "Yesterday",
    title: "Aircon vendors contacted",
    detail: "6 messaged · 4 replies · no booking made",
  },
];

const skillOptions = ["vendor-outreach", "weather-commute", "polyclinic-booking", "grab-ride"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Today");
  const [paused, setPaused] = useState(false);
  const [weatherVisible, setWeatherVisible] = useState(true);
  const [approvalState, setApprovalState] = useState<
    Record<string, "pending" | "approved" | "denied">
  >({ grab: "pending", aircon: "pending" });
  const [phoneAction, setPhoneAction] = useState("Connected · Pixel 7a · 84% battery");
  const [selectedSkill, setSelectedSkill] = useState(skillOptions[0]);
  const [skillText, setSkillText] = useState(
    "Stop before contacting a new vendor or confirming a booking.\nReturn price, availability, warranty, and evidence.",
  );
  const [skillSaved, setSkillSaved] = useState(false);
  const [locale, setLocale] = useState("Singapore · en-SG");
  const [traceStep, setTraceStep] = useState(2);
  const [journeyStatus, setJourneyStatus] = useState("Journey is editable by household admins.");
  const [monitors, setMonitors] = useState({
    rain: true,
    train: true,
    haze: true,
    cpf: false,
    hawker: true,
  });
  const pendingCount = approvals.filter(
    (approval) => approvalState[approval.id] === "pending",
  ).length;

  function chooseTab(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab.toLowerCase()}`);
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
            <small>Wei Ling&apos;s household</small>
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
        <div className="system">
          <i aria-hidden="true" />
          All systems steady<small>Last checked 20s ago</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">MONDAY, 24 AUGUST</p>
            <h1>{activeTab === "Today" ? "Good morning, Wei Ling." : activeTab}</h1>
            <p className="lede">
              {activeTab === "Today"
                ? "Two things need you. The rest I’ve got."
                : sectionDescription(activeTab)}
            </p>
          </div>
          <button
            aria-pressed={paused}
            className={paused ? "pause paused" : "pause"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Resume Kaki" : "Pause Kaki"}
          </button>
        </header>

        <TabPanel active={activeTab === "Today"} id="today">
          {weatherVisible && (
            <div className="weather" role="status">
              <div className="weatherIcon" aria-hidden="true">
                ☂
              </div>
              <div>
                <strong>Rain near school run</strong>
                <p>Likely 7:35–8:20 am around Ang Mo Kio. Leave 10 minutes earlier.</p>
              </div>
              <button onClick={() => setWeatherVisible(false)}>Got it</button>
            </div>
          )}
          <SectionHeading
            eyebrow="NEEDS YOUR TAP"
            title="Approvals"
            meta={`${pendingCount} pending`}
          />
          <div className="approvalGrid">
            {approvals.map((approval) => (
              <ApprovalCard
                approval={approval}
                key={approval.id}
                state={approvalState[approval.id] ?? "pending"}
                onDecision={(state) =>
                  setApprovalState((current) => ({ ...current, [approval.id]: state }))
                }
              />
            ))}
          </div>
          <div className="lowerGrid">
            <section className="panel">
              <SectionHeading eyebrow="QUIETLY WORKING" title="In progress" />
              <Task
                state="working"
                title="Aircon quotes"
                detail="4 of 6 vendors replied · comparing warranty"
                meta="12 min"
              />
              <Task
                state="done"
                title="Parents Gateway"
                detail="Sports Day added to family calendar"
                meta="Done"
              />
            </section>
            <section className="panel householdSummary">
              <SectionHeading eyebrow="HOUSEHOLD" title="Everyone’s day" />
              <div className="people" aria-label="Household members">
                {people.map((person) => (
                  <span key={person.initials}>{person.initials}</span>
                ))}
              </div>
              <p>Ah Ma&apos;s polyclinic reminder goes out at 2:00 pm in Mandarin.</p>
              <button className="textButton" onClick={() => chooseTab("Household")}>
                View household →
              </button>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Household"} id="household">
          <div className="summaryStrip">
            <Summary value="4" label="people" />
            <Summary value="3" label="shared places" />
            <Summary value="2" label="private scopes" />
          </div>
          <div className="memberGrid">
            {people.map((person) => (
              <article className="panel member" key={person.name}>
                <span className="avatar">{person.initials}</span>
                <div>
                  <p className="eyebrow">{person.relation}</p>
                  <h2>{person.name}</h2>
                  <p>{person.language}</p>
                  <small>{person.detail}</small>
                </div>
                <button aria-label={`Edit ${person.name}`}>Edit</button>
              </article>
            ))}
          </div>
          <div className="privacyNote">
            <strong>Privacy walls are on.</strong>
            <span>
              Medical and money memories stay with their owner unless they choose to share.
            </span>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Approvals"} id="approvals">
          <div className="approvalToolbar">
            <div>
              <strong>{pendingCount} waiting</strong>
              <span>Approvals expire in 2 hours and re-ping once.</span>
            </div>
            <label>
              Show{" "}
              <select defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="all">All decisions</option>
              </select>
            </label>
          </div>
          <div className="approvalGrid">
            {approvals.map((approval) => (
              <ApprovalCard
                approval={approval}
                key={approval.id}
                state={approvalState[approval.id] ?? "pending"}
                onDecision={(state) =>
                  setApprovalState((current) => ({ ...current, [approval.id]: state }))
                }
              />
            ))}
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Phone"} id="phone">
          <div className="phoneLayout">
            <section className="phoneFrame" aria-label="Live phone preview">
              <div className="phoneTop">
                <span>10:28</span>
                <span>84% · Wi-Fi</span>
              </div>
              <div className="phoneScreen">
                <span className="appIcon">G</span>
                <h2>Grab</h2>
                <p>Fare review</p>
                <strong>Raffles Place · $18.20</strong>
                <div className="phoneCheckpoint">Waiting for household approval</div>
              </div>
            </section>
            <section className="panel manual">
              <p className="eyebrow">DEDICATED ASSISTANT PHONE</p>
              <h2>Live and manual control</h2>
              <p className="statusLine" aria-live="polite">
                {phoneAction}
              </p>
              <div className="manualGrid">
                <button onClick={() => setPhoneAction("Fresh screenshot captured")}>
                  Screenshot
                </button>
                <button onClick={() => setPhoneAction("Sent Back safely")}>Back</button>
                <button onClick={() => setPhoneAction("Returned to Home")}>Home</button>
                <button onClick={() => setPhoneAction("Tapped the highlighted target")}>
                  Tap target
                </button>
                <button onClick={() => setPhoneAction("Accessibility tree refreshed")}>
                  Refresh tree
                </button>
                <button onClick={() => setPhoneAction("Phone relaunch requested")}>
                  Relaunch app
                </button>
              </div>
              <div className="deviceFacts">
                <span>
                  <b>ADB</b> connected
                </span>
                <span>
                  <b>Companion</b> enabled
                </span>
                <span>
                  <b>Last trace</b> 18 sec ago
                </span>
              </div>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Journey"} id="journey">
          <div className="journeyList">
            {journey.map((item, index) => (
              <article className="journeyItem" key={item.title}>
                <div className="journeyDot" aria-hidden="true">
                  {index + 1}
                </div>
                <time>{item.time}</time>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.detail}</p>
                </div>
                <div className="rowActions">
                  <button onClick={() => setJourneyStatus(`${item.title} ready to edit`)}>
                    Edit
                  </button>
                  <button
                    onClick={() => setJourneyStatus(`${item.title} deletion requires confirmation`)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="statusLine" aria-live="polite">
            {journeyStatus}
          </p>
        </TabPanel>

        <TabPanel active={activeTab === "Skills"} id="skills">
          <div className="editorLayout">
            <aside className="skillList" aria-label="Installed skills">
              {skillOptions.map((skill) => (
                <button
                  aria-pressed={selectedSkill === skill}
                  className={selectedSkill === skill ? "selected" : ""}
                  key={skill}
                  onClick={() => {
                    setSelectedSkill(skill);
                    setSkillSaved(false);
                  }}
                >
                  {skill}
                  <small>{skill === "grab-ride" ? "phone" : "maintained"}</small>
                </button>
              ))}
            </aside>
            <section className="panel editor">
              <div className="editorHead">
                <div>
                  <p className="eyebrow">SKILL.MD</p>
                  <h2>{selectedSkill}</h2>
                </div>
                <span>v1 · reviewed</span>
              </div>
              <label htmlFor="skill-instructions">Safe execution notes</label>
              <textarea
                id="skill-instructions"
                onChange={(event) => {
                  setSkillText(event.target.value);
                  setSkillSaved(false);
                }}
                rows={10}
                value={skillText}
              />
              <div className="editorFooter">
                <span aria-live="polite">
                  {skillSaved ? "Saved locally · fixture review required" : "Unsaved local changes"}
                </span>
                <button className="primary" onClick={() => setSkillSaved(true)}>
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
              <h2>{locale}</h2>
              <label htmlFor="locale-select">Regional pack</label>
              <select
                id="locale-select"
                onChange={(event) => setLocale(event.target.value)}
                value={locale}
              >
                <option>Singapore · en-SG</option>
                <option>Malaysia · ms-MY</option>
                <option>Indonesia · id-ID</option>
                <option>Thailand · th-TH</option>
                <option>Vietnam · vi-VN</option>
                <option>Philippines · fil-PH</option>
              </select>
              <div className="localeFacts">
                <span>
                  Currency <b>SGD</b>
                </span>
                <span>
                  Timezone <b>Asia/Singapore</b>
                </span>
                <span>
                  Channels <b>WhatsApp · Telegram</b>
                </span>
              </div>
            </section>
            <section className="panel">
              <p className="eyebrow">REGISTER PREVIEW</p>
              <h2>Warm, quick, local</h2>
              <blockquote>
                “Can. I checked the rain and train status—leave 10 minutes earlier, should be
                steady.”
              </blockquote>
              <p className="muted">
                Mirrors each member’s language without caricature. Formal for schools, government
                and banks.
              </p>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Cost"} id="cost">
          <div className="summaryStrip">
            <Summary value="$8.42" label="this month" />
            <Summary value="$0.31" label="today" />
            <Summary value="72%" label="local model share" />
          </div>
          <section className="panel costPanel">
            <div className="costRow">
              <span>Planning and tools</span>
              <b>$4.92</b>
              <i style={{ width: "58%" }} />
            </div>
            <div className="costRow">
              <span>Vision and browser fallback</span>
              <b>$2.10</b>
              <i style={{ width: "25%" }} />
            </div>
            <div className="costRow">
              <span>Voice transcription</span>
              <b>$1.40</b>
              <i style={{ width: "17%" }} />
            </div>
            <div className="budget">
              <span>Monthly alert at $20</span>
              <strong>$11.58 remaining</strong>
            </div>
          </section>
        </TabPanel>

        <TabPanel active={activeTab === "Traces"} id="traces">
          <div className="traceLayout">
            <section className="traceScreen" aria-label={`Trace replay step ${traceStep} of 4`}>
              <div className="browserBar">
                <i />
                <i />
                <i />
                <span>iras.gov.sg/mytax</span>
              </div>
              <div className="traceContent">
                <p className="eyebrow">STEP {traceStep} OF 4</p>
                <h2>
                  {
                    ["Portal opened", "NOA located", "Singpass handoff", "Summary ready"][
                      traceStep - 1
                    ]
                  }
                </h2>
                <div className="selectorBox">
                  {traceStep === 3
                    ? "Paused safely · QR evidence attached"
                    : "Selector matched · confidence 0.97"}
                </div>
              </div>
            </section>
            <section className="panel replay">
              <p className="eyebrow">TRACE REPLAY</p>
              <h2>IRAS NOA check</h2>
              <p>Today, 8:54 am · browser · 4 steps</p>
              <label htmlFor="trace-step">Replay position</label>
              <input
                id="trace-step"
                max="4"
                min="1"
                onChange={(event) => setTraceStep(Number(event.target.value))}
                type="range"
                value={traceStep}
              />
              <div className="replayButtons">
                <button
                  disabled={traceStep === 1}
                  onClick={() => setTraceStep((step) => Math.max(1, step - 1))}
                >
                  Previous
                </button>
                <button
                  disabled={traceStep === 4}
                  onClick={() => setTraceStep((step) => Math.min(4, step + 1))}
                >
                  Next step
                </button>
              </div>
              <div className="traceMeta">
                <span>No secrets recorded</span>
                <span>Selector chain: reviewed</span>
              </div>
            </section>
          </div>
        </TabPanel>

        <TabPanel active={activeTab === "Monitors"} id="monitors">
          <div className="monitorGrid">
            {(
              [
                ["rain", "Rain before commute", "School run · 7:15–8:30 am", "Checked 2 min ago"],
                ["train", "MRT disruption", "North-South and Circle lines", "Checked 1 min ago"],
                ["haze", "Haze ≥ 100", "Home and school", "PSI 42 · normal"],
                ["cpf", "CPF year-end", "One reminder in December", "Paused"],
                ["hawker", "Favourite hawker closures", "AMK · Toa Payoh", "Checked 3 h ago"],
              ] as const
            ).map(([key, title, detail, status]) => (
              <article className="panel monitor" key={key}>
                <span className="switch">
                  <input
                    aria-label={`Enable ${title}`}
                    checked={monitors[key]}
                    id={`monitor-${key}`}
                    onChange={(event) =>
                      setMonitors((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <i aria-hidden="true" />
                </span>
                <div>
                  <h2>
                    <label htmlFor={`monitor-${key}`}>{title}</label>
                  </h2>
                  <p>{detail}</p>
                  <small>{status}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="privacyNote">
            <strong>Quiet hours 23:00–07:00.</strong>
            <span>Only urgent safety and transport disruption alerts break through.</span>
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
  state,
  onDecision,
}: {
  approval: (typeof approvals)[number];
  state: "pending" | "approved" | "denied";
  onDecision: (state: "approved" | "denied") => void;
}) {
  return (
    <article className={`approvalCard ${state}`}>
      <div className="cardTop">
        <span>{state === "pending" ? "Needs approval" : state}</span>
        <strong>{approval.amount}</strong>
      </div>
      <h3>{approval.title}</h3>
      <p>{approval.detail}</p>
      <div className="evidence">{approval.evidence}</div>
      {state === "pending" ? (
        <div className="actions">
          <button className="approve" onClick={() => onDecision("approved")}>
            Approve
          </button>
          <button onClick={() => onDecision("denied")}>Deny</button>
          <button>Review</button>
        </div>
      ) : (
        <p className="decision" aria-live="polite">
          Decision recorded: {state}
        </p>
      )}
    </article>
  );
}

function Task({
  state,
  title,
  detail,
  meta,
}: {
  state: "working" | "done";
  title: string;
  detail: string;
  meta: string;
}) {
  return (
    <div className="task">
      <i className={state === "done" ? "done" : "spin"}>{state === "done" ? "✓" : ""}</i>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span>{meta}</span>
    </div>
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

function sectionDescription(tab: Tab): string {
  const descriptions: Record<Tab, string> = {
    Today: "Two things need you. The rest I’ve got.",
    Household: "People, preferences and privacy walls.",
    Approvals: "One tap for every irreversible step.",
    Phone: "The dedicated assistant phone, live and traceable.",
    Journey: "What Kaki did, in household time.",
    Skills: "Reviewed playbooks and learned improvements.",
    Locale: "Language, register and regional defaults.",
    Cost: "Clear spend, budgets and model mix.",
    Traces: "Replay every browser and phone step.",
    Monitors: "Useful heads-ups, never noise.",
  };
  return descriptions[tab];
}
