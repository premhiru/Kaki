#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const kakiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(kakiRoot, "..");
const sourcePath = path.join(kakiRoot, "docs/requirements/master-prompt-v2.txt");
const ledgerPath = path.join(kakiRoot, "docs/REQUIREMENTS.md");
const expectedLogicalHash = "f66fbb955778868622ed335efe36a13c6b09c336e258d0fe0bd9b408132d1121";
const expectedLineCount = 308;

const normativeHeadings = new Set([13, 25, 69, 95, 119, 196, 214, 274, 290]);
const forcedAtoms = new Map([
  [
    11,
    [
      "installable product",
      "documented product",
      "tested product",
      "always-on self-hosting",
      "WhatsApp and Telegram household presence",
      "household languages",
      "household memory",
      "browser surface",
      "phone surface",
      "human-tap approval surface",
      "Singapore completeness",
      "Malaysia scaffold",
      "Indonesia scaffold",
      "Thailand scaffold",
      "Vietnam scaffold",
      "Philippines scaffold",
    ],
  ],
  [
    19,
    [
      "integrate agent results",
      "lint",
      "unit tests",
      "end-to-end tests",
      "evaluations",
      "security tests",
    ],
  ],
  [
    23,
    [
      "acceptance test before completion",
      "live WhatsApp link (no stub)",
      "phone node (no stub)",
      "browser skills (no stub)",
      "approval flow (no stub)",
      "fixture when CI cannot reach live target",
      "real path remains wired",
      "live verification documented",
    ],
  ],
  [
    26,
    [
      "agent brief",
      "owned directory",
      "shared interface contract",
      "agent handoff: what built",
      "agent handoff: how to test",
      "agent handoff: open issues",
    ],
  ],
  [
    30,
    [
      "architecture document",
      "interfaces document",
      "decision records",
      "integration",
      "replanning",
    ],
  ],
  [31, ["OpenClaw fork", "core package", "Hermes patterns", "Kaki rename"]],
  [
    32,
    [
      "WhatsApp",
      "Telegram",
      "WebChat",
      "LINE",
      "Zalo",
      "Viber",
      "Messenger",
      "WeChat",
      "voice notes",
    ],
  ],
  [33, ["Android control daemon", "accessibility companion", "vision-action loop", "phone skills"]],
  [34, ["managed Chrome and Playwright", "selector and vision fallback", "portal skills"]],
  [35, ["approval cards", "policy engine", "Singpass handoff", "2FA handoff", "PayNow handoff"]],
  [36, ["LTA", "data.gov.sg", "OneMap", "NEA", "SGQR", "SG address parser", "monitors"]],
  [
    37,
    [
      "Malaysia public data",
      "Indonesia public data",
      "Thailand public data",
      "Vietnam public data",
      "Philippines public data",
      "DuitNow",
      "QRIS",
      "PromptPay",
      "VietQR",
      "QR Ph",
      "regional tools",
    ],
  ],
  [38, ["Singapore playbooks", "SEA playbooks", "learned playbooks", "skill scripts"]],
  [
    39,
    [
      "locale packs",
      "lexicons",
      "calendars",
      "registers",
      "dietary rules",
      "formats",
      "locale evaluations",
    ],
  ],
  [
    40,
    [
      "model router",
      "normaliser",
      "SEA-LION adapter",
      "Typhoon adapter",
      "Sahabat adapter",
      "MERaLiON ASR",
      "TTS",
      "SEA-Guard",
    ],
  ],
  [41, ["household graph", "profiles", "FTS recall", "vector recall", "journey", "privacy"]],
  [42, ["skill creation loop", "skill refinement loop", "trace mining"]],
  [43, ["secrets", "sandboxing", "pacing", "session guards", "audit", "red-team tests"]],
  [44, ["Household UI", "Approvals UI", "Phone UI", "Journey UI", "Skills editor UI", "Locale UI"]],
  [
    45,
    ["unit QA", "end-to-end QA", "evaluation QA", "chaos QA", "load QA", "fixture recorder", "CI"],
  ],
  [46, ["README", "wizard copy", "runbooks", "skill catalogue", "contributing guide"]],
  [
    49,
    [
      "monorepo",
      "TypeScript",
      "Node 22+",
      "strict TypeScript",
      "Python 3.11",
      "uv",
      "pnpm workspaces",
    ],
  ],
  [
    50,
    [
      "ESLint",
      "Prettier",
      "ruff",
      "80% new TypeScript coverage",
      "end-to-end fixture for every skill",
      "GitHub Actions lint",
      "GitHub Actions unit",
      "GitHub Actions fixture E2E",
      "GitHub Actions evaluations",
      "pnpm audit",
      "pip-audit",
    ],
  ],
  [
    59,
    [
      "WhatsApp group first in SG/MY/ID/PH",
      "Zalo in Vietnam",
      "LINE in Thailand",
      "Telegram control plane",
    ],
  ],
  [
    61,
    [
      "browser execution surface",
      "phone execution surface",
      "Singpass human tap",
      "2FA human tap",
      "wallet confirmation human tap",
    ],
  ],
  [
    63,
    [
      "hawker knowledge",
      "HDB knowledge",
      "CPF knowledge",
      "COE knowledge",
      "Ramadan timings",
      "CNY closures",
      "haze",
      "ERP",
      "JB commute",
      "no generic assistant behavior",
    ],
  ],
  [64, ["rain school-run nudge", "MRT disruption nudge", "CPF deadline nudge", "anti-spam"]],
  [
    66,
    [
      "ban recovery",
      "relink recovery",
      "captcha handoff",
      "layout-change handoff",
      "Telegram alert",
      "no silent failure",
    ],
  ],
  [
    67,
    [
      "self-hosted privacy",
      "no secrets in memory",
      "no secrets in logs",
      "NRIC masking",
      "capped phone wallet",
    ],
  ],
  [
    70,
    [
      "Wei Ling persona",
      "school notices",
      "Grab for clinic visit",
      "CPF and IRAS",
      "aircon vendor",
      "dinner ordering",
      "haze alerts",
    ],
  ],
  [
    71,
    [
      "Ah Ma persona",
      "Mandarin voice",
      "Hokkien voice",
      "appointment reminders",
      "rain question",
      "grandkid reminders",
      "medication schedule",
    ],
  ],
  [
    72,
    [
      "Farid persona",
      "causeway traffic",
      "VEP",
      "Touch 'n Go",
      "halal lunch",
      "prayer times",
      "Hari Raya planning",
      "DuitNow to PayNow",
    ],
  ],
  [
    73,
    [
      "Priya persona",
      "Tamil parent replies",
      "Deepavali logistics",
      "NLB books",
      "Singapore Airlines Chennai flight",
    ],
  ],
  [
    74,
    ["Dewi Jakarta persona", "Ploy Bangkok persona", "Minh HCMC persona", "Jasmine Manila persona"],
  ],
  [
    83,
    [
      "Gateway WebSocket control plane",
      "multi-agent and session routing",
      "channel plugin SDK",
      "agentskills.io-compatible skills",
      "managed Chrome browser",
      "cron and heartbeat",
      "workspace prompt and memory files",
      "Control UI",
      "mobile node protocol",
      "MCP client",
      "plugin SDK",
    ],
  ],
  [
    84,
    [
      "WhatsApp Baileys linked device",
      "Telegram plugin",
      "WebChat plugin",
      "LINE plugin",
      "Zalo Bot API",
      "Zalo Personal",
      "WeChat plugin",
      "optional Signal plugin",
      "Viber plugin",
      "Messenger Graph API plugin",
    ],
  ],
  [
    85,
    [
      "telemetry removed",
      "ClawHub auto-install removed",
      "Matrix behind extra-channel flag",
      "IRC behind extra-channel flag",
      "Mattermost behind extra-channel flag",
      "Teams behind extra-channel flag",
    ],
  ],
  [86, ["Kaki CLI", "Kaki daemon", "Kaki config directory", "skill-format compatibility"]],
  [
    90,
    [
      "successful-trajectory skill creation",
      "failure skill refinement",
      "memory nudge",
      "FTS5 cross-session recall",
      "asynchronous delegate_task fan-out",
      "journey edit and delete",
      "crash-durable delivery ledger",
    ],
  ],
  [
    120,
    [
      "Channel inbound contract",
      "Channel outbound text",
      "Channel outbound markdown-lite",
      "Channel outbound image",
      "Channel outbound document",
      "Channel outbound button emulation",
      "Channel outbound reaction",
    ],
  ],
  [
    121,
    [
      "Tool name",
      "Tool JSON schema",
      "Tool run",
      "Tool risk category",
      "Tool approval requirement",
    ],
  ],
  [
    122,
    [
      "browser Surface",
      "phone Surface",
      "approval Surface",
      "API Surface",
      "Surface execute",
      "Surface screenshot",
      "Surface trace",
    ],
  ],
  [
    123,
    [
      "ApprovalCard",
      "PolicyDecision auto",
      "PolicyDecision ask",
      "PolicyDecision deny",
      "Trace",
      "Skill id",
      "Skill when",
      "Skill inputs",
      "Skill surfaces",
      "Skill approvals",
      "Skill locales",
      "Skill version",
    ],
  ],
  [124, ["Household entity", "Person entity", "Place entity", "Vendor entity", "Account entity"]],
  [
    133,
    [
      "dedicated WhatsApp number",
      "wizard QR linking",
      "private WhatsApp auth",
      "automatic reconnect",
      "Telegram session-death alert",
      "QR relink prompt",
    ],
  ],
  [
    134,
    [
      "WhatsApp text",
      "WhatsApp images",
      "WhatsApp PDFs",
      "WhatsApp voice notes",
      "WhatsApp locations",
      "WhatsApp contacts",
      "WhatsApp reactions",
    ],
  ],
  [
    135,
    [
      "group JID household mapping",
      "mention handling",
      "reply-quote threading",
      "per-person register",
    ],
  ],
  [
    137,
    [
      "typing indicator",
      "1.5–6 second jitter",
      "non-household rate cap",
      "new-contact daily cap",
      "night-mode silence",
    ],
  ],
  [
    138,
    [
      "logout detection",
      "ban detection",
      "429 detection",
      "outbound pause",
      "operator alert",
      "wa relink command",
    ],
  ],
  [
    141,
    [
      "/status",
      "/approve",
      "/deny",
      "/relink-wa",
      "/journey",
      "/household",
      "/phone screenshot",
      "/phone tap",
      "/skills",
      "/cron",
      "/locale",
      "/pause",
      "/resume",
      "/cost",
      "Telegram approval card buttons",
    ],
  ],
  [
    144,
    [
      "OGG/Opus input",
      "MERaLiON-2 self-hosted ASR",
      "Whisper large-v3-turbo fallback",
      "code-switch preservation",
      "optional outbound TTS",
      "TTS off by default",
      "Singapore-accent TTS",
      "Mandarin TTS",
      "Malay TTS",
      "Tamil TTS",
    ],
  ],
  [
    147,
    [
      "LINE Messaging API",
      "Zalo Bot API",
      "Zalo Personal",
      "Viber Bot",
      "Messenger Graph API",
      "WeChat",
      "fixture E2E per regional channel",
    ],
  ],
  [
    150,
    [
      "Grab phone app",
      "Gojek phone app",
      "foodpanda phone app",
      "SimplyGo phone app",
      "Parents Gateway phone app",
      "HealthHub phone app",
      "bank phone apps",
      "Touch 'n Go phone app",
      "GCash phone app",
      "MoMo phone app",
      "physical assistant-owned Android",
      "assistant-owned accounts",
      "S$200 default wallet cap",
    ],
  ],
  [
    152,
    [
      "Gateway node connection",
      "ADB USB",
      "ADB Wi-Fi",
      "screenshot",
      "tap",
      "long_press",
      "swipe",
      "Unicode type",
      "key",
      "launch",
      "intent",
      "clipboard",
      "dump_ui",
      "wait_for text",
      "wait_for image",
      "wait_for idle",
      "notifications",
      "back_to_home",
    ],
  ],
  [
    153,
    [
      "Kotlin companion",
      "accessibility tree",
      "gesture injection",
      "notification listener",
      "local WebSocket",
    ],
  ],
  [
    154,
    [
      "screen-on",
      "battery optimization disabled",
      "nightly reboot cron",
      "ADB auto-reconnect",
      "deep-status phone health",
    ],
  ],
  [
    157,
    [
      "vision observation",
      "vision progress",
      "tap action",
      "long_press action",
      "swipe action",
      "type action",
      "key action",
      "launch action",
      "wait action",
      "scroll_to action",
      "done action",
      "need_approval action",
      "fail action",
      "vision target",
      "vision value",
      "vision confidence",
    ],
  ],
  [
    158,
    [
      "accessibility-first targeting",
      "coordinate fallback",
      "screenshot-diff stall detection",
      "BACK recovery",
      "relaunch recovery",
      "40-step budget",
      "trace persistence",
      "UI trace replay",
      "learning trace input",
    ],
  ],
  [
    161,
    [
      "grab-ride",
      "grab-food",
      "foodpanda",
      "simplygo",
      "parents-gateway",
      "healthhub-app",
      "bank-app-readonly",
      "touch-n-go",
      "gcash",
      "momo",
      "generic-app-task",
    ],
  ],
  [
    164,
    [
      "WhatsApp numbered approval",
      "Telegram inline approval",
      "UI approval inbox",
      "approval evidence",
      "2-hour expiry",
      "one re-ping",
      "approval audit",
    ],
  ],
  [
    165,
    [
      "message.household policy",
      "message.external policy",
      "money.transfer policy",
      "money.purchase policy",
      "booking policy",
      "gov.singpass policy",
      "account.change policy",
      "data.share policy",
      "auto decision",
      "ask decision",
      "deny decision",
      "household message auto default",
      "known-payee under S$30 auto default",
      "S$30 or more ask default",
      "new external contact ask-once default",
      "Singpass always ask default",
      "account change always ask default",
    ],
  ],
  [
    169,
    ["DuitNow handoff", "PromptPay handoff", "QRIS handoff", "VietQR handoff", "QR Ph handoff"],
  ],
  [
    173,
    [
      "BusArrival",
      "BusRoutes",
      "BusStops",
      "TrainServiceAlerts",
      "CarParkAvailability",
      "ERPRates",
      "TaxiAvailability",
      "TrafficIncidents",
      "EstTravelTimes",
      "TrafficImages",
    ],
  ],
  [
    174,
    [
      "2-hour forecast",
      "24-hour forecast",
      "rainfall",
      "PSI",
      "PM2.5",
      "UV",
      "dengue clusters",
      "HDB resale prices",
      "hawker closures",
      "school holidays",
      "public holidays",
      "COE results",
    ],
  ],
  [
    175,
    [
      "OneMap geocode",
      "OneMap reverse geocode",
      "OneMap walking route",
      "OneMap driving route",
      "OneMap public-transport route",
      "OneMap planning area",
      "SG address parser",
      "postal-code building lookup",
    ],
  ],
  [176, ["NEA warnings", "MOH clinic hours", "NLB catalogue", "ActiveSG facility slots"]],
  [
    177,
    [
      "SGQR image decode",
      "SGQR string decode",
      "EMVCo Tag 26 PayNow proxy",
      "EMVCo editable flag",
      "EMVCo Tag 54 amount",
      "EMVCo Tag 59 name",
      "EMVCo Tag 62 reference",
      "SGQR encode",
    ],
  ],
  [
    178,
    [
      "rain-before-commute monitor",
      "train disruption monitor",
      "haze monitor",
      "dengue-near-home monitor",
      "hawker-closure monitor",
      "ERP-change monitor",
      "BTO and resale monitor",
      "CPF and SRS monitor",
      "IRAS monitor",
      "road-tax/parking/insurance monitor",
      "COE monitor",
    ],
  ],
  [
    181,
    [
      "DuitNow decode",
      "DuitNow encode",
      "Touch 'n Go read",
      "causeway info",
      "VEP info",
      "MET Malaysia weather",
      "JAKIM prayer times",
      "MyDigital ID handoff",
      "Malaysia holidays",
    ],
  ],
  [
    182,
    [
      "QRIS decode",
      "QRIS encode",
      "Gojek phone",
      "Tokopedia phone",
      "BMKG weather",
      "KRL schedules",
      "TransJakarta schedules",
      "Indonesia prayer times",
      "IKD handoff",
    ],
  ],
  [
    183,
    [
      "PromptPay decode",
      "PromptPay encode",
      "LINE-native flows",
      "BTS info",
      "MRT info",
      "TMD weather",
      "ThaID handoff",
      "Buddhist holy days",
      "alcohol-ban days",
    ],
  ],
  [
    184,
    [
      "VietQR decode",
      "VietQR encode",
      "Zalo OA",
      "Zalo Bot",
      "MoMo read",
      "ZaloPay read",
      "VNeID handoff",
      "Tết calendar",
    ],
  ],
  [
    185,
    [
      "QR Ph decode",
      "QR Ph encode",
      "GCash read",
      "Maya read",
      "eGovPH SSO",
      "eGovPH eVerify",
      "PAGASA weather",
      "Messenger",
      "Viber",
    ],
  ],
  [
    186,
    [
      "Wise web",
      "Remitly web",
      "cross-border PayNow",
      "cross-border DuitNow",
      "cross-border PromptPay",
      "cross-border QRIS",
      "cross-border VietQR",
      "cross-border QR Ph",
      "halal finder",
      "prayer times",
      "ASEAN holiday matrix",
    ],
  ],
  [
    190,
    [
      "Playwright steps",
      "resilient selectors",
      "vision fallback",
      "captcha detection",
      "OTP detection",
      "handoff card",
      "dry-run",
      "trace",
      "backoff retry",
      "layout-change detector",
      "learned annotation",
    ],
  ],
  [
    197,
    [
      "Skill id metadata",
      "Skill title metadata",
      "Skill when_to_use metadata",
      "Skill inputs metadata",
      "Skill surfaces metadata",
      "Skill approvals metadata",
      "Skill locales metadata",
      "Skill languages metadata",
      "Skill version metadata",
      "Skill learned_from metadata",
      "skill steps",
      "skill checks",
      "skill failure modes",
      "localized handoff text",
    ],
  ],
  [
    200,
    [
      "iras-noa",
      "iras-file-assist",
      "cpf-overview",
      "cpf-topup",
      "srs-topup",
      "hdb-portal",
      "lta-vehicle",
      "ura-parking",
      "sp-group",
      "town-council-scc",
      "ica-passport-renewal",
      "mom-helper-levy-wp",
      "singpass-myinfo-self",
    ],
  ],
  [
    201,
    [
      "polyclinic-booking",
      "healthhub-web",
      "chas-clinic-finder",
      "medication-reminders",
      "elderly-care-sg",
    ],
  ],
  [
    202,
    [
      "parents-gateway",
      "school-calendar-sg",
      "enrichment-booking",
      "kids-sea",
      "helper-schedule",
      "household-ops",
    ],
  ],
  [
    203,
    [
      "kopi-order",
      "hawker-finder",
      "grab-ride",
      "grab-food",
      "foodpanda",
      "simplygo",
      "bus-mrt-now",
      "weather-commute",
      "haze-watch",
      "nlb",
      "activesg",
      "moving-house-sg",
    ],
  ],
  [
    204,
    [
      "shopee-web",
      "lazada-web",
      "amazon-sg",
      "carousell-buy-sell",
      "airline-sq",
      "scoot",
      "agoda",
      "klook",
      "trip-sea",
    ],
  ],
  [205, ["vendor-outreach", "contractor-followup", "tuition-agency"]],
  [206, ["family-events", "birthday-gift-sg", "wedding-sea"]],
  [
    209,
    [
      "currency-remittance",
      "cross-border-qr",
      "halal-finder",
      "prayer-times",
      "jb-commute",
      "visa-check-sea",
      "regional-holidays",
      "language-bridge",
    ],
  ],
  [
    212,
    [
      "duitnow-pay",
      "tng-topup",
      "jpj-roadtax",
      "lhdn-tax",
      "myeg",
      "qris-pay",
      "gojek-ride",
      "tokopedia",
      "pln-bill",
      "bpjs",
      "promptpay-pay",
      "line-man",
      "bts-mrt",
      "revenue-dept",
      "vietqr-pay",
      "zalo-ops",
      "momo-read",
      "evn-bill",
      "qrph-pay",
      "gcash-read",
      "egovph",
      "meralco-bill",
    ],
  ],
  [
    215,
    [
      "persona.md",
      "lexicon.json",
      "calendar.json",
      "formats.json",
      "dietary.json",
      "channels.json",
      "200 utterances per language",
      "intent labels",
      "register labels",
      "expected-language labels",
    ],
  ],
  [
    216,
    [
      "600-entry SG lexicon",
      "kopi and teh vocabulary",
      "hawker vocabulary",
      "housing vocabulary",
      "CPF vocabulary",
      "vehicle vocabulary",
      "national-service vocabulary",
      "school vocabulary",
      "healthcare vocabulary",
      "grocer vocabulary",
      "place vocabulary",
      "Singlish vocabulary",
      "Malay vocabulary",
      "Hokkien and Cantonese vocabulary",
      "Tamil and Hindi loans",
      "elder register",
      "peer register",
      "child register",
      "contractor register",
      "official register",
      "school register",
      "bank register",
      "employer register",
      "Singlish",
      "English",
      "Mandarin",
      "Malay",
      "Tamil",
    ],
  ],
  [
    217,
    [
      "Malaysia locale pack",
      "Indonesia locale pack",
      "Thailand locale pack",
      "Vietnam locale pack",
      "Philippines locale pack",
      "Myanmar locale stub",
      "Cambodia locale stub",
    ],
  ],
  [
    220,
    [
      "policy routing",
      "Anthropic adapter",
      "OpenAI adapter",
      "OpenRouter adapter",
      "Ollama adapter",
      "vLLM adapter",
      "SEA-LION API adapter",
      "Typhoon adapter",
      "Sahabat-AI adapter",
      "per-task budgets",
      "model cache",
    ],
  ],
  [
    222,
    [
      "SEA-LION v4.5 normaliser",
      "Qwen3-8B normaliser",
      "lexicon few-shot",
      "intent_text",
      "language",
      "code_switch",
      "register",
      "entities",
      "language ID",
    ],
  ],
  [
    223,
    [
      "SEA-LION v4.5 API",
      "SEA-LION self-host",
      "Typhoon Thai generation",
      "Sahabat-AI Indonesian generation",
      "MaLLaM Malaysian generation",
      "ILMU Malaysian generation",
    ],
  ],
  [224, ["MERaLiON-2 ASR", "Whisper ASR fallback", "configurable TTS"]],
  [225, ["SEA-Guard", "bge-m3 embeddings"]],
  [226, ["cheap heartbeat model", "cost dashboard", "/cost"]],
  [
    230,
    [
      "SQLite",
      "FTS5",
      "vectors",
      "Person entity",
      "Place entity",
      "Account existence",
      "Vendor entity",
      "Routine entity",
      "Preference entity",
      "Event entity",
      "JID speaker mapping",
      "MEMORY.md export",
      "/journey",
      "memory edit",
      "memory delete",
      "NRIC masking",
      "FIN masking",
      "passport masking",
      "per-household key",
      "no secrets",
    ],
  ],
  [
    232,
    [
      "mine successful trace",
      "write learned skill",
      "upgrade learned skill",
      "failure annotation",
      "nightly consolidation",
      "fewer-step reuse",
    ],
  ],
  [
    234,
    [
      "keychain secrets",
      "encrypted environment file",
      "workspace-only filesystem",
      "shell ask",
      "least-privilege skills",
      "policy engine",
      "pacing",
      "session guards",
      "tool-call audit",
      "no third-party auto-install",
      "dependency audit",
      "WhatsApp image injection defense",
      "PDF injection defense",
      "vendor-reply injection defense",
      "no injected money action",
      "no injected external action",
    ],
  ],
  [
    236,
    [
      "Household tab",
      "Approvals tab",
      "Phone live view",
      "Phone manual control",
      "Journey tab",
      "Skills editor",
      "Locale tab",
      "Cost tab",
      "Traces replay",
      "Monitors tab",
    ],
  ],
  [268, ["SOUL.my.md", "SOUL.id.md", "SOUL.th.md", "SOUL.vn.md", "SOUL.ph.md"]],
  [
    275,
    [
      "Ubuntu 24 install",
      "macOS install",
      "kaki onboard",
      "deep WhatsApp status",
      "deep Telegram status",
      "deep phone status",
      "deep Chrome status",
      "deep model status",
      "deep ASR status",
    ],
  ],
  [
    283,
    [
      "rain-before-commute fires",
      "MRT disruption fires",
      "CPF deadline fires",
      "hawker closure fires",
      "haze fires",
    ],
  ],
  [
    285,
    [
      "90% SG locale evaluation",
      "five SG languages",
      "80% Malaysia evaluation",
      "80% Indonesia evaluation",
      "80% Thailand evaluation",
      "80% Vietnam evaluation",
      "80% Philippines evaluation",
      "85% register accuracy",
    ],
  ],
  [
    286,
    [
      "unapproved money blocked",
      "unknown WhatsApp sender ignored",
      "pacing enforced",
      "prompt-injection red team",
      "no secrets in logs",
      "no secrets in memory",
    ],
  ],
  [
    287,
    [
      "Malaysia five starter skills",
      "Indonesia five starter skills",
      "Thailand five starter skills",
      "Vietnam five starter skills",
      "Philippines five starter skills",
      "LINE fixture channel",
      "Zalo fixture channel",
      "Viber fixture channel",
      "Messenger fixture channel",
    ],
  ],
  [
    288,
    [
      "README quickstart",
      "ARCHITECTURE",
      "INTERFACES",
      "DECISIONS",
      "PERSONAS",
      "VERIFY",
      "RUNBOOK ban recovery",
      "RUNBOOK relink",
      "RUNBOOK phone reset",
      "SKILLS catalogue",
      "locale guide",
      "CONTRIBUTING",
      "green CI",
      "v1.0-sg tag",
    ],
  ],
  [
    305,
    [
      "model keys onboarding",
      "WhatsApp QR onboarding",
      "Telegram token onboarding",
      "LTA and OneMap onboarding",
      "address onboarding",
      "household member onboarding",
      "approval cap onboarding",
      "phone pairing onboarding",
      "locale onboarding",
      "Compose Gateway",
      "Compose Ollama/vLLM",
      "Compose ASR",
      "Compose Chrome",
      "Compose SQLite volume",
      "systemd units",
      "Tailscale note",
      "backup",
      "restore",
    ],
  ],
]);

