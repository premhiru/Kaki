#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { format, resolveConfig } from "prettier";

const root = path.resolve(import.meta.dirname, "../..");
const localeRoot = path.join(root, "packages", "locale");
const evalRoot = path.join(root, "evals", "locales");
const prettierOptions = (await resolveConfig(path.join(root, "package.json"))) ?? {};

function buildPacks() {
  return {
    sg: pack(
      "Asia/Singapore",
      ["whatsapp", "telegram", "webchat"],
      ["en", "singlish", "zh", "ms", "ta"],
      "Mirror the speaker naturally. Use light Singlish with peers, short respectful sentences for elders, and formal English for schools, government, banks, and employers. Use Uncle/Auntie, 阿姨/叔叔, Kak/Abang only where natural.",
      ["New Year", "Chinese New Year", "Hari Raya Puasa", "Deepavali", "Vesak Day", "National Day"],
      sgLexicon(),
    ),
    my: pack(
      "Asia/Kuala_Lumpur",
      ["whatsapp", "telegram", "wechat"],
      ["ms", "en", "zh", "ta"],
      "Use natural Bahasa Melayu or Manglish to match the speaker. Use Encik/Puan formally and Kak/Abang socially. Respect Raya, CNY and Deepavali contexts.",
      ["Hari Merdeka", "Malaysia Day", "Hari Raya Aidilfitri", "Chinese New Year", "Deepavali"],
      regionalLexicon("my"),
    ),
    id: pack(
      "Asia/Jakarta",
      ["whatsapp", "telegram"],
      ["id", "jv", "en"],
      "Use Bahasa Indonesia and light bahasa gaul only when invited. Use Pak/Bu formally and Mas/Mbak socially. Prefer Lebaran terminology and local payment vocabulary.",
      ["Hari Kemerdekaan", "Idul Fitri", "Nyepi", "Waisak"],
      regionalLexicon("id"),
    ),
    th: pack(
      "Asia/Bangkok",
      ["line", "telegram"],
      ["th", "en"],
      "Use Thai politeness particles ครับ/ค่ะ consistently and Khun for neutral respect. Observe Songkran, Buddhist days and alcohol-ban notices; avoid political or royal speculation.",
      ["Songkran", "Visakha Bucha", "Constitution Day", "King's Birthday"],
      regionalLexicon("th"),
    ),
    vn: pack(
      "Asia/Ho_Chi_Minh",
      ["zalo", "telegram"],
      ["vi", "en"],
      "Use Vietnamese age-relative pronouns anh/chị/em based on the profile, not guesses. Use respectful neutral phrasing until age relationships are known. Know Tết logistics.",
      ["Tết", "Reunification Day", "National Day", "Hùng Kings Festival"],
      regionalLexicon("vn"),
    ),
    ph: pack(
      "Asia/Manila",
      ["messenger", "viber", "whatsapp", "telegram"],
      ["fil", "en"],
      "Use natural Taglish when mirrored, Kuya/Ate for familiar respect, and po/opo with elders. Account for fiestas, Holy Week and Undas.",
      ["Araw ng Kalayaan", "Holy Week", "Undas", "Christmas"],
      regionalLexicon("ph"),
    ),
    mm: pack(
      "Asia/Yangon",
      ["viber", "telegram"],
      ["my"],
      "Stub pack: use polite Burmese and neutral honorifics. Require local review before external messaging.",
      ["Thingyan"],
      stubLexicon("mm"),
    ),
    kh: pack(
      "Asia/Phnom_Penh",
      ["telegram", "messenger"],
      ["km"],
      "Stub pack: use polite Khmer and neutral honorifics. Require local review before external messaging.",
      ["Khmer New Year", "Pchum Ben"],
      stubLexicon("kh"),
    ),
  };
}

function pack(timezone, channelPriority, languages, persona, holidays, entries) {
  return { timezone, channelPriority, languages, persona, holidays, entries };
}

