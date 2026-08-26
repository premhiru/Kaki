import { HouseholdFieldCipher, type HouseholdKeyBroker } from "@kaki/memory";
import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import { parseKakiPluginConfig, type KakiPluginConfig } from "./config.js";

export const KAKI_BOOTSTRAP_NAMESPACE = "kaki-bootstrap";
export const KAKI_BOOTSTRAP_KEY = "active";

export type KakiAddressRef = Readonly<{
  id: string;
  label: "home" | "office" | "school";
  oneMapSearchValue: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
}>;

export type KakiHouseholdMemberProfile = Readonly<{
  id: string;
  name: string;
  relation: string;
  languages: readonly string[];
  register: string;
  dietary: readonly string[];
  commute: readonly string[];
}>;

export type KakiSecretRef = Readonly<{
  source: "env" | "file" | "exec" | "store";
  provider: string;
  id: string;
}>;

export type KakiOnboardingInput = Readonly<{
  config: KakiPluginConfig;
  householdName: string;
  operatorName: string;
  members: readonly KakiHouseholdMemberProfile[];
  addresses: readonly KakiAddressRef[];
  approvalAutoCap: number;
  approvalCurrency: string;
  monthlyModelBudgetUsd: number;
  monitorSessionKey: string;
  secretRefs: Readonly<{
    householdMemoryKey: KakiSecretRef;
    model: KakiSecretRef;
    ltaDataMall: KakiSecretRef;
    oneMap: KakiSecretRef;
    phonePairing: KakiSecretRef;
  }>;
}>;

export type KakiBootstrapRecord = Readonly<{
  version: 1;
  config: KakiPluginConfig;
  monthlyModelBudgetUsd: number;
  monitorSessionKey: string;
  secretRefs: KakiOnboardingInput["secretRefs"];
  privateCiphertext: string;
}>;

export type KakiPrivateProfile = Readonly<{
  householdName: string;
  operatorName: string;
  members: readonly KakiHouseholdMemberProfile[];
  addresses: readonly KakiAddressRef[];
  approvalAutoCap: number;
  approvalCurrency: string;
}>;

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).length === allowed.length &&
  Object.keys(value).every((key) => allowed.includes(key));

function text(value: unknown, code: string, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value || value.length > max) {
    throw new Error(code);
  }
  return value;
}

function finite(value: unknown, code: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(code);
  }
  return value;
}

function secretRef(value: unknown, code: string): KakiSecretRef {
  if (!isRecord(value) || !exactKeys(value, ["source", "provider", "id"])) throw new Error(code);
  const source = value.source;
  if (source !== "env" && source !== "file" && source !== "exec" && source !== "store") {
    throw new Error(code);
  }
  return {
    source,
    provider: text(value.provider, code, 128),
    id: text(value.id, code, 256),
  };
}

function stringList(value: unknown, code: string, maxItems: number): readonly string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(code);
  return value.map((entry) => text(entry, code, 128));
}

function member(value: unknown): KakiHouseholdMemberProfile {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["id", "name", "relation", "languages", "register", "dietary", "commute"])
  )
    throw new Error("kaki-onboard-member-invalid");
  const languages = stringList(value.languages, "kaki-onboard-member-invalid", 12);
  if (languages.length === 0) throw new Error("kaki-onboard-member-invalid");
  return {
    id: text(value.id, "kaki-onboard-member-invalid", 128),
    name: text(value.name, "kaki-onboard-member-invalid"),
    relation: text(value.relation, "kaki-onboard-member-invalid", 128),
    languages,
    register: text(value.register, "kaki-onboard-member-invalid", 128),
    dietary: stringList(value.dietary, "kaki-onboard-member-invalid", 32),
    commute: stringList(value.commute, "kaki-onboard-member-invalid", 32),
  };
}

function address(value: unknown): KakiAddressRef {
  if (!isRecord(value)) throw new Error("kaki-onboard-address-invalid");
  const allowed = ["id", "label", "oneMapSearchValue", "postalCode", "latitude", "longitude"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new Error("kaki-onboard-address-invalid");
  }
  const label = value.label;
  if (label !== "home" && label !== "office" && label !== "school") {
    throw new Error("kaki-onboard-address-invalid");
  }
  const postalCode = value.postalCode;
  return {
    id: text(value.id, "kaki-onboard-address-invalid", 128),
    label,
    oneMapSearchValue: text(value.oneMapSearchValue, "kaki-onboard-address-invalid", 512),
    ...(postalCode === undefined
      ? {}
      : { postalCode: text(postalCode, "kaki-onboard-address-invalid", 16) }),
    latitude: finite(value.latitude, "kaki-onboard-address-invalid", -90, 90),
    longitude: finite(value.longitude, "kaki-onboard-address-invalid", -180, 180),
  };
}

