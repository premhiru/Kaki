export interface NormalisedMessage {
  intentText: string;
  language:
    | "en"
    | "singlish"
    | "zh"
    | "ms"
    | "ta"
    | "id"
    | "th"
    | "vi"
    | "fil"
    | "my"
    | "km"
    | "unknown";
  codeSwitch: string[];
  register: "singlish" | "standard" | "elder" | "formal" | "casual";
  entities: Record<string, string | number>;
}

const SG_NORMALISATIONS: ReadonlyArray<[string, string]> = [
  ["can or not", "is this possible"],
  ["siew dai", "less sugar"],
  ["gah dai", "more sugar"],
  ["tmr", "tomorrow"],
  ["grab", "Grab ride"],
  ["kopi", "coffee"],
  ["teh", "tea"],
  ["peng", "iced"],
  ["kosong", "no sugar"],
  ["chope", "reserve"],
];

export function identifyLanguage(text: string): NormalisedMessage["language"] {
  if (/[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[\u0e00-\u0e7f]/u.test(text)) return "th";
  if (/[\u1000-\u109f]/u.test(text)) return "my";
  if (/[\u1780-\u17ff]/u.test(text)) return "km";
  if (/[\u4e00-\u9fff]/u.test(text)) return "zh";
  if (/\b(aku|kamu|nggak|gak|besok|dokter)\b/iu.test(text)) return "id";
  if (/\b(saya|boleh|makan|jalan|hujan|klinik)\b/iu.test(text)) return "ms";
  if (/\b(po|opo|kuya|ate|salamat|bukas)\b/iu.test(text)) return "fil";
  if (/[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/iu.test(text)) return "vi";
  if (/\b(lah|leh|lor|sia|hor|eh|walao|paiseh|jialat|can or not)\b/iu.test(text)) return "singlish";
  return "en";
}

export function normaliseLocalMessage(text: string): NormalisedMessage {
  let intentText = text.toLocaleLowerCase();
  const codeSwitch: string[] = [];
  for (const [local, standard] of SG_NORMALISATIONS) {
    if (!intentText.includes(local)) continue;
    intentText = intentText.replaceAll(local, standard);
    codeSwitch.push(local);
  }
  const entities: Record<string, string | number> = {};
  const amount = /(?:s\$|\$|sgd)\s*(\d+(?:\.\d{1,2})?)/iu.exec(text)?.[1];
  if (amount) entities.amountSgd = Number(amount);
  const pax = /(\d+)\s*pax/iu.exec(text)?.[1];
  if (pax) entities.passengers = Number(pax);
  const postalCode = /\b(?:s(?:ingapore)?\s*)?(\d{6})\b/iu.exec(text)?.[1];
  if (postalCode) entities.postalCode = postalCode;
  const language = identifyLanguage(text);
  const register: NormalisedMessage["register"] =
    language === "singlish"
      ? "singlish"
      : /\b(sir|madam|tuan|puan|尊敬)\b/iu.test(text)
        ? "formal"
        : /\b(ah ma|ah gong|auntie|uncle|lola|lolo)\b|阿嬷|阿公/iu.test(text)
          ? "elder"
          : "standard";
  return { intentText, language, codeSwitch, register, entities };
}
