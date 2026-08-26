import type { SeaCountry } from "./profiles.js";

export type RegionalCapabilityBoundary =
  | "payment-qr"
  | "phone-read"
  | "public-data"
  | "identity-handoff"
  | "channel-flow"
  | "browser-flow";
export type RegionalAccessMode =
  | "public-json"
  | "public-html"
  | "free-token"
  | "official-app"
  | "account-session"
  | "partner-api"
  | "browser";

export interface RegionalCapabilityDefinition {
  readonly id: string;
  readonly country: SeaCountry | "regional";
  readonly label: string;
  readonly boundary: RegionalCapabilityBoundary;
  readonly authority: string;
  readonly access: RegionalAccessMode;
  readonly mutation: "none" | "approval-required";
  readonly url?: string;
  readonly externalGate?: string;
}

const capability = <const T extends RegionalCapabilityDefinition>(definition: T) => definition;

/**
 * Complete section 14 capability inventory. A source URL is a discovery/read boundary, never
 * evidence that an account-only operation can be automated without its documented gate.
 */
export const REGIONAL_CAPABILITIES = [
  capability({
    id: "my.duitnow",
    country: "my",
    label: "DuitNow QR",
    boundary: "payment-qr",
    authority: "PayNet",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://www.duitnow.my/",
    externalGate: "A payable QR must be encoded by an enrolled bank or acquirer.",
  }),
  capability({
    id: "my.tng",
    country: "my",
    label: "Touch 'n Go eWallet",
    boundary: "phone-read",
    authority: "TNG Digital",
    access: "official-app",
    mutation: "none",
    url: "https://www.touchngo.com.my/ewallet/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "my.causeway",
    country: "my",
    label: "Causeway conditions",
    boundary: "public-data",
    authority: "LTA OneMotoring",
    access: "public-html",
    mutation: "none",
    url: "https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras.html",
  }),
  capability({
    id: "my.vep",
    country: "my",
    label: "Vehicle Entry Permit",
    boundary: "browser-flow",
    authority: "JPJ Malaysia",
    access: "account-session",
    mutation: "approval-required",
    url: "https://vep.jpj.gov.my/",
    externalGate: "Vehicle owner account, OTP, and any official payment confirmation.",
  }),
  capability({
    id: "my.weather",
    country: "my",
    label: "MET Malaysia weather",
    boundary: "public-data",
    authority: "MET Malaysia via data.gov.my",
    access: "public-json",
    mutation: "none",
    url: "https://api.data.gov.my/weather/forecast/",
  }),
  capability({
    id: "my.prayer",
    country: "my",
    label: "JAKIM prayer times",
    boundary: "public-data",
    authority: "JAKIM e-Solat",
    access: "public-json",
    mutation: "none",
    url: "https://www.e-solat.gov.my/",
  }),
  capability({
    id: "my.identity",
    country: "my",
    label: "MyDigital ID",
    boundary: "identity-handoff",
    authority: "MyDigital ID",
    access: "official-app",
    mutation: "approval-required",
    url: "https://www.digital-id.my/",
    externalGate: "Official relying-party flow and explicit user consent in MyDigital ID.",
  }),
  capability({
    id: "my.holidays",
    country: "my",
    label: "Federal and state holidays",
    boundary: "public-data",
    authority: "Malaysia Cabinet Division",
    access: "public-html",
    mutation: "none",
    url: "https://www.kabinet.gov.my/",
  }),

  capability({
    id: "id.qris",
    country: "id",
    label: "QRIS",
    boundary: "payment-qr",
    authority: "Bank Indonesia",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://www.bi.go.id/QRIS/",
    externalGate: "A payable QR must be issued by a registered payment service provider.",
  }),
  capability({
    id: "id.gojek",
    country: "id",
    label: "Gojek",
    boundary: "phone-read",
    authority: "Gojek",
    access: "official-app",
    mutation: "none",
    url: "https://www.gojek.com/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "id.tokopedia",
    country: "id",
    label: "Tokopedia",
    boundary: "phone-read",
    authority: "Tokopedia",
    access: "official-app",
    mutation: "none",
    url: "https://www.tokopedia.com/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "id.weather",
    country: "id",
    label: "BMKG weather",
    boundary: "public-data",
    authority: "BMKG",
    access: "public-json",
    mutation: "none",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca",
  }),
  capability({
    id: "id.krl",
    country: "id",
    label: "KRL Commuter Line",
    boundary: "public-data",
    authority: "KAI Commuter",
    access: "public-html",
    mutation: "none",
    url: "https://www.commuterline.id/perjalanan-krl/jadwal-kereta",
  }),
  capability({
    id: "id.transjakarta",
    country: "id",
    label: "TransJakarta",
    boundary: "public-data",
    authority: "TransJakarta",
    access: "public-html",
    mutation: "none",
    url: "https://transjakarta.co.id/peta-rute/",
  }),
  capability({
    id: "id.prayer",
    country: "id",
    label: "Indonesian prayer times",
    boundary: "public-data",
    authority: "Ministry of Religious Affairs",
    access: "public-html",
    mutation: "none",
    url: "https://bimasislam.kemenag.go.id/jadwalshalat",
  }),
  capability({
    id: "id.identity",
    country: "id",
    label: "Identitas Kependudukan Digital",
    boundary: "identity-handoff",
    authority: "Dukcapil",
    access: "official-app",
    mutation: "approval-required",
    url: "https://dukcapil.kemendagri.go.id/",
    externalGate: "Official IKD app and relying-service consent flow.",
  }),

  capability({
    id: "th.promptpay",
    country: "th",
    label: "PromptPay",
    boundary: "payment-qr",
    authority: "Bank of Thailand / Thai Bankers' Association",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://www.bot.or.th/",
    externalGate: "A payable QR must be issued or accepted by a participating bank.",
  }),
  capability({
    id: "th.line",
    country: "th",
    label: "LINE",
    boundary: "channel-flow",
    authority: "LINE",
    access: "account-session",
    mutation: "approval-required",
    url: "https://developers.line.biz/",
    externalGate: "Configured LINE Messaging API channel and user-granted interaction.",
  }),
  capability({
    id: "th.bts",
    country: "th",
    label: "BTS Skytrain",
    boundary: "public-data",
    authority: "Bangkok Mass Transit System",
    access: "public-html",
    mutation: "none",
    url: "https://www.bts.co.th/eng/traintime-frequency/",
  }),
  capability({
    id: "th.mrt",
    country: "th",
    label: "Bangkok MRT",
    boundary: "public-data",
    authority: "Mass Rapid Transit Authority of Thailand",
    access: "public-html",
    mutation: "none",
    url: "https://www.mrta.co.th/",
  }),
  capability({
    id: "th.weather",
    country: "th",
    label: "TMD weather",
    boundary: "public-data",
    authority: "Thai Meteorological Department",
    access: "free-token",
    mutation: "none",
    url: "https://data.tmd.go.th/nwpapi/",
    externalGate: "Free TMD API token.",
  }),
  capability({
    id: "th.identity",
    country: "th",
    label: "ThaID",
    boundary: "identity-handoff",
    authority: "Department of Provincial Administration",
    access: "official-app",
    mutation: "approval-required",
    url: "https://www.bora.dopa.go.th/app-thaid/",
    externalGate: "Official ThaID app and relying-service consent flow.",
  }),
  capability({
    id: "th.holy-days",
    country: "th",
    label: "Buddhist holy days",
    boundary: "public-data",
    authority: "National Office of Buddhism",
    access: "public-html",
    mutation: "none",
    url: "https://www.onab.go.th/",
  }),
  capability({
    id: "th.alcohol-ban-days",
    country: "th",
    label: "Alcohol-ban days",
    boundary: "public-data",
    authority: "Department of Disease Control",
    access: "public-html",
    mutation: "none",
    url: "https://ddc.moph.go.th/",
  }),

  capability({
    id: "vn.vietqr",
    country: "vn",
    label: "VietQR",
    boundary: "payment-qr",
    authority: "NAPAS / VietQR",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://vietqr.net/",
    externalGate: "A payable QR must be issued by a participating bank or payment intermediary.",
  }),
  capability({
    id: "vn.zalo",
    country: "vn",
    label: "Zalo OA/Bot",
    boundary: "channel-flow",
    authority: "Zalo",
    access: "account-session",
    mutation: "approval-required",
    url: "https://developers.zalo.me/",
    externalGate: "Configured Zalo OA or user channel session.",
  }),
  capability({
    id: "vn.momo",
    country: "vn",
    label: "MoMo",
    boundary: "phone-read",
    authority: "MoMo",
    access: "official-app",
    mutation: "none",
    url: "https://www.momo.vn/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "vn.zalopay",
    country: "vn",
    label: "ZaloPay",
    boundary: "phone-read",
    authority: "ZaloPay",
    access: "official-app",
    mutation: "none",
    url: "https://zalopay.vn/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "vn.identity",
    country: "vn",
    label: "VNeID",
    boundary: "identity-handoff",
    authority: "Vietnam Ministry of Public Security",
    access: "official-app",
    mutation: "approval-required",
    url: "https://vneid.gov.vn/",
    externalGate: "Official VNeID app and relying-service consent flow.",
  }),
  capability({
    id: "vn.tet",
    country: "vn",
    label: "Tết calendar",
    boundary: "public-data",
    authority: "Vietnam Government Portal",
    access: "public-html",
    mutation: "none",
    url: "https://xaydungchinhsach.chinhphu.vn/",
    externalGate:
      "The annual public-holiday decision must be published before dates are treated as final.",
  }),

  capability({
    id: "ph.qrph",
    country: "ph",
    label: "QR Ph",
    boundary: "payment-qr",
    authority: "Bangko Sentral ng Pilipinas / PPMI",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://www.bsp.gov.ph/",
    externalGate: "A payable QR must be issued by a participating payment service provider.",
  }),
  capability({
    id: "ph.gcash",
    country: "ph",
    label: "GCash",
    boundary: "phone-read",
    authority: "GCash",
    access: "official-app",
    mutation: "none",
    url: "https://www.gcash.com/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "ph.maya",
    country: "ph",
    label: "Maya",
    boundary: "phone-read",
    authority: "Maya",
    access: "official-app",
    mutation: "none",
    url: "https://www.maya.ph/",
    externalGate: "Paired phone node and the user's signed-in app session.",
  }),
  capability({
    id: "ph.egovph-sso",
    country: "ph",
    label: "eGovPH SSO",
    boundary: "identity-handoff",
    authority: "Department of Information and Communications Technology",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://e.gov.ph/",
    externalGate: "Approved relying service, SSO credentials, and explicit user consent.",
  }),
  capability({
    id: "ph.egovph-everify",
    country: "ph",
    label: "eGovPH eVerify",
    boundary: "identity-handoff",
    authority: "Philippine Statistics Authority / DICT",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://everify.gov.ph/",
    externalGate: "Approved relying service and an explicit credential-verification request.",
  }),
  capability({
    id: "ph.weather",
    country: "ph",
    label: "PAGASA weather",
    boundary: "public-data",
    authority: "DOST-PAGASA",
    access: "public-html",
    mutation: "none",
    url: "https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-weekly",
  }),
  capability({
    id: "ph.messenger",
    country: "ph",
    label: "Messenger",
    boundary: "channel-flow",
    authority: "Meta",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://developers.facebook.com/docs/messenger-platform/",
    externalGate: "Approved Meta app, Page token, webhook, and recipient permission.",
  }),
  capability({
    id: "ph.viber",
    country: "ph",
    label: "Viber",
    boundary: "channel-flow",
    authority: "Rakuten Viber",
    access: "partner-api",
    mutation: "approval-required",
    url: "https://developers.viber.com/",
    externalGate: "Configured Viber bot and recipient opt-in.",
  }),

  capability({
    id: "regional.wise",
    country: "regional",
    label: "Wise remittance",
    boundary: "browser-flow",
    authority: "Wise",
    access: "account-session",
    mutation: "approval-required",
    url: "https://wise.com/",
    externalGate: "User account, live quote, recipient, compliance checks, and final approval.",
  }),
  capability({
    id: "regional.remitly",
    country: "regional",
    label: "Remitly remittance",
    boundary: "browser-flow",
    authority: "Remitly",
    access: "account-session",
    mutation: "approval-required",
    url: "https://www.remitly.com/",
    externalGate: "User account, live quote, recipient, compliance checks, and final approval.",
  }),
  capability({
    id: "regional.cross-border-qr",
    country: "regional",
    label: "Cross-border QR",
    boundary: "payment-qr",
    authority: "Participating national schemes and banks",
    access: "partner-api",
    mutation: "approval-required",
    externalGate: "Live bank capability, corridor, FX, fee, and recipient confirmation.",
  }),
  capability({
    id: "regional.halal",
    country: "regional",
    label: "Halal finder",
    boundary: "public-data",
    authority: "National halal certification authorities",
    access: "partner-api",
    mutation: "none",
    externalGate:
      "Authority-specific registry adapter with certificate owner, outlet, and validity.",
  }),
  capability({
    id: "regional.prayer",
    country: "regional",
    label: "Prayer times",
    boundary: "public-data",
    authority: "National religious authorities",
    access: "partner-api",
    mutation: "none",
    externalGate: "Authority-specific zone or calculation-source adapter.",
  }),
  capability({
    id: "regional.holidays",
    country: "regional",
    label: "ASEAN holiday matrix",
    boundary: "public-data",
    authority: "National government gazettes",
    access: "partner-api",
    mutation: "none",
    externalGate: "Country and state/province source adapters; tentative dates remain labelled.",
  }),
] as const satisfies readonly RegionalCapabilityDefinition[];

