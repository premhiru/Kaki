import type {
  Account,
  ChannelKind,
  Household,
  LocaleCode,
  MemoryEntity,
  Person,
  Place,
  PrivacyScope,
  Vendor,
} from "@kaki/core";
import type { HouseholdEvent, HouseholdGraphEntity, Preference, Routine } from "./graph.js";

type UnknownRecord = Record<string, unknown>;

const commonEntityKeys = [
  "id",
  "householdId",
  "createdAt",
  "updatedAt",
  "version",
  "privacy",
  "tags",
  "kind",
] as const;

const entityKeys = {
  household: [
    "displayName",
    "locale",
    "timezone",
    "memberPersonIds",
    "importantPlaceIds",
    "approvalPolicyId",
    "quietHours",
    "encryptionKeyRef",
  ],
  person: [
    "displayName",
    "relation",
    "channelIdentities",
    "languages",
    "register",
    "birthday",
    "dietary",
    "preferenceIds",
    "commutePlaceIds",
    "schoolPlaceIds",
    "clinicPlaceIds",
  ],
  place: [
    "label",
    "countryCode",
    "formattedAddress",
    "latitude",
    "longitude",
    "postalCode",
    "planningArea",
    "source",
  ],
  vendor: [
    "displayName",
    "trade",
    "channelIdentities",
    "rating",
    "ratingSource",
    "lastQuoteSummary",
    "lastContactAt",
    "threadApproved",
  ],
  account: ["provider", "displayLabel", "ownerPersonId", "capabilities", "secretHandle"],
  routine: ["title", "schedule", "placeIds"],
  preference: ["ownerPersonId", "key", "value"],
  event: ["title", "startsAt", "endsAt", "placeId"],
} as const;

export function parsePrivacyScope(value: unknown): PrivacyScope {
  const record = ownedRecord(value, "memory-privacy-invalid");
  rejectExtraKeys(record, ["ownerPersonId", "audience", "sensitivity", "purposes"]);
  const audience = ownedRecord(record.audience, "memory-audience-invalid");
  const audienceKind = requiredString(audience.kind, "memory-audience-kind-invalid", 32);
  let parsedAudience: PrivacyScope["audience"];
  if (audienceKind === "household") {
    rejectExtraKeys(audience, ["kind"]);
    parsedAudience = { kind: "household" };
  } else if (audienceKind === "owner") {
    rejectExtraKeys(audience, ["kind", "personId"]);
    parsedAudience = {
      kind: "owner",
      personId: requiredString(audience.personId, "memory-audience-person-invalid", 128),
    };
  } else if (audienceKind === "people") {
    rejectExtraKeys(audience, ["kind", "personIds"]);
    parsedAudience = {
      kind: "people",
      personIds: stringArray(audience.personIds, "memory-audience-people-invalid", 100),
    };
  } else {
    throw new Error("memory-audience-kind-invalid");
  }
  const sensitivity = requiredString(record.sensitivity, "memory-sensitivity-invalid", 32);
  if (!["public", "household", "private", "medical", "financial"].includes(sensitivity))
    throw new Error("memory-sensitivity-invalid");
  return {
    ...(record.ownerPersonId === undefined
      ? {}
      : { ownerPersonId: requiredString(record.ownerPersonId, "memory-owner-invalid", 128) }),
    audience: parsedAudience,
    sensitivity: sensitivity as PrivacyScope["sensitivity"],
    ...(record.purposes === undefined
      ? {}
      : { purposes: stringArray(record.purposes, "memory-purposes-invalid", 32) }),
  };
}

export function parseGraphEntity(value: unknown): HouseholdGraphEntity {
  const record = ownedRecord(value, "memory-entity-invalid");
  const kind = requiredString(record.kind, "memory-entity-kind-invalid", 32);
  if (!Object.hasOwn(entityKeys, kind)) throw new Error("memory-entity-kind-invalid");
  rejectExtraKeys(record, [...commonEntityKeys, ...entityKeys[kind as keyof typeof entityKeys]]);
  const base = parseEntityBase(record);
  switch (kind) {
    case "household":
      return parseHousehold(record, base);
    case "person":
      return parsePerson(record, base);
    case "place":
      return parsePlace(record, base);
    case "vendor":
      return parseVendor(record, base);
    case "account":
      return parseAccount(record, base);
    case "routine":
      return {
        ...base,
        kind,
        title: requiredString(record.title, "memory-routine-title-invalid", 512),
        ...(optionalString(record.schedule, "memory-routine-schedule-invalid", 256) === undefined
          ? {}
          : { schedule: String(record.schedule) }),
        ...(record.placeIds === undefined
          ? {}
          : { placeIds: stringArray(record.placeIds, "memory-routine-places-invalid", 100) }),
      } satisfies Routine;
    case "preference":
      return {
        ...base,
        kind,
        ...(optionalString(record.ownerPersonId, "memory-preference-owner-invalid", 128) ===
        undefined
          ? {}
          : { ownerPersonId: String(record.ownerPersonId) }),
        key: requiredString(record.key, "memory-preference-key-invalid", 128),
        value: requiredString(record.value, "memory-preference-value-invalid", 4096),
      } satisfies Preference;
    case "event":
      return {
        ...base,
        kind,
        title: requiredString(record.title, "memory-event-title-invalid", 512),
        startsAt: timestamp(record.startsAt, "memory-event-start-invalid"),
        ...(record.endsAt === undefined
          ? {}
          : { endsAt: timestamp(record.endsAt, "memory-event-end-invalid") }),
        ...(optionalString(record.placeId, "memory-event-place-invalid", 128) === undefined
          ? {}
          : { placeId: String(record.placeId) }),
      } satisfies HouseholdEvent;
    default:
      throw new Error("memory-entity-kind-invalid");
  }
}

