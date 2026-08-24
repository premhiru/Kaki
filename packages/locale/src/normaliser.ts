import type { LocaleCode, LocalePack, NormalisedLocaleMessage, Register } from "./types.js";

const INTENTS: ReadonlyArray<[string, RegExp]> = [
  [
    "weather.check",
    /(weather|rain|forecast|haze|cuaca|hujan|天气|下雨|மழை|อากาศ|ฝน|thời tiết|mưa|panahon|ulan)/iu,
  ],
  [
    "transport.status",
    /(bus|mrt|train|traffic|grab|causeway|bas|tren|交通|巴士|地铁|பேருந்து|รถ|bts|giao thông|xe buýt|trapiko|sakay)/iu,
  ],
  [
    "food.order",
    /(food|order|kopi|teh|makan|nasi|hawker|吃|咖啡|சாப்பாடு|อาหาร|กิน|đồ ăn|cà phê|pagkain|kape)/iu,
  ],
  [
    "booking.create",
    /(book|booking|reserve|appointment|tempah|pesan|预约|预订|முன்பதிவு|จอง|đặt lịch|đặt chỗ|reserba)/iu,
  ],
  [
    "government.check",
    /(iras|cpf|hdb|singpass|government|cukai|kerajaan|pajak|政府|税|அரசு|வரி|รัฐบาล|ภาษี|chính phủ|thuế|gobyerno|buwis)/iu,
  ],
  [
    "payment.prepare",
    /(pay|payment|paynow|duitnow|qris|promptpay|vietqr|gcash|bayar|支付|付款|பணம்|จ่าย|thanh toán|bayad)/iu,
  ],
  ["reminder.create", /(remind|reminder|ingatkan|提醒|நினைவூட்டு|เตือน|nhắc|paalala|ipaalala)/iu],
  [
    "vendor.find",
    /(vendor|contractor|aircon|repair|service|tukang|供应商|维修|ஒப்பந்தக்காரர்|ช่าง|nhà cung cấp|sửa|kontratista|ayos)/iu,
  ],
  [
    "health.check",
    /(health|clinic|doctor|medicine|polyclinic|klinik|dokter|诊所|医生|மருத்துவர்|คลินิก|หมอ|phòng khám|bác sĩ|klinika|doktor)/iu,
  ],
  [
    "holiday.check",
    /(holiday|school break|cny|raya|deepavali|ramadan|cuti|libur|假期|节日|விடுமுறை|วันหยุด|nghỉ lễ|pista|bakasyon)/iu,
  ],
];

export function normaliseLocaleMessage(text: string, pack: LocalePack): NormalisedLocaleMessage {
  const lower = text.toLocaleLowerCase();
  const matched = pack.lexicon.entries
    .filter((entry) => lower.includes(entry.term.toLocaleLowerCase()))
    .sort((left, right) => right.term.length - left.term.length);
  let intentText = lower;
  const codeSwitch: string[] = [];
  for (const entry of matched) {
    if (!codeSwitch.includes(entry.term)) codeSwitch.push(entry.term);
    intentText = intentText.replaceAll(entry.term.toLocaleLowerCase(), entry.normalised);
  }
  return {
    intent: detectIntent(text),
    intentText,
    language: detectLanguage(text, pack.code),
    register: detectRegister(text),
    codeSwitch,
  };
}

export function detectIntent(text: string): string {
  return INTENTS.find(([, pattern]) => pattern.test(text))?.[0] ?? "general.help";
}

export function detectLanguage(text: string, locale: LocaleCode): string {
  if (/[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[\u0e00-\u0e7f]/u.test(text)) return "th";
  if (/[\u1000-\u109f]/u.test(text)) return "my";
  if (/[\u1780-\u17ff]/u.test(text)) return "km";
  if (/[\u4e00-\u9fff]/u.test(text)) return "zh";
  if (locale === "vn") return "vi";
  if (locale === "ph") return "fil";
  if (locale === "id") return "id";
  if (locale === "my") return "ms";
  if (locale === "th") return "th";
  if (
    /\b(saya|boleh|tolong|makan|hujan|bas|klinik|cuti|semak|pesan|tempah|cukai|bayar|ingatkan|tukang)\b/iu.test(
      text,
    )
  )
    return "ms";
  if (/\b(lah|leh|lor|sia|hor|walao|paiseh|jialat|can or not)\b/iu.test(text)) return "singlish";
  return "en";
}

export function detectRegister(text: string): Register {
  if (
    /\b(ah ma|ah gong|mak|ayah|ibu|bapa|lola|lolo|auntie|uncle|khun yai)\b|^(bà|ông)\s*[,，]|阿嬷|阿公|அம்மா|அப்பா|คุณยาย|คุณตา/iu.test(
      text,
    )
  )
    return "elder";
  if (
    /^(boss|bos|tukang|kontratista|nhà thầu|sếp|หัวหน้า)\s*[,，]|^(老板|முதலாளி)\s*[,，]/iu.test(
      text,
    )
  )
    return "contractor";
  if (
    /\b(formally|official|sir|madam|tuan|puan|encik|bapak|khun|kính gửi|ginoo|ginang)\b|尊敬|敬启|அய்யா|அம்மையீர்/iu.test(
      text,
    )
  )
    return "official";
  return "peer";
}