export type RegionalCapabilityId = (typeof REGIONAL_CAPABILITIES)[number]["id"];

const definitions = new Map<RegionalCapabilityId, RegionalCapabilityDefinition>(
  REGIONAL_CAPABILITIES.map((item) => [item.id, item]),
);

export function regionalCapability(id: RegionalCapabilityId): RegionalCapabilityDefinition {
  const definition = definitions.get(id);
  if (!definition) throw new Error(`regional-capability-not-found:${id}`);
  return definition;
}

export interface RegionalCapabilityRequest {
  readonly id: RegionalCapabilityId;
  readonly operation: "read" | "prepare" | "handoff";
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly signal?: AbortSignal;
}

export interface RegionalCapabilityResult {
  readonly id: RegionalCapabilityId;
  readonly mode: "live" | "handoff";
  readonly observedAt: string;
  readonly source: string;
  readonly facts: Readonly<Record<string, string | number | boolean>>;
}

export interface RegionalCapabilityProvider {
  readonly ids: readonly RegionalCapabilityId[];
  execute(request: RegionalCapabilityRequest): Promise<RegionalCapabilityResult>;
}

export class RegionalCapabilityRouter {
  private readonly providers = new Map<RegionalCapabilityId, RegionalCapabilityProvider>();

  register(provider: RegionalCapabilityProvider): void {
    for (const id of provider.ids) {
      if (this.providers.has(id)) throw new Error(`regional-provider-duplicate:${id}`);
      this.providers.set(id, provider);
    }
  }