async function writePack(code, data) {
  const directory = path.join(localeRoot, code);
  await fs.mkdir(path.join(directory, "eval"), { recursive: true });
  const persona = `# ${code.toUpperCase()} locale persona\n\n${data.persona}\n\n## Register matrix\n\n| Audience | Register |\n| --- | --- |\n| Elder | gentle, short, respectful |\n| Peer | mirror language and informality |\n| Child | age-appropriate; hide financial and medical detail |\n| Contractor | concise, polite, price/availability/warranty |\n| Official/school/bank/employer | formal standard language |\n`;
  await writeGeneratedFile(
    path.join(directory, "persona.md"),
    await format(persona, { ...prettierOptions, filepath: path.join(directory, "persona.md") }),
    "utf8",
  );
  await writeJson(path.join(directory, "lexicon.json"), {
    locale: code,
    version: 1,
    entries: data.entries,
  });
  await writeJson(path.join(directory, "calendar.json"), {
    locale: code,
    timezone: data.timezone,
    events: [
      ...data.holidays.map((name, index) => ({
        id: `${code}-holiday-${index + 1}`,
        name,
        type: "public",
        rule: "Resolve yearly from an authoritative government calendar; fixture labels are not live dates.",
      })),
      ...(calendarExtras[code] ?? []),
    ],
  });
  await writeJson(path.join(directory, "formats.json"), formats(code));
  await writeJson(path.join(directory, "dietary.json"), dietary(code));
  await writeJson(path.join(directory, "channels.json"), {
    locale: code,
    priority: data.channelPriority,
    languages: data.languages,
    dataTools: [`${code}-public-data`, "regional-holidays", "currency-remittance"],
    defaultModels: defaultModels(code),
    fixtureModeAvailable: true,
  });
  await writeJson(path.join(directory, "eval", "manifest.json"), {
    locale: code,
    generatedBy: "scripts/locale/generate.mjs",
    datasets: evalSpecifications()
      .filter((item) => item.locale === code)
      .map((item) => `../../../evals/locales/${item.locale}-${item.language}.jsonl`),
    contract:
      "expected labels are deterministic template truth without native-speaker review; the locale scorer and package test execute the public normalizer for every row",
  });
}

function defaultModels(code) {
  const generation = {
    sg: ["sea-lion/SEA-LION-v4.5", "openai/gpt-5-mini"],
    my: ["mallam/MaLLaM", "ilmu/ILMU", "sea-lion/SEA-LION-v4.5"],
    id: ["sahabat-ai/sahabat-70b", "sea-lion/SEA-LION-v4.5"],
    th: ["typhoon/typhoon-v2.5", "sea-lion/SEA-LION-v4.5"],
    vn: ["sea-lion/SEA-LION-v4.5", "openai/gpt-5-mini"],
    ph: ["sea-lion/SEA-LION-v4.5", "openai/gpt-5-mini"],
    mm: ["sea-lion/SEA-LION-v4.5", "openai/gpt-5-mini"],
    kh: ["sea-lion/SEA-LION-v4.5", "openai/gpt-5-mini"],
  }[code];
  return {
    planner: ["anthropic/claude-sonnet", "openai/gpt-5"],
    tool: ["anthropic/claude-sonnet", "openai/gpt-5"],
    vision: ["anthropic/claude-sonnet", "openai/gpt-5"],
    normalise: ["ollama/qwen3:8b", "openrouter/qwen/qwen3-8b"],
    generate: generation,
    safety: ["sea-guard/SEA-Guard"],
    embedding: ["vllm/bge-m3", "ollama/bge-m3"],
    heartbeat: ["ollama/qwen3:4b", "openai/gpt-5-nano"],
    asr: ["meralion/MERaLiON-2", "openai/whisper-large-v3-turbo"],
  };
}

function formats(code) {
  const currency = {
    sg: "SGD",
    my: "MYR",
    id: "IDR",
    th: "THB",
    vn: "VND",
    ph: "PHP",
    mm: "MMK",
    kh: "KHR",
  }[code];
  return {
    locale: code,
    currency,
    date: code === "ph" ? "MM/DD/YYYY" : "DD/MM/YYYY",
    time: "HH:mm",
    phone: { storage: "E.164", display: "national" },
    address: { preserveUnit: true, preservePostalCode: true },
    idMasking: {
      mode: "show-last-4",
      patterns: code === "sg" ? ["NRIC", "FIN", "passport"] : ["national-id", "passport"],
    },
  };
}

function dietary(code) {
  return {
    locale: code,
    neverInfer: true,
    flags: ["halal", "vegetarian", "vegan", "no-pork", "no-beef", "allergy"],
    localTerms: {
      sg: ["halal", "no pork no lard", "vegetarian", "jain"],
      my: ["halal", "tiada babi", "vegetarian"],
      id: ["halal", "tanpa babi", "vegetarian"],
      th: ["ฮาลาล", "มังสวิรัติ", "เจ"],
      vn: ["halal", "ăn chay", "không thịt heo"],
      ph: ["halal", "vegetarian", "walang baboy"],
      mm: ["ဟာလာလ်", "သက်သတ်လွတ်"],
      kh: ["ហាឡាល់", "បួស"],
    }[code],
  };
}