function parseEntityBase(record: UnknownRecord): MemoryEntity {
  const tags =
    record.tags === undefined ? undefined : stringArray(record.tags, "memory-tags-invalid", 100);
  const version = record.version;
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    throw new Error("memory-version-invalid");
  return {
    id: requiredString(record.id, "memory-id-invalid", 128),
    householdId: requiredString(record.householdId, "memory-household-invalid", 128),
    createdAt: timestamp(record.createdAt, "memory-created-at-invalid"),
    updatedAt: timestamp(record.updatedAt, "memory-updated-at-invalid"),
    version: Number(version),
    privacy: parsePrivacyScope(record.privacy),
    ...(tags === undefined ? {} : { tags }),
  };
}

function parseHousehold(record: UnknownRecord, base: MemoryEntity): Household {
  const quietHours = ownedRecord(record.quietHours, "memory-quiet-hours-invalid");
  rejectExtraKeys(quietHours, ["start", "end", "timezone"]);
  const encryptionKeyRef = requiredString(
    record.encryptionKeyRef,
    "household-key-reference-invalid",
    512,
  );
  if (!/^(?:keychain|secret|kms):\/\//u.test(encryptionKeyRef))
    throw new Error("household-key-reference-invalid");
  if (base.id !== base.householdId) throw new Error("household-id-mismatch");
  return {
    ...base,
    kind: "household",
    displayName: requiredString(record.displayName, "memory-household-name-invalid", 256),
    locale: localeCode(record.locale, "memory-household-locale-invalid"),
    timezone: requiredString(record.timezone, "memory-household-timezone-invalid", 128),
    memberPersonIds: stringArray(record.memberPersonIds, "memory-members-invalid", 1000),
    importantPlaceIds: stringArray(record.importantPlaceIds, "memory-places-invalid", 1000),
    approvalPolicyId: requiredString(record.approvalPolicyId, "memory-policy-invalid", 128),
    quietHours: {
      start: requiredString(quietHours.start, "memory-quiet-start-invalid", 16),
      end: requiredString(quietHours.end, "memory-quiet-end-invalid", 16),
      timezone: requiredString(quietHours.timezone, "memory-quiet-timezone-invalid", 128),
    },
    encryptionKeyRef,
  };
}

function parsePerson(record: UnknownRecord, base: MemoryEntity): Person {
  const identities = array(record.channelIdentities, "memory-person-identities-invalid", 100).map(
    (value) => {
      const identity = ownedRecord(value, "memory-person-identity-invalid");
      rejectExtraKeys(identity, ["channel", "jid", "displayName"]);
      return {
        channel: channelKind(identity.channel, "memory-channel-invalid"),
        jid: requiredString(identity.jid, "memory-jid-invalid", 512),
        ...(optionalString(identity.displayName, "memory-display-name-invalid", 256) === undefined
          ? {}
          : { displayName: String(identity.displayName) }),
      };
    },
  );
  return {
    ...base,
    kind: "person",
    displayName: requiredString(record.displayName, "memory-person-name-invalid", 256),
    channelIdentities: identities,
    languages: stringArray(record.languages, "memory-person-languages-invalid", 32),
    ...optionalStringFields(record, ["relation", "register", "birthday"]),
    ...optionalStringArrays(record, [
      "dietary",
      "preferenceIds",
      "commutePlaceIds",
      "schoolPlaceIds",
      "clinicPlaceIds",
    ]),
  };
}

function parsePlace(record: UnknownRecord, base: MemoryEntity): Place {
  const latitude = finiteNumber(record.latitude, "memory-latitude-invalid");
  const longitude = finiteNumber(record.longitude, "memory-longitude-invalid");
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    throw new Error("memory-coordinates-invalid");
  return {
    ...base,
    kind: "place",
    label: requiredString(record.label, "memory-place-label-invalid", 256),
    countryCode: localeCode(record.countryCode, "memory-country-invalid"),
    formattedAddress: requiredString(record.formattedAddress, "memory-address-invalid", 1024),
    latitude,
    longitude,
    ...optionalStringFields(record, ["postalCode", "planningArea", "source"]),
  };
}

function parseVendor(record: UnknownRecord, base: MemoryEntity): Vendor {
  const identities = array(record.channelIdentities, "memory-vendor-identities-invalid", 100).map(
    (value) => {
      const identity = ownedRecord(value, "memory-vendor-identity-invalid");
      rejectExtraKeys(identity, ["channel", "address"]);
      return {
        channel: vendorChannel(identity.channel),
        address: requiredString(identity.address, "memory-vendor-address-invalid", 512),
      };
    },
  );
  const rating =
    record.rating === undefined ? undefined : finiteNumber(record.rating, "memory-rating-invalid");
  if (rating !== undefined && (rating < 0 || rating > 5)) throw new Error("memory-rating-invalid");
  if (typeof record.threadApproved !== "boolean") throw new Error("memory-thread-invalid");
  const lastContactAt =
    record.lastContactAt === undefined
      ? undefined
      : timestamp(record.lastContactAt, "memory-last-contact-invalid");
  return {
    ...base,
    kind: "vendor",
    displayName: requiredString(record.displayName, "memory-vendor-name-invalid", 256),
    trade: requiredString(record.trade, "memory-vendor-trade-invalid", 128),
    channelIdentities: identities,
    threadApproved: record.threadApproved,
    ...(rating === undefined ? {} : { rating }),
    ...optionalStringFields(record, ["ratingSource", "lastQuoteSummary"]),
    ...(lastContactAt === undefined ? {} : { lastContactAt }),
  };
}

function parseAccount(record: UnknownRecord, base: MemoryEntity): Account {
  const capabilities = stringArray(record.capabilities, "memory-capabilities-invalid", 3);
  if (capabilities.some((item) => !["read", "prepare", "submit"].includes(item)))
    throw new Error("memory-capabilities-invalid");
  const secretHandle = optionalString(record.secretHandle, "memory-account-handle-invalid", 512);
  if (secretHandle !== undefined && !/^(?:keychain|secret|kms):\/\//u.test(secretHandle))
    throw new Error("memory-account-handle-invalid");
  return {
    ...base,
    kind: "account",
    provider: requiredString(record.provider, "memory-account-provider-invalid", 128),
    displayLabel: requiredString(record.displayLabel, "memory-account-label-invalid", 256),
    capabilities: capabilities as Account["capabilities"],
    ...optionalStringFields(record, ["ownerPersonId"]),
    ...(secretHandle === undefined ? {} : { secretHandle }),
  };
}

function ownedRecord(value: unknown, code: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(code);
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
  const copy: UnknownRecord = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(code);
    copy[key] = descriptor.value;
  }
  return copy;
}

function rejectExtraKeys(record: UnknownRecord, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  const extra = Object.keys(record).find((key) => !allow.has(key));
  if (extra) throw new Error(`memory-field-rejected:${extra}`);
}

function requiredString(value: unknown, code: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(code);
  return value;
}

function optionalString(value: unknown, code: string, max: number): string | undefined {
  return value === undefined ? undefined : requiredString(value, code, max);
}

function timestamp(value: unknown, code: string): string {
  const result = requiredString(value, code, 64);
  if (!Number.isFinite(Date.parse(result))) throw new Error(code);
  return result;
}

function finiteNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(code);
  return value;
}

