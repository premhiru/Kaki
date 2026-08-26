/** Dependency-free public contracts shared by Kaki packages. */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonSchema = Readonly<Record<string, JsonValue>>;
export type Timestamp = string;
export type LocaleCode = "sg" | "my" | "id" | "th" | "vn" | "ph" | "mm" | "kh";
export type LanguageCode = string;
export type CurrencyCode = string;

export type ChannelKind =
  | "whatsapp"
  | "telegram"
  | "webchat"
  | "line"
  | "zalo"
  | "viber"
  | "messenger"
  | "wechat"
  | "signal";

export interface MediaRef {
  readonly blobId: string;
  readonly mimeType: string;
  readonly sha256: string;
  readonly bytes?: number;
  readonly fileName?: string;
}

export interface DocumentRef extends MediaRef {
  readonly pageCount?: number;
}

export interface GeoLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMetres?: number;
  readonly label?: string;
  readonly address?: string;
}

export interface MessageReference {
  readonly id: string;
  readonly channel?: ChannelKind;
  readonly senderJid?: string;
}

export interface InboundMessage {
  readonly id: string;
  readonly channel: ChannelKind;
  readonly from: {
    readonly jid: string;
    readonly personId?: string;
  };
  readonly chat: {
    readonly id: string;
    readonly isGroup: boolean;
  };
  readonly text?: string;
  readonly audio?: MediaRef;
  readonly image?: MediaRef;
  readonly doc?: DocumentRef;
  readonly location?: GeoLocation;
  readonly replyTo?: MessageReference;
}

export interface OutboundButton {
  readonly id: string;
  readonly label: string;
  readonly style?: "primary" | "secondary" | "danger";
}

export type KakiReaction = "working" | "done" | "need_user" | "remove";

export type OutboundContent =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "markdown_lite"; readonly text: string }
  | { readonly kind: "image"; readonly media: MediaRef; readonly alt?: string }
  | { readonly kind: "document"; readonly media: DocumentRef; readonly title?: string }
  | {
      readonly kind: "buttons";
      readonly prompt: string;
      readonly buttons: readonly OutboundButton[];
      readonly fallback: "numbered_reply";
    }
  | {
      readonly kind: "reaction";
      readonly targetMessageId: string;
      readonly reaction: KakiReaction;
    };

export interface OutboundMessage {
  readonly idempotencyKey: string;
  readonly chatId: string;
  readonly replyTo?: MessageReference;
  readonly content: readonly OutboundContent[];
}

export interface DeliveryReceipt {
  readonly channel: ChannelKind;
  readonly providerMessageId: string;
  readonly acceptedAt: Timestamp;
  readonly deliveredAt?: Timestamp;
  readonly deduplicated: boolean;
}

export interface Channel {
  readonly kind: ChannelKind;
  readonly capabilities: ReadonlySet<OutboundContent["kind"]>;
  start(onMessage: (message: InboundMessage) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(message: OutboundMessage): Promise<DeliveryReceipt>;
}

export type RiskCategory =
  | "none"
  | "data.read"
  | "message.household"
  | "message.external"
  | "money.transfer"
  | "money.purchase"
  | "booking"
  | "gov.singpass"
  | "account.change"
  | "data.share";

export interface ApprovalRequirement<TArgs = unknown> {
  (args: TArgs): boolean | Promise<boolean>;
}

export interface SafeLogger {
  debug(message: string, fields?: Readonly<Record<string, JsonValue>>): void;
  info(message: string, fields?: Readonly<Record<string, JsonValue>>): void;
  warn(message: string, fields?: Readonly<Record<string, JsonValue>>): void;
  error(message: string, fields?: Readonly<Record<string, JsonValue>>): void;
}

export interface ToolRunContext {
  readonly taskId: string;
  readonly traceId: string;
  readonly householdId: string;
  readonly personId?: string;
  readonly locale: LocaleCode;
  readonly idempotencyKey: string;
  readonly approvalGrant?: ApprovalGrant;
  readonly signal: AbortSignal;
  readonly logger: SafeLogger;
  addEvidence(evidence: EvidenceRef): Promise<void>;
}

export interface DataProvenance {
  readonly source: string;
  readonly sourceUrl?: string;
  readonly observedAt: Timestamp;
  readonly validUntil?: Timestamp;
}

export interface ToolResult<TResult = JsonValue> {
  readonly data: TResult;
  readonly provenance?: readonly DataProvenance[];
  readonly evidence?: readonly EvidenceRef[];
  readonly reconciliationRef?: string;
}

export interface Tool<TArgs = JsonObject, TResult = JsonValue> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly riskCategory: RiskCategory;
  readonly requiresApproval?: boolean | ApprovalRequirement<TArgs>;
  run(ctx: ToolRunContext, args: TArgs): Promise<ToolResult<TResult>>;
}