function isContext(line, lineNumber) {
  if (lineNumber === 3) return true;
  if (!line.trim()) return true;
  if (/^={10,}$/u.test(line)) return true;
  if (/^PART [A-Z]/u.test(line)) return true;
  if (/^```/u.test(line)) return true;
  if ([28, 29, 291, 292].includes(lineNumber)) return true;
  if (/^#{1,3} /u.test(line) && !normativeHeadings.has(lineNumber)) return true;
  return false;
}

function ruleFor(lineNumber) {
  const rules = [
    [
      1,
      9,
      "kaki/docs/REQUIREMENTS.md",
      "node kaki/scripts/qa/requirements-ledger.mjs --check",
      "verified",
      "",
    ],
    [
      10,
      24,
      "kaki/docs/PROGRESS.md; kaki/docs/VERIFY.md; kaki/evals/",
      "pnpm --dir kaki acceptance",
      "partial",
      "§20 still has operator-owned live gates.",
    ],
    [25, 47, "kaki/docs/agents/", "pnpm --dir kaki docs:check", "verified", ""],
    [
      48,
      53,
      ".github/workflows/kaki-ci.yml; kaki/package.json; kaki/docs/DECISIONS.md",
      "pnpm --dir kaki coverage && pnpm audit --audit-level high",
      "partial",
      "Exact-head hosted CI and the TypeScript coverage gate must pass.",
    ],
    [
      54,
      68,
      "kaki/docs/ARCHITECTURE.md; kaki/packages/security/; kaki/packages/memory/",
      "pnpm --dir kaki test:qa",
      "fixture",
      "Default live household behavior still needs account/device evidence.",
    ],
    [
      69,
      75,
      "kaki/docs/PERSONAS.md; kaki/evals/fixtures/",
      "pnpm --dir kaki test:e2e",
      "fixture",
      "Persona scenarios are deterministic; live channels remain gated.",
    ],
    [
      76,
      94,
      "kaki/UPSTREAM.md; kaki.mjs; kaki/packages/core/; kaki/packages/memory/",
      "node scripts/run-vitest.mjs run test/kaki-workspace-seed.test.ts",
      "partial",
      "Full Kaki default-owner and live-channel integration remains under review.",
    ],
    [95, 118, "kaki/", "node kaki/scripts/qa/requirements-ledger.mjs --check", "verified", ""],
    [
      119,
      126,
      "kaki/packages/core/src/contracts/index.ts; kaki/docs/INTERFACES.md",
      "pnpm --filter @kaki/core test",
      "verified",
      "",
    ],
    [
      127,
      148,
      "kaki/packages/channels/; kaki/packages/channels-extra/; extensions/kaki/",
      "pnpm --filter @kaki/channels test && pnpm --filter @kaki/channels-extra test",
      "fixture",
      "Linked provider accounts and real inbound/outbound delivery are unavailable.",
    ],
    [
      149,
      162,
      "kaki/packages/phone-node/; kaki/apps/companion-android/",
      "pnpm --filter @kaki/phone-node test",
      "blocked-live",
      "A physical assistant-owned Android and app accounts are required.",
    ],
    [
      163,
      170,
      "kaki/packages/approval-node/; kaki/packages/security/; kaki/packages/sea-data/",
      "pnpm --filter @kaki/approval-node test",
      "blocked-live",
      "Real Singpass, bank, and payment approvals require operator-controlled accounts.",
    ],
    [
      171,
      179,
      "kaki/packages/sg-data/",
      "pnpm --filter @kaki/sg-data test",
      "fixture",
      "Credentialed datasets and monitor delivery require live provider evidence.",
    ],
    [
      180,
      187,
      "kaki/packages/sea-data/",
      "pnpm --filter @kaki/sea-data test",
      "fixture",
      "Country credentials/accounts are not available for every live route.",
    ],
    [
      188,
      191,
      "kaki/packages/browser-node/",
      "pnpm --filter @kaki/browser-node test",
      "fixture",
      "Real authenticated portal and captcha/OTP handoffs need live proof.",
    ],
    [
      192,
      213,
      "kaki/packages/skills/",
      "pnpm --filter @kaki/skills test",
      "fixture",
      "Fixtures stop at declared effect/approval boundaries; live targets remain gated.",
    ],
    [
      214,
      218,
      "kaki/packages/locale/; kaki/evals/locales/",
      "pnpm --dir kaki evals",
      "verified",
      "",
    ],
    [
      219,
      227,
      "kaki/packages/models/",
      "pnpm --filter @kaki/models test",
      "fixture",
      "Configured provider/model/ASR/TTS live proof is unavailable.",
    ],
    [228, 230, "kaki/packages/memory/", "pnpm --filter @kaki/memory test", "verified", ""],
    [231, 232, "kaki/packages/core/src/learning/", "pnpm --filter @kaki/core test", "verified", ""],
    [233, 234, "kaki/packages/security/", "pnpm --filter @kaki/security test", "verified", ""],
    [
      235,
      236,
      "kaki/apps/control-ui/; extensions/kaki/",
      "pnpm --filter @kaki/control-ui test",
      "partial",
      "A real authenticated Gateway browser capture is still required.",
    ],
    [
      237,
      268,
      "kaki/SOUL.md; kaki/SOUL.my.md; kaki/SOUL.id.md; kaki/SOUL.th.md; kaki/SOUL.vn.md; kaki/SOUL.ph.md",
      "node kaki/scripts/qa/requirements-ledger.mjs --check",
      "verified",
      "",
    ],
    [
      269,
      289,
      "kaki/evals/acceptance-manifest.json; kaki/docs/VERIFY.md",
      "pnpm --dir kaki acceptance:release",
      "blocked-live",
      "Release acceptance requires exact-build live evidence for operator-owned surfaces.",
    ],
    [
      290,
      303,
      "kaki/docs/PROGRESS.md",
      "git tag --list 'v*-*'",
      "partial",
      "Required milestone tags are incomplete; v1.0-sg is forbidden until §20 is green.",
    ],
    [
      304,
      306,
      "kaki/scripts/; kaki/docs/ONBOARDING.md; kaki/docs/DEPLOYMENT.md",
      "node kaki/scripts/verify-deployment.mjs",
      "partial",
      "Clean Ubuntu/macOS install and live onboarding proof remain required.",
    ],
    [
      307,
      308,
      "kaki/docs/PROGRESS.md; kaki/docs/REQUIREMENTS.md",
      "node kaki/scripts/qa/requirements-ledger.mjs --check",
      "partial",
      "The loop remains open until every §20 release gate passes.",
    ],
  ];
  const match = rules.find(([start, end]) => lineNumber >= start && lineNumber <= end);
  if (!match) throw new Error(`No ownership rule for line ${lineNumber}`);
  return { owner: match[2], acceptance: match[3], state: match[4], blocker: match[5] };
}

function defaultAtoms(line) {
  const normalized = line
    .replace(/^\s*(?:[-*]|\d+\.)\s*/u, "")
    .replace(/^\|\s*[^|]+\|\s*/u, "")
    .replace(/\s*\|\s*$/u, "")
    .trim();
  return [normalized || "line contract"];
}

function escapeCell(value) {
  return String(value).replace(/\r?\n/gu, " ").replace(/\|/gu, "&#124;").replace(/`/gu, "&#96;");
}