function localeCode(value: unknown, code: string): LocaleCode {
  const locale = requiredString(value, code, 32);
  if (!["sg", "my", "id", "th", "vn", "ph", "mm", "kh"].includes(locale)) throw new Error(code);
  return locale as LocaleCode;
}

function channelKind(value: unknown, code: string): ChannelKind {
  const channel = requiredString(value, code, 64);
  if (
    ![
      "whatsapp",
      "telegram",
      "webchat",
      "line",
      "zalo",
      "viber",
      "messenger",
      "wechat",
      "signal",
    ].includes(channel)
  )
    throw new Error(code);
  return channel as ChannelKind;
}

function vendorChannel(value: unknown): Vendor["channelIdentities"][number]["channel"] {
  const channel = requiredString(value, "memory-channel-invalid", 64);
  if (channel === "phone" || channel === "email") return channel;
  return channelKind(channel, "memory-channel-invalid");
}

function array(value: unknown, code: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(code);
  return value;
}

function stringArray(value: unknown, code: string, max: number): string[] {
  return array(value, code, max).map((item) => requiredString(item, code, 512));
}

function optionalStringFields(
  record: UnknownRecord,
  keys: readonly string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = optionalString(record[key], `memory-${key}-invalid`, 1024);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function optionalStringArrays(
  record: UnknownRecord,
  keys: readonly string[],
): Record<string, readonly string[]> {
  const result: Record<string, readonly string[]> = {};
  for (const key of keys)
    if (record[key] !== undefined)
      result[key] = stringArray(record[key], `memory-${key}-invalid`, 1000);
  return result;
}