export type SurfaceKind = "browser" | "phone" | "approval" | "api";

export interface SurfaceStep {
  readonly id: string;
  readonly surface: SurfaceKind;
  readonly action: string;
  readonly target?: string;
  readonly input?: JsonObject;
  readonly riskCategory: RiskCategory;
  readonly idempotencyKey: string;
  readonly timeoutMs: number;
  readonly stepBudget?: number;
  readonly dryRun: boolean;
}

export interface SurfaceContext {
  readonly protocolVersion: string;
  readonly taskId: string;
  readonly traceId: string;
  readonly householdId: string;
  readonly personId?: string;
  readonly capabilityToken: string;
  readonly approvalGrant?: ApprovalGrant;
  readonly signal: AbortSignal;
}

export interface ScreenRef extends MediaRef {
  readonly capturedAt: Timestamp;
  readonly redacted: boolean;
  readonly width?: number;
  readonly height?: number;
}

export interface EvidenceRef {
  readonly id: string;
  readonly kind: "screen" | "image" | "document" | "link" | "text" | "receipt";
  readonly label: string;
  readonly uri?: string;
  readonly sha256?: string;
  readonly redacted: boolean;
  readonly createdAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly audience: PrivacyAudience;
}

export type SurfaceResult =
  | {
      readonly status: "done";
      readonly output?: JsonValue;
      readonly verified: boolean;
      readonly evidence?: readonly EvidenceRef[];
    }
  | {
      readonly status: "need_approval";
      readonly category: RiskCategory;
      readonly materialFacts: JsonObject;
      readonly evidence: readonly EvidenceRef[];
    }
  | {
      readonly status: "blocked";
      readonly reasonCode: string;
      readonly handoff: string;
      readonly evidence?: readonly EvidenceRef[];
    }
  | {
      readonly status: "failed";
      readonly error: KakiError;
    };

export interface Surface {
  readonly kind: SurfaceKind;
  execute(step: SurfaceStep, ctx: SurfaceContext): Promise<SurfaceResult>;
  screenshot(ctx: SurfaceContext): Promise<ScreenRef>;
  trace(ctx: SurfaceContext): Promise<Trace>;
}

export type PolicyAction = "auto" | "ask" | "deny";

export interface PolicyDecision {
  readonly action: PolicyAction;
  readonly reasonCode: string;
  readonly reason: string;
  readonly ruleId: string;
  readonly factsHash: string;
  readonly evaluatedAt: Timestamp;
}

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "cancelled";

export interface Money {
  readonly currency: CurrencyCode;
  readonly minorUnits: number;
}

export interface ApprovalChoice {
  readonly id: string;
  readonly label: string;
  readonly action: "approve" | "deny" | "edit";
}

