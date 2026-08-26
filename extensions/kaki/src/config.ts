import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";

export type KakiPluginConfig = Readonly<{
  householdProfileId: string;
  operatorPersonId: string;
  addressBookProfileId: string;
  approvalPolicyProfileId: string;
  dataProfileId: string;
  phoneNodeId: string;
  whatsappAccountId: string;
  telegramAccountId: string;
  modelProfileId: string;
  asrProfileId: string;
  locale: "sg" | "my" | "id" | "th" | "vn" | "ph" | "mm" | "kh";
}>;

function profileReference(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    value.trim() === value
    ? value
    : undefined;
}

function localeCode(value: unknown): KakiPluginConfig["locale"] | undefined {
  switch (value) {
    case "sg":
    case "my":
    case "id":
    case "th":
    case "vn":
    case "ph":
    case "mm":
    case "kh":
      return value;
    default:
      return undefined;
  }
}

/** Parse the non-secret references written atomically by `kaki onboard`. */
export function parseKakiPluginConfig(value: unknown): KakiPluginConfig | undefined {
  if (!isRecord(value)) return undefined;
  const householdProfileId = profileReference(value.householdProfileId);
  const operatorPersonId = profileReference(value.operatorPersonId);
  const addressBookProfileId = profileReference(value.addressBookProfileId);
  const approvalPolicyProfileId = profileReference(value.approvalPolicyProfileId);
  const dataProfileId = profileReference(value.dataProfileId);
  const phoneNodeId = profileReference(value.phoneNodeId);
  const whatsappAccountId = profileReference(value.whatsappAccountId);
  const telegramAccountId = profileReference(value.telegramAccountId);
  const modelProfileId = profileReference(value.modelProfileId);
  const asrProfileId = profileReference(value.asrProfileId);
  const locale = localeCode(value.locale);
  if (
    !householdProfileId ||
    !operatorPersonId ||
    !addressBookProfileId ||
    !approvalPolicyProfileId ||
    !dataProfileId ||
    !phoneNodeId ||
    !whatsappAccountId ||
    !telegramAccountId ||
    !modelProfileId ||
    !asrProfileId ||
    !locale
  ) {
    return undefined;
  }
  return {
    householdProfileId,
    operatorPersonId,
    addressBookProfileId,
    approvalPolicyProfileId,
    dataProfileId,
    phoneNodeId,
    whatsappAccountId,
    telegramAccountId,
    modelProfileId,
    asrProfileId,
    locale,
  };
}