function lineId(lineNumber) {
  return `L${String(lineNumber).padStart(3, "0")}`;
}

function worstState(states) {
  const order = ["missing", "blocked-live", "partial", "fixture", "verified"];
  return order.find((candidate) => states.includes(candidate)) ?? "verified";
}

function render(lines) {
  const lineRows = [];
  const atomicRows = [];
  const stateCounts = new Map([
    ["verified", 0],
    ["fixture", 0],
    ["partial", 0],
    ["blocked-live", 0],
    ["missing", 0],
  ]);
  let normativeLines = 0;
  let contextLines = 0;
  for (const [index, line] of lines.entries()) {
    const number = index + 1;
    const id = lineId(number);
    if (isContext(line, number)) {
      contextLines += 1;
      lineRows.push(`| ${id} | context | — | accounted | — |`);
      continue;
    }
    normativeLines += 1;
    const rule = ruleFor(number);
    const atoms = forcedAtoms.get(number) ?? defaultAtoms(line);
    const atomIds = atoms.map((_, atomIndex) => `${id}.${String(atomIndex + 1).padStart(2, "0")}`);
    lineRows.push(
      `| ${id} | normative | ${atomIds.join("<br>")} | ${worstState(atoms.map(() => rule.state))} | ${escapeCell(rule.blocker || "—")} |`,
    );
    for (const [atomIndex, atom] of atoms.entries()) {
      stateCounts.set(rule.state, (stateCounts.get(rule.state) ?? 0) + 1);
      atomicRows.push(
        `| ${atomIds[atomIndex]} | ${escapeCell(atom)} | ${escapeCell(rule.owner)} | ${escapeCell(rule.acceptance)} | ${rule.state} | ${escapeCell(rule.blocker || "—")} |`,
      );
    }
  }

  return `# Kaki master-prompt requirements ledger

This generated ledger accounts for every logical line in the immutable master
prompt and expands every normative bullet plus every explicitly named command,
skill, provider, surface, data capability, model, UI panel, and Definition of Done
contract into its own atomic row. Update the source annotations in
\`kaki/scripts/qa/requirements-ledger.mjs\`, then run the write command; do not hand-edit
the tables.

## Source and evidence policy

- Source: \`docs/requirements/master-prompt-v2.txt\`
- Logical source hash (LF-normalized, final newline ignored): \`${expectedLogicalHash}\`
- Source lines: ${lines.length}
- Normative lines: ${normativeLines}
- Context, blank, table-format, heading, separator, or fence lines: ${contextLines}
- Atomic requirements: ${atomicRows.length}
- Atomic evidence states: ${stateCounts.get("verified")} verified; ${stateCounts.get("fixture")} fixture; ${stateCounts.get("partial")} partial; ${stateCounts.get("blocked-live")} blocked-live; ${stateCounts.get("missing")} missing
- Regenerate: \`node kaki/scripts/qa/requirements-ledger.mjs --write\`
- Verify: \`node kaki/scripts/qa/requirements-ledger.mjs --check\`

States are deliberately strict. \`verified\` means source plus a focused local
contract passed; \`fixture\` means the production adapter is exercised against
deterministic inputs but the real provider/account is not; \`partial\` means some
contract or proof is missing; \`blocked-live\` means the remaining acceptance path
requires operator-owned external state. Fixture evidence never becomes live proof.

## All 308 source lines

| Line | Class | Atomic requirement IDs | State | Explicit blocker |
| --- | --- | --- | --- | --- |
${lineRows.join("\n")}

## Atomic requirements

| ID | Requirement | Code owner path(s) | Acceptance command or artifact | Evidence state | Explicit blocker |
| --- | --- | --- | --- | --- | --- |
${atomicRows.join("\n")}

## Release boundary

Do not create \`v1.0-sg\` or claim §20 green while any atomic requirement is
\`partial\`, \`missing\`, or \`blocked-live\`. The operator-owned evidence list and
the exact evidence schema live in [Verification](VERIFY.md).
`;
}

