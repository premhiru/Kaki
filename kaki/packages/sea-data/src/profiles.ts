export type SeaCountry = "my" | "id" | "th" | "vn" | "ph";
export type QrRail = "duitnow" | "qris" | "promptpay" | "vietqr" | "qrph";

export interface CountryProfile {
  readonly country: SeaCountry;
  readonly rail: QrRail;
  readonly currency: string;
  readonly numericCurrency: string;
  readonly countryCode: string;
  readonly weather: string;
  readonly identity: string;
  readonly primaryChannel: string;
  readonly phoneApps: readonly string[];
  readonly holidays: readonly string[];
}

export const COUNTRY_PROFILES: Readonly<Record<SeaCountry, CountryProfile>> = {
  my: {
    country: "my",
    rail: "duitnow",
    currency: "MYR",
    numericCurrency: "458",
    countryCode: "MY",
    weather: "MET Malaysia",
    identity: "MyDigital ID",
    primaryChannel: "whatsapp",
    phoneApps: ["Touch 'n Go", "Grab"],
    holidays: ["Hari Raya", "Chinese New Year", "Deepavali"],
  },
  id: {
    country: "id",
    rail: "qris",
    currency: "IDR",
    numericCurrency: "360",
    countryCode: "ID",
    weather: "BMKG",
    identity: "IKD",
    primaryChannel: "whatsapp",
    phoneApps: ["Gojek", "Tokopedia"],
    holidays: ["Lebaran", "Nyepi"],
  },
  th: {
    country: "th",
    rail: "promptpay",
    currency: "THB",
    numericCurrency: "764",
    countryCode: "TH",
    weather: "TMD",
    identity: "ThaID",
    primaryChannel: "line",
    phoneApps: ["LINE MAN"],
    holidays: ["Songkran", "Buddhist holy days"],
  },
  vn: {
    country: "vn",
    rail: "vietqr",
    currency: "VND",
    numericCurrency: "704",
    countryCode: "VN",
    weather: "NCHMF",
    identity: "VNeID",
    primaryChannel: "zalo",
    phoneApps: ["MoMo", "ZaloPay"],
    holidays: ["Tết"],
  },
  ph: {
    country: "ph",
    rail: "qrph",
    currency: "PHP",
    numericCurrency: "608",
    countryCode: "PH",
    weather: "PAGASA",
    identity: "eGovPH",
    primaryChannel: "messenger",
    phoneApps: ["GCash", "Maya"],
    holidays: ["Holy Week", "Undas"],
  },
};

export function countryForRail(rail: QrRail): SeaCountry {
  return ({ duitnow: "my", qris: "id", promptpay: "th", vietqr: "vn", qrph: "ph" } as const)[rail];
}