function sgLexicon() {
  const entries = [];
  const drinks = [
    ["kopi", "coffee"],
    ["kopi-C", "coffee with evaporated milk"],
    ["kopi-O", "black coffee with sugar"],
    ["teh", "tea with condensed milk"],
    ["teh-C", "tea with evaporated milk"],
    ["teh-O", "black tea with sugar"],
    ["yuan yang", "coffee and tea"],
    ["milo", "malted chocolate drink"],
    ["horlicks", "malted drink"],
    ["tak kiu", "Milo"],
    ["diao yu", "Chinese tea"],
    ["Michael Jackson", "soy milk with grass jelly"],
  ];
  const sweetness = [
    ["", "standard sweetness"],
    ["kosong", "no sugar"],
    ["siew dai", "less sugar"],
    ["gah dai", "more sugar"],
    ["half sweet", "half sugar"],
    ["quarter sweet", "quarter sugar"],
    ["no condensed milk", "without condensed milk"],
    ["sugar separate", "sugar served separately"],
  ];
  const preparations = [
    ["", "hot"],
    ["peng", "iced"],
    ["poh", "weak"],
    ["gao", "strong"],
    ["di lo", "extra concentrated"],
    ["tarik", "pulled"],
    ["packet", "takeaway bag"],
  ];
  for (const [drink, drinkMeaning] of drinks)
    for (const [sweet, sweetMeaning] of sweetness)
      for (const [prep, prepMeaning] of preparations) {
        const term = [drink, sweet, prep].filter(Boolean).join(" ");
        entries.push(
          entry(term, `${drinkMeaning}; ${sweetMeaning}; ${prepMeaning}`, "kopitiam", [
            "singlish",
            "en",
            "zh",
            "ms",
          ]),
        );
      }
  const seeds = [
    ["chope", "reserve a seat", "singlish"],
    ["bo jio", "did not invite", "singlish"],
    ["paiseh", "embarrassed or sorry", "singlish"],
    ["shiok", "very satisfying", "singlish"],
    ["sian", "weary or bored", "singlish"],
    ["kiasu", "afraid to lose out", "singlish"],
    ["jialat", "in trouble", "singlish"],
    ["alamak", "expression of surprise", "singlish"],
    ["walao", "expression of disbelief", "singlish"],
    ["steady", "reliable or agreed", "singlish"],
    ["on", "agreed", "singlish"],
    ["settle", "complete the task", "singlish"],
    ["can or not", "is this possible", "singlish"],
    ["makan", "eat", "malay-loan"],
    ["jalan", "walk or road", "malay-loan"],
    ["kena", "was subjected to", "malay-loan"],
    ["sayang", "dear or pity", "malay-loan"],
    ["boleh", "can", "malay-loan"],
    ["aiyo", "expression of concern", "loan"],
    ["goondu", "foolish person", "loan"],
    ["HDB", "Housing and Development Board", "housing"],
    ["BTO", "Build-To-Order flat", "housing"],
    ["HFE", "HDB Flat Eligibility letter", "housing"],
    ["EC", "executive condominium", "housing"],
    ["S&CC", "service and conservancy charges", "housing"],
    ["void deck", "open ground floor of an HDB block", "housing"],
    ["lift lobby", "area outside lifts", "housing"],
    ["CPF OA", "CPF Ordinary Account", "finance"],
    ["CPF SA", "CPF Special Account", "finance"],
    ["CPF MA", "CPF MediSave Account", "finance"],
    ["COE", "Certificate of Entitlement", "transport"],
    ["ERP", "Electronic Road Pricing", "transport"],
    ["PARF", "Preferential Additional Registration Fee", "transport"],
    ["SimplyGo", "public transport fare account", "transport"],
    ["MC", "medical certificate", "work"],
    ["NS", "National Service", "national-service"],
    ["ICT", "in-camp training", "national-service"],
    ["IPPT", "Individual Physical Proficiency Test", "national-service"],
    ["PSLE", "Primary School Leaving Examination", "school"],
    ["DSA", "Direct School Admission", "school"],
    ["CHAS", "Community Health Assist Scheme", "health"],
    ["MediSave", "national medical savings account", "health"],
    ["MediShield Life", "national basic health insurance", "health"],
    ["NTUC", "National Trades Union Congress or FairPrice", "shopping"],
    ["FairPrice", "supermarket", "shopping"],
    ["Sheng Siong", "supermarket", "shopping"],
    ["dabao", "take away food", "food"],
    ["hawker centre", "cooked-food centre", "food"],
    ["cai png", "economy rice", "food"],
    ["nasi padang", "Malay or Indonesian rice with dishes", "food"],
    ["roti prata", "South Indian flatbread", "food"],
    ["laksa", "spicy coconut noodle soup", "food"],
    ["bak chor mee", "minced meat noodles", "food"],
    ["chicken rice", "Hainanese chicken rice", "food"],
    ["char kway teow", "stir-fried rice noodles", "food"],
    ["mee rebus", "noodles in sweet savoury gravy", "food"],
    ["mee siam", "rice vermicelli in tangy gravy", "food"],
    ["thosai", "fermented rice and lentil crepe", "food"],
    ["ban mian", "handmade noodles", "food"],
    ["yong tau foo", "stuffed tofu selection", "food"],
    ["fishball noodles", "noodles with fishballs", "food"],
    ["kopitiam", "local coffee shop", "food"],
    ["heartland", "residential neighbourhood", "place"],
    ["ulu", "remote", "place"],
    ["town area", "central Singapore", "place"],
    ["JB", "Johor Bahru", "place"],
    ["Causeway", "Woodlands-Johor crossing", "transport"],
    ["Second Link", "Tuas-Johor crossing", "transport"],
    ["Parents Gateway", "Singapore school parent application", "school"],
    ["HealthHub", "Singapore health portal", "health"],
    ["Singpass", "Singapore digital identity", "government"],
    ["IRAS", "Inland Revenue Authority of Singapore", "government"],
    ["NLB", "National Library Board", "government"],
    ["ActiveSG", "public sport booking service", "government"],
    ["OneMap", "Singapore geospatial platform", "government"],
    ["DataMall", "LTA transport data platform", "transport"],
    ["2-room Flexi", "HDB flat type", "housing"],
    ["4-room", "HDB four-room flat", "housing"],
    ["5-room", "HDB five-room flat", "housing"],
    ["season parking", "monthly HDB parking", "transport"],
    ["ERP 2.0", "satellite road pricing system", "transport"],
    ["school run", "trip taking children to school", "family"],
    ["helper", "migrant domestic worker", "family"],
    ["Ah Ma", "grandmother", "family"],
    ["Ah Gong", "grandfather", "family"],
    ["ang pow", "red packet", "culture"],
    ["duit raya", "Hari Raya gift money", "culture"],
    ["reunion dinner", "Chinese New Year eve family meal", "culture"],
    ["Hungry Ghost", "seventh lunar month observance", "culture"],
    ["NDP", "National Day Parade", "culture"],
    ["F1 road closure", "Formula One road closure", "transport"],
    ["PSI", "Pollutant Standards Index", "weather"],
    ["PM2.5", "fine particulate concentration", "weather"],
    ["NEA", "National Environment Agency", "government"],
    ["MOH", "Ministry of Health", "government"],
    ["LTA", "Land Transport Authority", "government"],
  ];
  for (const [term, normalised, category] of seeds)
    entries.push(entry(term, normalised, category, ["en", "singlish"]));
  return unique(entries);
}