async function assertOwnersExist(lines) {
  const checked = new Set();
  for (let lineNumber = 1; lineNumber <= lines.length; lineNumber += 1) {
    if (isContext(lines[lineNumber - 1], lineNumber)) continue;
    for (const owner of ruleFor(lineNumber)
      .owner.split(";")
      .map((item) => item.trim())) {
      if (!owner || checked.has(owner)) continue;
      checked.add(owner);
      const isRepoRelative =
        /^(?:\.github|docs\/agents|extensions|kaki|test)(?:\/|$)|^kaki\.mjs$/u.test(owner);
      const candidate = path.join(isRepoRelative ? repoRoot : kakiRoot, owner);
      try {
        await fs.access(candidate);
      } catch {
        throw new Error(`Requirement owner path does not exist: ${owner}`);
      }
    }
  }
}

const source = await fs.readFile(sourcePath, "utf8");
const logicalSource = source.replace(/\r\n/gu, "\n").replace(/\n$/u, "");
const lines = logicalSource.split("\n");
const hash = createHash("sha256").update(logicalSource).digest("hex");
if (hash !== expectedLogicalHash) throw new Error(`Master prompt hash changed: ${hash}`);
if (lines.length !== expectedLineCount)
  throw new Error(`Expected 308 lines, found ${lines.length}`);
const expectedSoul = lines.slice(242, 266).join("\n");
const actualSoul = (await fs.readFile(path.join(kakiRoot, "SOUL.md"), "utf8"))
  .replace(/\r\n/gu, "\n")
  .replace(/\n$/u, "");
if (actualSoul !== expectedSoul) {
  throw new Error("SOUL.md is not the verbatim line 243–266 contract");
}
await assertOwnersExist(lines);
const rendered = render(lines);

if (process.argv.includes("--write")) {
  await fs.writeFile(ledgerPath, rendered, "utf8");
  process.stdout.write(
    `Wrote ${path.relative(kakiRoot, ledgerPath)} from ${lines.length} source lines.\n`,
  );
} else if (process.argv.includes("--check")) {
  const current = await fs.readFile(ledgerPath, "utf8");
  if (current !== rendered)
    throw new Error("docs/REQUIREMENTS.md is stale; run requirements-ledger.mjs --write");
  process.stdout.write(
    `Requirements ledger is complete: ${lines.length} lines, ${rendered.match(/^\| L\d{3}\.\d{2} \|/gmu)?.length ?? 0} atomic rows.\n`,
  );
} else {
  process.stdout.write(rendered);
}
