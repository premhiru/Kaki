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

const AUDIENCE_PREFIX =
  /^(?:bank officer|pegawai bank|petugas bank|kawani ng bangko|nhân viên ngân hàng|银行职员|வங்கி அதிகாரி|เจ้าหน้าที่ธนาคาร|teacher|cikgu|guru|pak guru|guro|thầy|cô|老师|ஆசிரியர்|คุณครู|hr|hrd|employer|majikan|phòng nhân sự|雇主|மனிதவள அதிகாரி|ฝ่ายบุคคล|kid|child|adik|anak|em|le|หนู|小朋友|குழந்தை|ah ma|ah gong|mak|ayah|ibu|bapa|lola|lolo|auntie|uncle|khun yai|simbah|bà|ông|阿嬷|阿公|அம்மா|அப்பா|คุณยาย|คุณตา|boss|bos|tukang|pak tukang|kontratista|nhà thầu|sếp|ช่าง|หัวหน้า|老板|师傅|ஒப்பந்தக்காரர்|sir|madam|tuan|puan|encik|bapak|khun|kính gửi cán bộ|ginoo|ginang|政府官员|அய்யா|அம்மையீர்|அதிகாரி|เจ้าหน้าที่)\s*[,，]\s*(?:(?:formally|secara rasmi|secara resmi)\s*)?/iu;

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
    intent: detectIntent(stripAudiencePrefix(text)),
    intentText,
    language: detectLanguage(text, pack.code),
    register: detectRegister(text),
    codeSwitch,
  };
}

export function detectIntent(text: string): string {
  return INTENTS.find(([, pattern]) => pattern.test(text))?.[0] ?? "general.help";
}

function stripAudiencePrefix(text: string): string {
  return text.replace(AUDIENCE_PREFIX, "");
}

export function detectLanguage(text: string, locale: LocaleCode): string {
  if (/[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[\u0e00-\u0e7f]/u.test(text)) return "th";
  if (/[\u1000-\u109f]/u.test(text)) return "my";
  if (/[\u1780-\u17ff]/u.test(text)) return "km";
  if (/[\u4e00-\u9fff]/u.test(text)) return "zh";
  if (
    locale === "id" &&
    /\b(monggo|matur nuwun|saiki|sesuk|piye|ora|nggih|simbah|pak guru)\b/iu.test(text)
  )
    return "jv";
  if (
    (locale === "my" || locale === "sg") &&
    /\b(semak|bas|tempah|cukai|kerajaan|sediakan|ingatkan saya|klinik doktor|cuti sekolah|pegawai bank|majikan)\b/iu.test(
      text,
    )
  )
    return "ms";
  if (
    locale === "id" &&
    /\b(cek|pesan|pajak|pemerintah|siapkan|ingatkan aku|libur|petugas bank|hrd)\b/iu.test(text)
  )
    return "id";
  if (
    locale === "vn" &&
    /\b(xem|bây giờ|ngày mai|đồ ăn|đặt lịch|thuế|thanh toán|nhắc|phòng khám|nghỉ lễ|nhân viên ngân hàng|phòng nhân sự)\b/iu.test(
      text,
    )
  )
    return "vi";
  if (
    locale === "ph" &&
    /\b(tingnan|ngayon|sakay|pagkain|buwis|bayad|ipaalala|klinika|bakasyon|kawani ng bangko)\b/iu.test(
      text,
    )
  )
    return "fil";
  if (/\b(lah|leh|lor|sia|hor|walao|paiseh|jialat|can or not)\b/iu.test(text)) return "singlish";
  if (/\b(please|could you|can you|check|prepare|find|show|book|order|remind)\b/iu.test(text))
    return "en";
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
  return "en";
}

export function detectRegister(text: string): Register {
  // Specific audiences precede broad formal honorifics so their policy survives projection.
  if (
    /^(bank officer|pegawai bank|petugas bank|kawani ng bangko|nhân viên ngân hàng)\s*[,，]|^(银行职员|வங்கி அதிகாரி|เจ้าหน้าที่ธนาคาร)\s*[,，]?/iu.test(
      text,
    )
  )
    return "bank";
  if (
    /^(teacher|cikgu|guru|pak guru|guro|thầy|cô)\s*[,，]|^(老师|ஆசிரியர்|คุณครู)\s*[,，]?/iu.test(text)
  )
    return "school";
  if (
    /^(hr|hrd|employer|majikan|phòng nhân sự)\s*[,，]|^(雇主|மனிதவள அதிகாரி|ฝ่ายบุคคล)\s*[,，]?/iu.test(
      text,
    )
  )
    return "employer";
  if (/^(kid|child|adik|anak|em|le|หนู)\s*[,，]|^(小朋友|குழந்தை)\s*[,，]?/iu.test(text))
    return "child";
  if (
    /\b(ah ma|ah gong|mak|ayah|ibu|bapa|lola|lolo|auntie|uncle|khun yai|simbah)\b|^(bà|ông)\s*[,，]|阿嬷|阿公|அம்மா|அப்பா|คุณยาย|คุณตา/iu.test(
      text,
    )
  )
    return "elder";
  if (
    /^(boss|bos|tukang|pak tukang|kontratista|nhà thầu|sếp|ช่าง|หัวหน้า)\s*[,，]|^(老板|师傅|ஒப்பந்தக்காரர்)\s*[,，]/iu.test(
      text,
    )
  )
    return "contractor";
  if (
    /\b(formally|official|sir|madam|tuan|puan|encik|bapak|khun|kính gửi|ginoo|ginang|cán bộ)\b|尊敬|敬启|政府官员|அய்யா|அம்மையீர்|அதிகாரி|เจ้าหน้าที่/iu.test(
      text,
    )
  )
    return "official";
  return "peer";
}