const regionalSeeds = {
  my: [
    ["DuitNow", "instant payment rail"],
    ["Touch 'n Go", "stored-value wallet"],
    ["VEP", "Vehicle Entry Permit"],
    ["MyDigital ID", "digital identity"],
    ["JAKIM", "Islamic affairs authority"],
    ["JPJ", "Road Transport Department"],
    ["LHDN", "tax authority"],
    ["balik kampung", "return to hometown"],
    ["mamak", "Indian Muslim eatery"],
    ["tapau", "take away"],
  ],
  id: [
    ["QRIS", "national QR payment"],
    ["Gojek", "super-app"],
    ["Tokopedia", "marketplace"],
    ["BMKG", "weather agency"],
    ["KRL", "commuter rail"],
    ["TransJakarta", "bus rapid transit"],
    ["IKD", "digital population identity"],
    ["Lebaran", "Eid celebration"],
    ["mudik", "holiday homecoming"],
    ["warung", "small eatery"],
  ],
  th: [
    ["PromptPay", "instant payment rail"],
    ["LINE MAN", "delivery service"],
    ["BTS", "Bangkok elevated rail"],
    ["MRT", "metropolitan rail"],
    ["TMD", "meteorological department"],
    ["ThaID", "digital identity"],
    ["Songkran", "Thai New Year"],
    ["วันพระ", "Buddhist holy day"],
    ["เจ", "Thai vegan diet"],
    ["วินมอเตอร์ไซค์", "motorcycle taxi"],
  ],
  vn: [
    ["VietQR", "national QR standard"],
    ["Zalo", "messaging platform"],
    ["MoMo", "mobile wallet"],
    ["VNeID", "digital identity"],
    ["Tết", "Lunar New Year"],
    ["xe ôm", "motorcycle taxi"],
    ["quán cơm", "rice eatery"],
    ["ăn chay", "vegetarian eating"],
    ["EVN", "electricity utility"],
    ["phường", "urban ward"],
  ],
  ph: [
    ["QR Ph", "national QR standard"],
    ["GCash", "mobile wallet"],
    ["Maya", "digital wallet and bank"],
    ["eGovPH", "government services app"],
    ["PAGASA", "weather agency"],
    ["jeepney", "public utility vehicle"],
    ["barangay", "local administrative unit"],
    ["sari-sari store", "neighbourhood shop"],
    ["Undas", "All Saints and Souls observance"],
    ["pasalubong", "homecoming gift"],
  ],
};