/** Rejects plaintext credentials and parses the complete automatable onboarding payload. */
export function parseKakiOnboardingInput(value: unknown): KakiOnboardingInput {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "config",
      "householdName",
      "operatorName",
      "members",
      "addresses",
      "approvalAutoCap",
      "approvalCurrency",
      "monthlyModelBudgetUsd",
      "monitorSessionKey",
      "secretRefs",
    ])
  )
    throw new Error("kaki-onboard-input-invalid");
  const config = parseKakiPluginConfig(value.config);
  if (!config) throw new Error("kaki-onboard-config-invalid");
  if (!Array.isArray(value.members) || value.members.length < 1 || value.members.length > 100) {
    throw new Error("kaki-onboard-members-invalid");
  }
  if (
    !Array.isArray(value.addresses) ||
    value.addresses.length < 1 ||
    value.addresses.length > 32
  ) {
    throw new Error("kaki-onboard-addresses-invalid");
  }
  if (
    !isRecord(value.secretRefs) ||
    !exactKeys(value.secretRefs, [
      "householdMemoryKey",
      "model",
      "ltaDataMall",
      "oneMap",
      "phonePairing",
    ])
  )
    throw new Error("kaki-onboard-secret-refs-invalid");
  const members = value.members.map(member);
  if (!members.some((entry) => entry.id === config.operatorPersonId)) {
    throw new Error("kaki-onboard-operator-not-member");
  }
  return {
    config,
    householdName: text(value.householdName, "kaki-onboard-household-name-invalid"),
    operatorName: text(value.operatorName, "kaki-onboard-operator-name-invalid"),
    members,
    addresses: value.addresses.map(address),
    approvalAutoCap: finite(
      value.approvalAutoCap,
      "kaki-onboard-approval-cap-invalid",
      0,
      1_000_000,
    ),
    approvalCurrency: text(value.approvalCurrency, "kaki-onboard-approval-currency-invalid", 8),
    monthlyModelBudgetUsd: finite(
      value.monthlyModelBudgetUsd,
      "kaki-onboard-model-budget-invalid",
      0.01,
      1_000_000,
    ),
    monitorSessionKey: text(value.monitorSessionKey, "kaki-onboard-session-key-invalid", 512),
    secretRefs: {
      householdMemoryKey: secretRef(
        value.secretRefs.householdMemoryKey,
        "kaki-onboard-memory-key-ref-invalid",
      ),
      model: secretRef(value.secretRefs.model, "kaki-onboard-model-ref-invalid"),
      ltaDataMall: secretRef(value.secretRefs.ltaDataMall, "kaki-onboard-lta-ref-invalid"),
      oneMap: secretRef(value.secretRefs.oneMap, "kaki-onboard-onemap-ref-invalid"),
      phonePairing: secretRef(value.secretRefs.phonePairing, "kaki-onboard-phone-ref-invalid"),
    },
  };
}

export function createKakiBootstrapRecord(
  input: KakiOnboardingInput,
  broker: HouseholdKeyBroker,
): Promise<KakiBootstrapRecord> {
  const privateProfile: KakiPrivateProfile = {
    householdName: input.householdName,
    operatorName: input.operatorName,
    members: input.members,
    addresses: input.addresses,
    approvalAutoCap: input.approvalAutoCap,
    approvalCurrency: input.approvalCurrency,
  };
  return new HouseholdFieldCipher(broker)
    .encrypt(
      input.config.householdProfileId,
      "onboarding:private-profile",
      JSON.stringify(privateProfile),
    )
    .then((privateCiphertext) => ({
      version: 1 as const,
      config: input.config,
      monthlyModelBudgetUsd: input.monthlyModelBudgetUsd,
      monitorSessionKey: input.monitorSessionKey,
      secretRefs: input.secretRefs,
      privateCiphertext,
    }));
}

export async function readKakiPrivateProfile(
  record: KakiBootstrapRecord,
  broker: HouseholdKeyBroker,
): Promise<KakiPrivateProfile> {
  const plaintext = await new HouseholdFieldCipher(broker).decrypt(
    record.config.householdProfileId,
    "onboarding:private-profile",
    record.privateCiphertext,
  );
  return parseKakiPrivateProfile(JSON.parse(plaintext) as unknown);
}

export function parseKakiPrivateProfile(value: unknown): KakiPrivateProfile {
  if (!isRecord(value) || !Array.isArray(value.members) || !Array.isArray(value.addresses)) {
    throw new Error("kaki-bootstrap-private-profile-invalid");
  }
  return {
    householdName: text(value.householdName, "kaki-bootstrap-private-profile-invalid"),
    operatorName: text(value.operatorName, "kaki-bootstrap-private-profile-invalid"),
    members: value.members.map(member),
    addresses: value.addresses.map(address),
    approvalAutoCap: finite(
      value.approvalAutoCap,
      "kaki-bootstrap-private-profile-invalid",
      0,
      1_000_000,
    ),
    approvalCurrency: text(value.approvalCurrency, "kaki-bootstrap-private-profile-invalid", 8),
  };
}