export interface ApprovalCard {
  readonly id: string;
  readonly taskId: string;
  readonly traceId: string;
  readonly stepId: string;
  readonly householdId: string;
  readonly requestedByPersonId: string;
  readonly category: RiskCategory;
  readonly title: string;
  readonly summary: string;
  readonly materialFacts: JsonObject;
  readonly factsHash: string;
  readonly amount?: Money;
  readonly evidence: readonly EvidenceRef[];
  readonly choices: readonly ApprovalChoice[];
  readonly policy: PolicyDecision;
  readonly status: ApprovalStatus;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly decidedAt?: Timestamp;
  readonly decidedByPersonId?: string;
  readonly repingedAt?: Timestamp;
}

export interface ApprovalGrant {
  readonly id: string;
  readonly approvalCardId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly householdId: string;
  readonly approvedByPersonId: string;
  readonly factsHash: string;
  readonly issuedAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly singleUse: true;
}

export type ExecutionStepOutcome =
  | "success"
  | "need_approval"
  | "blocked"
  | "failure"
  | "cancelled";

export interface ExecutionTraceStep {
  readonly id: string;
  readonly startedAt: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly surface?: SurfaceKind;
  readonly toolName?: string;
  readonly action: string;
  readonly target?: string;
  readonly observation?: string;
  readonly outcome: ExecutionStepOutcome;
  readonly retryCount: number;
  readonly screenIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
}

export interface ModelUsage {
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCost?: Money;
}

export interface TraceCost {
  readonly modelUsage: readonly ModelUsage[];
  readonly providerFees: readonly Money[];
  readonly transactionEstimate?: Money;
}

export interface Trace {
  readonly id: string;
  readonly taskId: string;
  readonly householdId: string;
  readonly personId?: string;
  readonly startedAt: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly steps: readonly ExecutionTraceStep[];
  readonly screens: readonly ScreenRef[];
  readonly cost: TraceCost;
  readonly redacted: true;
}

export interface SkillFrontMatter {
  readonly id: string;
  readonly title: string;
  /** Internal canonical form of the on-disk `when_to_use` field. */
  readonly when: string;
  readonly inputs: JsonSchema;
  readonly surfaces: readonly SurfaceKind[];
  readonly approvals: readonly string[];
  readonly locales: readonly LocaleCode[];
  readonly languages: readonly LanguageCode[];
  readonly version: string;
  readonly learnedFrom?: readonly string[];
}

export interface Skill {
  readonly frontMatter: SkillFrontMatter;
  readonly body: string;
  readonly source: "packaged" | "learned" | "household";
  readonly path: string;
  readonly checksum: string;
}

export type PrivacyAudience =
  | { readonly kind: "owner"; readonly personId: string }
  | { readonly kind: "people"; readonly personIds: readonly string[] }
  | { readonly kind: "household" };

export type Sensitivity = "public" | "household" | "private" | "medical" | "financial";

export interface PrivacyScope {
  readonly ownerPersonId?: string;
  readonly audience: PrivacyAudience;
  readonly sensitivity: Sensitivity;
  readonly purposes?: readonly string[];
}

export interface MemoryEntity {
  readonly id: string;
  readonly householdId: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
  readonly privacy: PrivacyScope;
  readonly tags?: readonly string[];
}

export interface QuietHours {
  readonly start: string;
  readonly end: string;
  readonly timezone: string;
}

export interface Household extends MemoryEntity {
  readonly kind: "household";
  readonly displayName: string;
  readonly locale: LocaleCode;
  readonly timezone: string;
  readonly memberPersonIds: readonly string[];
  readonly importantPlaceIds: readonly string[];
  readonly approvalPolicyId: string;
  readonly quietHours: QuietHours;
  readonly encryptionKeyRef: string;
}

export interface PersonChannelIdentity {
  readonly channel: ChannelKind;
  readonly jid: string;
  readonly displayName?: string;
}