const calendarExtras = {
  sg: [
    {
      id: "sg-school-terms",
      name: "MOE school terms and vacations",
      type: "school",
      rule: "Refresh annually from MOE",
    },
    {
      id: "sg-iras-window",
      name: "Individual income tax filing window",
      type: "deadline",
      rule: "Refresh annually from IRAS",
    },
    {
      id: "sg-cpf-srs-year-end",
      name: "CPF and SRS year-end planning",
      type: "deadline",
      rule: "Notify before 31 December after policy refresh",
    },
    {
      id: "sg-ramadan",
      name: "Ramadan prayer and meal timings",
      type: "religious",
      rule: "Resolve through MUIS for the active year",
    },
    {
      id: "sg-hungry-ghost",
      name: "Hungry Ghost month",
      type: "cultural",
      rule: "Resolve seventh lunar month",
    },
    {
      id: "sg-ndp-closures",
      name: "NDP rehearsal and event closures",
      type: "cultural",
      rule: "Refresh from LTA and organisers",
    },
    {
      id: "sg-f1-closures",
      name: "Singapore Grand Prix closures",
      type: "cultural",
      rule: "Refresh from LTA and organisers",
    },
  ],
  my: [
    {
      id: "my-school-terms",
      name: "Federal and state school terms",
      type: "school",
      rule: "Refresh by Kumpulan A/B and state",
    },
    {
      id: "my-ramadan",
      name: "Ramadan timings",
      type: "religious",
      rule: "Refresh from JAKIM/state authority",
    },
  ],
  id: [
    {
      id: "id-mudik",
      name: "Lebaran mudik period",
      type: "cultural",
      rule: "Refresh from national transport guidance",
    },
    { id: "id-ramadan", name: "Ramadan timings", type: "religious", rule: "Refresh by city" },
  ],
  th: [
    {
      id: "th-buddhist-days",
      name: "Buddhist holy and alcohol-ban days",
      type: "religious",
      rule: "Refresh annually from Thai authorities",
    },
  ],
  vn: [
    {
      id: "vn-tet-window",
      name: "Tết operating and travel window",
      type: "cultural",
      rule: "Refresh annually",
    },
  ],
  ph: [
    {
      id: "ph-school-calendar",
      name: "DepEd school calendar",
      type: "school",
      rule: "Refresh annually from DepEd",
    },
    {
      id: "ph-typhoon-season",
      name: "Typhoon preparedness season",
      type: "cultural",
      rule: "Use live PAGASA advisories",
    },
  ],
};

const expansion = {
  my: {
    domains: [
      "cuaca",
      "hujan",
      "bas",
      "tren",
      "makan",
      "tempah",
      "cukai",
      "bayar",
      "ingatkan",
      "tukang",
      "klinik",
      "cuti",
      "jalan",
      "sekolah",
      "bank",
      "pasar",
      "surau",
      "lebuhraya",
      "farmasi",
      "doktor",
    ],
    qualifiers: [
      "sekarang",
      "esok",
      "dekat sini",
      "untuk keluarga",
      "murah",
      "halal",
      "hujung minggu",
      "pagi",
      "malam",
      "segera",
    ],
  },
  id: {
    domains: [
      "cuaca",
      "hujan",
      "bus",
      "kereta",
      "makan",
      "pesan",
      "pajak",
      "bayar",
      "ingatkan",
      "tukang",
      "klinik",
      "libur",
      "jalan",
      "sekolah",
      "bank",
      "pasar",
      "masjid",
      "tol",
      "apotek",
      "dokter",
    ],
    qualifiers: [
      "sekarang",
      "besok",
      "dekat sini",
      "untuk keluarga",
      "murah",
      "halal",
      "akhir pekan",
      "pagi",
      "malam",
      "segera",
    ],
  },
  th: {
    domains: [
      "อากาศ",
      "ฝน",
      "รถ",
      "รถไฟ",
      "อาหาร",
      "จอง",
      "ภาษี",
      "จ่าย",
      "เตือน",
      "ช่าง",
      "คลินิก",
      "วันหยุด",
      "ถนน",
      "โรงเรียน",
      "ธนาคาร",
      "ตลาด",
      "มัสยิด",
      "ทางด่วน",
      "ร้านยา",
      "หมอ",
    ],
    qualifiers: [
      "ตอนนี้",
      "พรุ่งนี้",
      "ใกล้ฉัน",
      "สำหรับครอบครัว",
      "ราคาถูก",
      "ฮาลาล",
      "สุดสัปดาห์",
      "ตอนเช้า",
      "ตอนกลางคืน",
      "ด่วน",
    ],
  },
  vn: {
    domains: [
      "thời tiết",
      "mưa",
      "xe buýt",
      "tàu",
      "đồ ăn",
      "đặt lịch",
      "thuế",
      "thanh toán",
      "nhắc",
      "sửa",
      "phòng khám",
      "nghỉ lễ",
      "đường",
      "trường học",
      "ngân hàng",
      "chợ",
      "nhà thờ",
      "cao tốc",
      "nhà thuốc",
      "bác sĩ",
    ],
    qualifiers: [
      "bây giờ",
      "ngày mai",
      "gần đây",
      "cho gia đình",
      "giá rẻ",
      "halal",
      "cuối tuần",
      "buổi sáng",
      "buổi tối",
      "khẩn cấp",
    ],
  },
  ph: {
    domains: [
      "panahon",
      "ulan",
      "sakay",
      "tren",
      "pagkain",
      "booking",
      "buwis",
      "bayad",
      "paalala",
      "ayos",
      "klinika",
      "bakasyon",
      "kalsada",
      "paaralan",
      "bangko",
      "palengke",
      "simbahan",
      "expressway",
      "botika",
      "doktor",
    ],
    qualifiers: [
      "ngayon",
      "bukas",
      "malapit dito",
      "para sa pamilya",
      "mura",
      "halal",
      "weekend",
      "umaga",
      "gabi",
      "kagyat",
    ],
  },
};

