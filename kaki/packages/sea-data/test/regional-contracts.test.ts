import { describe, expect, it } from "vitest";
import { validatePrayerSchedule, validateRegionalHoliday } from "../src/index.js";

describe("regional calendar contracts", () => {
  it("validates authority, date, time, subdivision, and source", () => {
    expect(
      validatePrayerSchedule({
        country: "my",
        authority: "JAKIM",
        zone: "WLY01",
        date: "2026-08-26",
        timezone: "Asia/Kuala_Lumpur",
        fajr: "06:01:00",
        sunrise: "07:09:00",
        dhuhr: "13:18:00",
        asr: "16:29:00",
        maghrib: "19:23:00",
        isha: "20:33:00",
        sourceUrl: "https://www.e-solat.gov.my/",
      }),
    ).toMatchObject({ zone: "WLY01" });
    expect(
      validateRegionalHoliday({
        country: "my",
        subdivision: "Johor",
        date: "2026-08-31",
        localName: "Hari Kebangsaan",
        nationwide: true,
        status: "gazetted",
        authority: "Malaysia Cabinet Division",
        sourceUrl: "https://www.kabinet.gov.my/hari-kelepasan-am/",
      }),
    ).toMatchObject({ status: "gazetted" });
  });

  it("rejects malformed calendar facts before they reach an agent", () => {
    expect(() =>
      validatePrayerSchedule({
        country: "my",
        authority: "JAKIM",
        zone: "WLY01",
        date: "tomorrow",
        timezone: "Asia/Kuala_Lumpur",
        fajr: "06:01",
        sunrise: "07:09",
        dhuhr: "13:18",
        asr: "16:29",
        maghrib: "19:23",
        isha: "20:33",
        sourceUrl: "https://www.e-solat.gov.my/",
      }),
    ).toThrow("invalid-regional-prayer-schedule");
    expect(() =>
      validateRegionalHoliday({
        country: "th",
        date: "2026-08-26",
        localName: "fixture",
        nationwide: true,
        status: "tentative",
        authority: "fixture",
        sourceUrl: "https://user:secret@example.com/holiday",
      }),
    ).toThrow("invalid-regional-holiday");
  });
});
