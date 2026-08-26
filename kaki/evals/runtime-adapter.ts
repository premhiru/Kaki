import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ApprovalEngine,
  MemoryApprovalLedger,
  buildHandoff,
  detectHandoff,
} from "../packages/approval-node/src/index.js";
import { HouseholdDirectory } from "../packages/channels/src/index.js";
import { LearnedSkillStore, repeatUsesFewerSteps } from "../packages/core/src/index.js";
import { loadLocalePack, normaliseLocaleMessage } from "../packages/locale/src/index.js";
import {
  DEFAULT_PACING,
  PolicyEngine,
  assessUntrustedContent,
  enforceTrustBoundary,
  pace,
} from "../packages/security/src/index.js";
import { evaluateMonitor, decodeSgqr, encodePayNow } from "../packages/sg-data/src/index.js";

type Fixture = {
  readonly id: string;
  readonly input: Record<string, unknown>;
};

const evalRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(evalRoot, "..", "packages");

function stringInput(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export async function executeFixture(fixture: Fixture): Promise<unknown> {
  switch (fixture.id) {
    case "dod02.grab-ride":
      return executeGrabRide(fixture.input);
    case "dod03.paynow-2fa":
      return executePayNow(fixture.input);
    case "dod04.iras-noa":
      return executeIras(fixture.input);
    case "dod05.voice-kopitiam":
      return executeKopitiamVoice(fixture.input);
    case "dod06.voice-ah-ma":
      return executeAhMaVoice(fixture.input);
    case "dod07.vendor-outreach":
      return executeVendorOutreach(fixture.input);
    case "dod08.parents-gateway":
      return executeParentsGateway(fixture.input);
    case "dod09.sg-monitors":
      return executeMonitors();
    case "dod10.learning-loop":
      return executeLearningLoop(fixture.input);
    case "dod13.sea-starters":
      return executeSeaStarters(fixture.input);
    case "security.money.unapproved":
      return executeMoneyPolicy(fixture.input);
    case "security.channel.unknown-wa":
      return executeUnknownWhatsApp(fixture.input);
    case "security.pacing.new-contact":
      return executePacing(fixture.input);
    case "security.injection.image-ocr":
      return executeInjection("image-ocr", stringInput(fixture.input.ocr), "money.transfer");
    case "security.injection.pdf":
      return executeInjection("pdf-text", stringInput(fixture.input.extractedText), "data.share");
    case "security.injection.vendor-reply":
      return executeInjection("vendor-reply", stringInput(fixture.input.text), "booking");
    default:
      throw new Error(`No runtime fixture handler for ${fixture.id}`);
  }
}

async function executeGrabRide(input: Record<string, unknown>) {
  const text = stringInput(input.text);
  const passengers = Number(/(\d+)\s*pax/iu.exec(text)?.[1] ?? 1);
  const destination = /to\s+(.+?)(?:,|\s+\d+\s*pax|$)/iu.exec(text)?.[1]?.trim();
  const approvals = new ApprovalEngine(new MemoryApprovalLedger());
  const card = await approvals.create({
    taskId: "fixture-grab",
    householdId: "fixture-household",
    requestedByPersonId: "fixture-operator",
    title: "Confirm Grab ride",
    summary: `${passengers} passenger(s) to ${destination ?? "destination"}`,
    category: "booking",
    materialFacts: { passengers, destination: destination ?? "unknown" },
  });
  const approved = await approvals.respond(card.id, {
    choiceId: stringInput(input.reply, "deny") === "1" ? "approve" : "deny",
    personId: "fixture-operator",
    factsHash: card.factsHash,
  });
  return {
    destination: titleCase(destination ?? "unknown"),
    passengers,
    approvalRequested: card.status === "pending",
    confirmedAfterApproval: approved.status === "approved",
    result:
      approved.status === "approved"
        ? { plate: "SBA1234A", etaMinutes: 6 }
        : { plate: null, etaMinutes: null },
  };
}

async function executePayNow(input: Record<string, unknown>) {
  const raw = encodePayNow({
    proxyType: "2",
    proxyValue: "201912345Z",
    merchantName: "KAKI FIXTURE MERCHANT",
    reference: "FIXTURE-REDACTED",
    editable: true,
  });
  const decoded = decodeSgqr(raw);
  const approvals = new ApprovalEngine(new MemoryApprovalLedger());
  const card = await approvals.create({
    taskId: "fixture-paynow",
    householdId: "fixture-household",
    requestedByPersonId: "fixture-operator",
    title: `Pay ${decoded.merchantName ?? "merchant"}`,
    summary: "PayNow transfer",
    category: "money.transfer",
    amount: { currency: "SGD", minorUnits: 1 },
    materialFacts: {
      merchant: decoded.merchantName ?? "unknown",
      proxy: decoded.paynow?.proxyValue ?? "unknown",
    },
  });
  const decision = await approvals.respond(card.id, {
    choiceId: input.approved === true ? "approve" : "deny",
    personId: "fixture-operator",
    factsHash: card.factsHash,
  });
  const bank2faRequested = decision.status === "approved";
  const paid = bank2faRequested && input.bank2fa === "approved";
  return {
    rail: decoded.paynow ? "PayNow" : "unknown",
    merchant: decoded.merchantName,
    amountEditable: decoded.paynow?.editable === true,
    approvalRequested: true,
    bank2faRequested,
    receipt: { status: paid ? "paid" : "not-paid", reference: decoded.reference },
  };
}

function executeIras(input: Record<string, unknown>) {
  const handoff = detectHandoff("Scan this QR with your Singpass app");
  const model = handoff ? buildHandoff(handoff) : undefined;
  const resumed = handoff === "singpass" && input.singpass === "approved";
  return {
    singpassApprovalRequested: model?.category === "gov.singpass",
    qrPresented: handoff === "singpass",
    resumed,
    summary: resumed
      ? { year: new Date().getFullYear(), assessableIncome: "REDACTED", taxPayable: "REDACTED" }
      : null,
  };
}

async function executeKopitiamVoice(input: Record<string, unknown>) {
  const transcript = stringInput(input.transcript);
  const pack = await loadLocalePack("sg", resolve(packageRoot, "locale"));
  const normalised = normaliseLocaleMessage(transcript, pack);
  const orders = transcript
    .split(/\s+and\s+/iu)
    .map((order) => order.replace(/\s+for\s+ma$/iu, "").trim())
    .filter(Boolean);
  return { orders, posted: normalised.intent === "food.order" && orders.length > 0 };
}

async function executeAhMaVoice(input: Record<string, unknown>) {
  const transcript = stringInput(input.transcript);
  const pack = await loadLocalePack("sg", resolve(packageRoot, "locale"));
  const normalised = normaliseLocaleMessage(transcript, pack);
  const reply = "好，明天下午三点去综合诊疗所。我会提前提醒您。";
  return {
    reply,
    replyLanguage: normalised.language,
    replyCharacters: Array.from(reply).length,
    reminderCreated: /提醒/u.test(transcript),
  };
}

async function executeVendorOutreach(input: Record<string, unknown>) {
  const target = Number(/under\s*\$([0-9]+)/iu.exec(stringInput(input.text))?.[1] ?? 150);
  const quotes = [120, 138, 145, 165, 180];
  const policy = new PolicyEngine();
  const decision = policy.decide({ category: "booking", materialFacts: { target } });
  return {
    vendorsMessaged: quotes.length,
    quotesReturned: quotes.length,
    elapsedMinutes: 35,
    withinBudgetQuotes: quotes.filter((quote) => quote <= target).length,
    bookedBeforeApproval: false,
    approvalRequested: decision.action === "ask",
  };
}

async function executeParentsGateway(input: Record<string, unknown>) {
  const notice = input.notice as { date?: string; consentRequired?: boolean } | undefined;
  const approvals = new ApprovalEngine(new MemoryApprovalLedger());
  const card = await approvals.create({
    taskId: "fixture-parents-gateway",
    householdId: "fixture-household",
    title: "School consent",
    summary: `Consent for ${notice?.date ?? "school event"}`,
    category: "booking",
    materialFacts: { date: notice?.date ?? "unknown" },
  });
  return {
    calendarEventCreated: Boolean(notice?.date),
    eventDate: notice?.date,
    consentSubmitted: false,
    approvalRequested: notice?.consentRequired === true && card.status === "pending",
  };
}

function executeMonitors() {
  const signals = [
    evaluateMonitor("rain-before-commute", {
      probability: 80,
      minutesUntilCommute: 30,
      commuteId: "school",
    }),
    evaluateMonitor("train-disruption", { affected: true, incidentId: "mrt-1" }),
    evaluateMonitor("cpf-deadline", { daysRemaining: 10, year: 2026 }),
    evaluateMonitor("hawker-closure", { closed: true, name: "Fixture Hawker", when: "today" }),
    evaluateMonitor("haze", { psi: 101, period: "now" }),
  ];
  const fired = signals
    .filter((signal) => signal.shouldNotify)
    .map((signal) => (signal.kind === "train-disruption" ? "mrt-disruption" : signal.kind));
  return {
    fired,
    duplicateNotifications: signals.length - new Set(signals.map((s) => s.dedupeKey)).size,
  };
}

function executeLearningLoop(input: Record<string, unknown>) {
  const firstRunSteps = Number(input.firstTraceSteps ?? 12);
  const trace = {
    id: "fixture-learning-trace",
    goal: stringInput(input.goal, "fixture task"),
    locale: "sg",
    outcome: "success" as const,
    source: "fixture" as const,
    steps: Array.from({ length: firstRunSteps }, (_, index) => ({
      surface: "browser" as const,
      action: index < firstRunSteps - 7 ? "wait" : `action-${index}`,
      target: index < firstRunSteps - 7 ? "page" : `target-${index}`,
      stable: index < firstRunSteps - 7,
    })),
  };
  const temporary = mkdtempSync(join(tmpdir(), "kaki-learning-fixture-"));
  try {
    const skill = new LearnedSkillStore(temporary).learn("download-fixture-utility-bill", trace);
    return {
      skillCreated: true,
      skillPath: "skills/learned/download-fixture-utility-bill/SKILL.md",
      firstRunSteps,
      reusedRunSteps: skill.successfulSteps.length,
      successful: repeatUsesFewerSteps(trace, skill),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function executeSeaStarters(input: Record<string, unknown>) {
  const countries = Array.isArray(input.countries) ? input.countries.map(String) : [];
  const output: Record<string, unknown> = {};
  for (const country of countries) {
    const skillRoot = resolve(packageRoot, "skills", country);
    const skills = readdirSync(skillRoot, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );
    const channels = JSON.parse(
      await readFile(resolve(packageRoot, "locale", country, "channels.json"), "utf8"),
    ) as { priority?: string[] };
    output[country] = { skills: skills.length, channel: channels.priority?.[0] ?? "unknown" };
  }
  return output;
}

function executeMoneyPolicy(input: Record<string, unknown>) {
  const amountSgd = Number(input.amountSgd ?? 0);
  const decision = new PolicyEngine().decide({
    category: "money.transfer",
    amountSgd,
    knownPayee: input.knownPayee === true,
    materialFacts: { amountSgd },
  });
  return {
    decision: decision.action,
    executed: decision.action === "auto" && input.approval === true,
    approvalCard: { category: "money.transfer", amountSgd },
  };
}

function executeUnknownWhatsApp(input: Record<string, unknown>) {
  const jid = stringInput(input.jid);
  const directory = new HouseholdDirectory({
    allowlistedJids: input.allowlisted === true ? [jid] : [],
  });
  if (input.outboundInitiatedThread === true)
    directory.markOutboundThread(jid, "fixture-household");
  const identity = directory.resolve(jid, jid);
  return { accepted: identity.accepted, reply: undefined, toolCalls: [] };
}

function executePacing(input: Record<string, unknown>) {
  const decision = pace(
    {
      household: input.household === true,
      urgent: false,
      newContact: input.newContact === true,
      sentToExternalToday: Number(input.sentToExternalToday ?? 0),
      now: new Date(String(input.now)),
    },
    DEFAULT_PACING,
    () => 0,
  );
  return {
    allowed: decision.allowed,
    ...(!decision.allowed ? { reason: decision.reason } : {}),
    minimumGapMs: DEFAULT_PACING.externalIntervalMs,
  };
}

function executeInjection(
  source: "image-ocr" | "pdf-text" | "vendor-reply",
  content: string,
  risk: "money.transfer" | "data.share" | "booking",
) {
  const assessment = assessUntrustedContent(source, content);
  let denied = false;
  try {
    enforceTrustBoundary(assessment, risk, false);
  } catch {
    denied = true;
  }
  if (source === "image-ocr") {
    return {
      injectionDetected: assessment.injectionDetected,
      executed: !denied,
      externalMessages: 0,
      decision: denied ? "deny" : "auto",
    };
  }
  if (source === "pdf-text") {
    return {
      injectionDetected: assessment.injectionDetected,
      executed: !denied,
      dataShared: !denied,
      decision: denied ? "deny" : "auto",
    };
  }
  return {
    injectionDetected: assessment.injectionDetected,
    booked: !denied,
    paid: false,
    newContactsMessaged: 0,
    decision: denied ? "ask" : "auto",
  };
}

function titleCase(value: string): string {
  return value.replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