function regionalLexicon(code) {
  const entries = regionalSeeds[code].map(([term, normalised]) =>
    entry(term, normalised, "local", [code === "ph" ? "fil" : code === "vn" ? "vi" : code]),
  );
  for (const domain of expansion[code].domains)
    for (const qualifier of expansion[code].qualifiers)
      entries.push(
        entry(`${domain} ${qualifier}`, `${domain}: ${qualifier}`, "phrase", [
          code === "ph" ? "fil" : code === "vn" ? "vi" : code,
        ]),
      );
  return unique(entries);
}

function stubLexicon(code) {
  const words =
    code === "mm"
      ? ["မိုး", "ဘတ်စ်ကား", "အစားအစာ", "ဆေးခန်း", "ငွေပေး", "အားလပ်ရက်", "ကျောင်း", "ဘဏ်", "ဈေး", "ဆရာဝန်"]
      : [
          "ភ្លៀង",
          "ឡានក្រុង",
          "អាហារ",
          "គ្លីនិក",
          "បង់ប្រាក់",
          "ថ្ងៃឈប់សម្រាក",
          "សាលា",
          "ធនាគារ",
          "ផ្សារ",
          "វេជ្ជបណ្ឌិត",
        ];
  return words.map((term, index) =>
    entry(term, `stub-term-${index + 1}`, "stub", [code === "mm" ? "my" : "km"]),
  );
}

function entry(term, normalised, category, languages) {
  return { term, normalised, category, languages };
}
function unique(entries) {
  return [...new Map(entries.map((item) => [item.term.toLocaleLowerCase(), item])).values()];
}