export interface Person extends MemoryEntity {
  readonly kind: "person";
  readonly displayName: string;
  readonly relation?: string;
  readonly channelIdentities: readonly PersonChannelIdentity[];
  readonly languages: readonly LanguageCode[];
  readonly register?: string;
  readonly birthday?: string;
  readonly dietary?: readonly string[];
  readonly preferenceIds?: readonly string[];
  readonly commutePlaceIds?: readonly string[];
  readonly schoolPlaceIds?: readonly string[];
  readonly clinicPlaceIds?: readonly string[];
}

export interface Place extends MemoryEntity {
  readonly kind: "place";
  readonly label: string;
  readonly countryCode: LocaleCode;
  readonly formattedAddress: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly postalCode?: string;
  readonly planningArea?: string;
  readonly source?: string;
}

export interface VendorChannelIdentity {
  readonly channel: ChannelKind | "phone" | "email";
  readonly address: string;
}

export interface Vendor extends MemoryEntity {
  readonly kind: "vendor";
  readonly displayName: string;
  readonly trade: string;
  readonly channelIdentities: readonly VendorChannelIdentity[];
  readonly rating?: number;
  readonly ratingSource?: string;
  readonly lastQuoteSummary?: string;
  readonly lastContactAt?: Timestamp;
  readonly threadApproved: boolean;
}

export interface Account extends MemoryEntity {
  readonly kind: "account";
  readonly provider: string;
  readonly displayLabel: string;
  readonly ownerPersonId?: string;
  readonly capabilities: readonly ("read" | "prepare" | "submit")[];
  readonly secretHandle?: string;
}

export interface LocalePackDescriptor {
  readonly locale: LocaleCode;
  readonly version: string;
  readonly status: "complete" | "partial" | "stub";
  readonly languages: readonly LanguageCode[];
  readonly components: Readonly<
    Record<
      "persona" | "lexicon" | "calendar" | "formats" | "dietary" | "channels" | "eval",
      boolean
    >
  >;
}

export interface LocaleLexiconEntry {
  readonly term: string;
  readonly normalised: string;
  readonly language?: LanguageCode;
  readonly register?: string;
  readonly notes?: string;
}

export interface LocaleCalendarEntry {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly endDate?: string;
  readonly kind: "public" | "school" | "religious" | "event" | "deadline";
  readonly source: string;
  readonly updatedAt: Timestamp;
}

export interface LocaleEvalCase {
  readonly id: string;
  readonly input: string;
  readonly intent: string;
  readonly expectedLanguage: LanguageCode;
  readonly expectedRegister: string;
}

export interface LocalePack {
  readonly descriptor: LocalePackDescriptor;
  readonly persona: string;
  readonly lexicon: readonly LocaleLexiconEntry[];
  readonly calendar: readonly LocaleCalendarEntry[];
  readonly formats: JsonObject;
  readonly dietary: JsonObject;
  readonly channels: JsonObject;
  readonly evalCases: readonly LocaleEvalCase[];
}

export interface LocaleLoadOptions {
  readonly householdId?: string;
  readonly includeEval?: boolean;
  readonly overrides?: JsonObject;
}

export interface LocaleValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export interface LocaleValidationResult {
  readonly valid: boolean;
  readonly issues: readonly LocaleValidationIssue[];
}

export interface LocalePackLoader {
  list(): Promise<readonly LocalePackDescriptor[]>;
  load(locale: LocaleCode, options?: LocaleLoadOptions): Promise<LocalePack>;
  validate(pack: LocalePack): Promise<LocaleValidationResult>;
}

export interface ProtocolEnvelope<TPayload = JsonValue> {
  readonly protocolVersion: string;
  readonly id: string;
  readonly type: string;
  readonly occurredAt: Timestamp;
  readonly traceId: string;
  readonly taskId: string;
  readonly householdId: string;
  readonly personId?: string;
  readonly payload: TPayload;
}

export type KakiErrorKind =
  | "validation"
  | "unauthorised"
  | "policy"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "external_changed"
  | "needs_human"
  | "internal";

export interface KakiError {
  readonly code: string;
  readonly kind: KakiErrorKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly details?: JsonObject;
}