  async execute(request: RegionalCapabilityRequest): Promise<RegionalCapabilityResult> {
    validateBoundedFacts(request.parameters);
    const provider = this.providers.get(request.id);
    if (!provider) {
      const gate = regionalCapability(request.id).externalGate ?? "Configure an approved provider.";
      throw new Error(`regional-provider-not-configured:${request.id}:${gate}`);
    }
    const result = await provider.execute(request);
    if (result.id !== request.id)
      throw new Error(`regional-provider-result-mismatch:${request.id}`);
    if (
      !Number.isFinite(Date.parse(result.observedAt)) ||
      !result.source.trim() ||
      result.source.length > 1_000
    ) {
      throw new Error(`regional-provider-result-invalid:${request.id}`);
    }
    validateBoundedFacts(result.facts);
    return result;
  }
}

export interface RegionalHumanHandoff {
  readonly capabilityId: RegionalCapabilityId;
  readonly target: "phone" | "identity-app" | "channel" | "browser";
  readonly mode: "read-only" | "approval-required";
  readonly fields: Readonly<Record<string, string | readonly string[]>>;
  readonly nextStep: string;
}

export function createRegionalHandoff(
  capabilityId: RegionalCapabilityId,
  fields: Readonly<Record<string, string | readonly string[]>>,
): RegionalHumanHandoff {
  const definition = regionalCapability(capabilityId);
  validateHandoffFields(fields);
  const target = regionalHandoffTarget(capabilityId, definition.boundary);
  const mode = definition.mutation === "none" ? "read-only" : "approval-required";
  return {
    capabilityId,
    target,
    mode,
    fields,
    nextStep:
      mode === "read-only"
        ? `Open ${definition.label} on the paired device and return only the requested, redacted fields.`
        : `Open the official ${definition.label} flow and ask the user to approve the displayed fields before continuing.`,
  };
}