function evalSpecifications() {
  return [
    spec("sg", "en", [
      "weather today",
      "bus status",
      "order food",
      "book appointment",
      "check government tax",
      "prepare PayNow payment",
      "remind me tomorrow",
      "find aircon contractor",
      "clinic doctor hours",
      "school holiday dates",
    ]),
    spec("sg", "singlish", [
      "weather today can or not lah",
      "bus status how leh",
      "order kopi for us lah",
      "book appointment can lah",
      "check CPF can or not lah",
      "prepare PayNow payment lah",
      "remind me tomorrow hor",
      "find aircon contractor leh",
      "clinic doctor hours can lah",
      "school holiday dates lah",
    ]),
    spec("sg", "zh", [
      "查今天的天气",
      "查巴士交通",
      "帮我点咖啡吃的",
      "预约明天时段",
      "查看政府税务",
      "准备PayNow付款",
      "提醒我明天",
      "找空调维修供应商",
      "查诊所医生时间",
      "查看学校假期",
    ]),
    spec("sg", "ms", [
      "semak cuaca hari ini",
      "semak bas sekarang",
      "pesan makan untuk kami",
      "tempah appointment esok",
      "semak cukai kerajaan",
      "sediakan bayar PayNow",
      "ingatkan saya esok",
      "cari tukang aircon",
      "semak klinik doktor",
      "semak cuti sekolah",
    ]),
    spec("sg", "ta", [
      "இன்றைய மழை பார்க்கவும்",
      "பேருந்து நிலை பார்க்கவும்",
      "சாப்பாடு ஆர்டர் செய்யவும்",
      "முன்பதிவு செய்யவும்",
      "அரசு வரி பார்க்கவும்",
      "பணம் செலுத்த தயார்",
      "நினைவூட்டு நாளை",
      "ஒப்பந்தக்காரர் தேடவும்",
      "மருத்துவர் நேரம் பார்க்கவும்",
      "விடுமுறை பார்க்கவும்",
    ]),
    spec("my", "ms", [
      "semak cuaca hari ini",
      "semak bas sekarang",
      "pesan makan untuk kami",
      "tempah appointment esok",
      "semak cukai kerajaan",
      "sediakan bayar DuitNow",
      "ingatkan saya esok",
      "cari tukang aircon",
      "semak klinik doktor",
      "semak cuti sekolah",
    ]),
    spec("my", "en", englishEvalPhrases()),
    spec("my", "zh", [
      "查今天的天气",
      "查巴士交通",
      "帮我点咖啡吃的",
      "预约明天时段",
      "查看政府税务",
      "准备DuitNow付款",
      "提醒我明天",
      "找空调维修供应商",
      "查诊所医生时间",
      "查看学校假期",
    ]),
    spec("my", "ta", [
      "இன்றைய மழை பார்க்கவும்",
      "பேருந்து நிலை பார்க்கவும்",
      "சாப்பாடு ஆர்டர் செய்யவும்",
      "முன்பதிவு செய்யவும்",
      "அரசு வரி பார்க்கவும்",
      "பணம் செலுத்த தயார்",
      "நினைவூட்டு நாளை",
      "ஒப்பந்தக்காரர் தேடவும்",
      "மருத்துவர் நேரம் பார்க்கவும்",
      "விடுமுறை பார்க்கவும்",
    ]),
    spec("id", "id", [
      "cek cuaca hari ini",
      "cek bus sekarang",
      "pesan makan untuk kami",
      "booking appointment besok",
      "cek pajak pemerintah",
      "siapkan bayar QRIS",
      "ingatkan aku besok",
      "cari tukang aircon",
      "cek klinik dokter",
      "cek libur sekolah",
    ]),
    spec("id", "jv", [
      "monggo cek cuaca saiki",
      "monggo cek bus saiki",
      "monggo pesan makan kanggo kulawarga",
      "monggo booking appointment sesuk",
      "monggo cek pajak pemerintah",
      "monggo siapkan bayar QRIS",
      "monggo ingatkan aku sesuk",
      "monggo cari tukang aircon",
      "monggo cek klinik dokter",
      "monggo cek libur sekolah",
    ]),
    spec("id", "en", englishEvalPhrases()),
    spec("th", "th", [
      "เช็กอากาศวันนี้",
      "เช็กรถตอนนี้",
      "สั่งอาหารให้เรา",
      "จองนัดพรุ่งนี้",
      "เช็กภาษีรัฐบาล",
      "เตรียมจ่าย PromptPay",
      "เตือนฉันพรุ่งนี้",
      "หาช่างแอร์",
      "เช็กคลินิกหมอ",
      "เช็กวันหยุดโรงเรียน",
    ]),
    spec("th", "en", englishEvalPhrases()),
    spec("vn", "vi", [
      "xem thời tiết hôm nay",
      "xem xe buýt bây giờ",
      "đặt đồ ăn cho nhà",
      "đặt lịch ngày mai",
      "xem thuế chính phủ",
      "chuẩn bị thanh toán VietQR",
      "nhắc tôi ngày mai",
      "tìm nhà cung cấp sửa máy lạnh",
      "xem phòng khám bác sĩ",
      "xem nghỉ lễ trường học",
    ]),
    spec("vn", "en", englishEvalPhrases()),
    spec("ph", "fil", [
      "tingnan ang panahon ngayon",
      "tingnan ang sakay at trapiko",
      "order ng pagkain",
      "booking ng appointment",
      "tingnan ang buwis ng gobyerno",
      "ihanda ang bayad sa GCash",
      "ipaalala bukas",
      "humanap ng kontratista para sa aircon ayos",
      "oras ng klinika at doktor",
      "school holiday at bakasyon",
    ]),
    spec("ph", "en", englishEvalPhrases()),
  ];
}

function englishEvalPhrases() {
  return [
    "please check today's weather",
    "please check the bus status",
    "please order food for us",
    "please book tomorrow's appointment",
    "please check the government tax",
    "please prepare the payment",
    "please remind me tomorrow",
    "please find an aircon contractor",
    "please check the clinic doctor's hours",
    "please check the school holiday dates",
  ];
}

function spec(locale, language, phrases) {
  return { locale, language, phrases };
}

const intentOrder = [
  "weather.check",
  "transport.status",
  "food.order",
  "booking.create",
  "government.check",
  "payment.prepare",
  "reminder.create",
  "vendor.find",
  "health.check",
  "holiday.check",
];

function buildEval(specification) {
  const rows = [];
  const registers = [
    "peer",
    "elder",
    "child",
    "contractor",
    "official",
    "school",
    "bank",
    "employer",
  ];
  for (let intentIndex = 0; intentIndex < intentOrder.length; intentIndex += 1) {
    for (let variation = 0; variation < 20; variation += 1) {
      const register = registers[variation % registers.length];
      const utterance = `${prefix(specification.language, register)}${specification.phrases[intentIndex]} #${variation + 1}`;
      const expected = {
        intent: intentOrder[intentIndex],
        language: specification.language,
        register,
      };
      rows.push({
        id: `${specification.locale}-${specification.language}-${String(rows.length + 1).padStart(4, "0")}`,
        locale: specification.locale,
        language: specification.language,
        utterance,
        expected,
        provenance: "deterministic-template-v2",
        humanReviewed: false,
      });
    }
  }
  return rows;
}

function prefix(language, register) {
  const prefixes = {
    en: englishPrefixes(),
    singlish: englishPrefixes(),
    zh: {
      peer: "",
      elder: "阿嬷，",
      child: "小朋友，",
      contractor: "师傅，",
      official: "政府官员，",
      school: "老师，",
      bank: "银行职员，",
      employer: "雇主，",
    },
    ms: {
      peer: "",
      elder: "Mak, ",
      child: "Adik, ",
      contractor: "Tukang, ",
      official: "Tuan, secara rasmi ",
      school: "Cikgu, ",
      bank: "Pegawai bank, ",
      employer: "Majikan, ",
    },
    ta: {
      peer: "",
      elder: "அம்மா, ",
      child: "குழந்தை, ",
      contractor: "ஒப்பந்தக்காரர், ",
      official: "அதிகாரி, ",
      school: "ஆசிரியர், ",
      bank: "வங்கி அதிகாரி, ",
      employer: "மனிதவள அதிகாரி, ",
    },
    id: {
      peer: "",
      elder: "Ibu, ",
      child: "Adik, ",
      contractor: "Tukang, ",
      official: "Bapak, secara resmi ",
      school: "Guru, ",
      bank: "Petugas bank, ",
      employer: "HRD, ",
    },
    jv: {
      peer: "",
      elder: "Simbah, ",
      child: "Le, ",
      contractor: "Pak tukang, ",
      official: "Bapak, ",
      school: "Pak guru, ",
      bank: "Petugas bank, ",
      employer: "HRD, ",
    },
    th: {
      peer: "",
      elder: "คุณยาย, ",
      child: "หนู, ",
      contractor: "ช่าง, ",
      official: "เจ้าหน้าที่, ",
      school: "คุณครู, ",
      bank: "เจ้าหน้าที่ธนาคาร, ",
      employer: "ฝ่ายบุคคล, ",
    },
    vi: {
      peer: "",
      elder: "Bà, ",
      child: "Em, ",
      contractor: "Nhà thầu, ",
      official: "Kính gửi cán bộ, ",
      school: "Thầy, ",
      bank: "Nhân viên ngân hàng, ",
      employer: "Phòng nhân sự, ",
    },
    fil: {
      peer: "",
      elder: "Lola, ",
      child: "Anak, ",
      contractor: "Kontratista, ",
      official: "Ginoo, formally ",
      school: "Guro, ",
      bank: "Kawani ng bangko, ",
      employer: "HR, ",
    },
  };
  return prefixes[language][register];
}

function englishPrefixes() {
  return {
    peer: "",
    elder: "Uncle, ",
    child: "Kid, ",
    contractor: "Boss, ",
    official: "Sir, formally ",
    school: "Teacher, ",
    bank: "Bank officer, ",
    employer: "HR, ",
  };
}

async function writeJson(file, value) {
  await writeGeneratedFile(
    file,
    await format(JSON.stringify(value), { ...prettierOptions, filepath: file }),
    "utf8",
  );
}

async function writeGeneratedFile(file, contents, encoding = "utf8") {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await fs.writeFile(file, contents, encoding);
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      // OneDrive briefly locks generated files while syncing; bounded retries keep regeneration atomic.
      if (!new Set(["UNKNOWN", "EBUSY", "EPERM"]).has(code) || attempt === 8) throw error;
      await delay(attempt * 100);
    }
  }
}

const packs = buildPacks();
for (const [code, data] of Object.entries(packs)) await writePack(code, data);
await fs.mkdir(evalRoot, { recursive: true });
for (const specification of evalSpecifications()) {
  const rows = buildEval(specification);
  await writeGeneratedFile(
    path.join(evalRoot, `${specification.locale}-${specification.language}.jsonl`),
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}
process.stdout.write(
  `Generated ${Object.keys(packs).length} locale packs and ${evalSpecifications().length * 200} deterministic eval cases.\n`,
);