function regionalHandoffTarget(
  capabilityId: RegionalCapabilityId,
  boundary: RegionalCapabilityBoundary,
): RegionalHumanHandoff["target"] {
  switch (boundary) {
    case "phone-read":
      return "phone";
    case "identity-handoff":
      return "identity-app";
    case "channel-flow":
      return "channel";
    case "browser-flow":
      return "browser";
    case "payment-qr":
    case "public-data":
      throw new Error(`regional-handoff-not-supported:${capabilityId}`);
  }
}

function validateBoundedFacts(facts: Readonly<Record<string, string | number | boolean>>): void {
  const entries = Object.entries(facts);
  if (entries.length > 32) throw new Error("regional-provider-facts-too-large");
  for (const [name, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/u.test(name)) {
      throw new Error("regional-provider-fact-name-invalid");
    }
    if (typeof value === "string" && value.length > 1_000) {
      throw new Error(`regional-provider-fact-too-large:${name}`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`regional-provider-fact-number-invalid:${name}`);
    }
  }
}

function validateHandoffFields(fields: Readonly<Record<string, string | readonly string[]>>): void {
  const entries = Object.entries(fields);
  if (entries.length > 32) throw new Error("regional-handoff-fields-too-large");
  for (const [name, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/u.test(name)) {
      throw new Error("regional-handoff-field-name-invalid");
    }
    if (typeof value === "string") {
      if (value.length > 1_000) throw new Error(`regional-handoff-field-too-large:${name}`);
      continue;
    }
    if (value.length > 50 || value.some((item) => item.length > 200)) {
      throw new Error(`regional-handoff-field-too-large:${name}`);
    }
  }
}
