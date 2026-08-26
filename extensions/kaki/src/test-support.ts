import type { KakiRuntimeOwners } from "./contracts.js";

export function createTestOwners(overrides: Partial<KakiRuntimeOwners> = {}): KakiRuntimeOwners {
  const ok = async () => ({ ok: true, message: "Done." });
  return {
    system: {
      snapshot: async () => ({
        householdName: "Tan household",
        operatorName: "Mei",
        paused: false,
        health: { state: "steady", checkedAt: "2026-08-26T00:00:00.000Z" },
        secret: "must-not-project",
      }),
      setPaused: ok,
    },
    household: {
      list: async () => [
        {
          id: "person-1",
          initials: "MT",
          name: "Mei Tan",
          relation: "owner",
          language: "English",
          detail: "Singapore",
          password: "must-not-project",
        },
      ],
      edit: ok,
    },
    approvals: {
      list: async () => [
        {
          id: "approval-1",
          factsHash: "a".repeat(64),
          title: "Fare",
          detail: "Trip to town",
          amount: "S$18",
          evidence: "Prepared route",
          state: "pending",
          rawQr: "must-not-project",
        },
      ],
      decide: ok,
    },
    phone: {
      snapshot: async () => ({
        connected: true,
        name: "Household phone",
        batteryPercent: 75,
        frameUrl: "/api/kaki/phone/frame",
        summary: "Ready",
        qr: "must-not-project",
      }),
      command: ok,
    },
    journeys: {
      list: async () => [
        {
          id: "journey-1",
          time: "08:00",
          title: "School run",
          detail: "On time",
        },
      ],
      create: ok,
      edit: ok,
      delete: ok,
    },
    skills: {
      list: async () => [
        {
          id: "sg.weather-commute",
          source: "maintained",
          instructions: "Check weather.",
        },
      ],
      saveDraft: ok,
      execute: async () => ({ status: "completed" }),
    },
    locale: {
      snapshot: async () => ({
        active: "sg",
        available: ["sg", "my"],
        preview: "Can.",
        currency: "SGD",
        timeZone: "Asia/Singapore",
      }),
      set: ok,
    },
    costs: {
      snapshot: async () => ({
        month: "S$10",
        today: "S$1",
        localShare: "80%",
        budgetRemaining: "S$40",
      }),
    },
    traces: {
      list: async () => [
        {
          id: "trace-1",
          title: "Weather",
          steps: [{ title: "Check", evidence: "NEA" }],
        },
      ],
      position: ok,
    },
    monitors: {
      list: async () => [
        {
          id: "rain",
          title: "Rain",
          detail: "School run",
          status: "clear",
          enabled: true,
        },
      ],
      set: ok,
    },
    channels: { relinkWhatsApp: ok },
    automation: {
      list: async () => [
        {
          id: "cron-1",
          title: "School rain",
          status: "active",
          nextRun: "07:00",
        },
      ],
    },
    ...overrides,
  };
}

export const validPluginConfig = {
  householdProfileId: "household-1",
  operatorPersonId: "person-1",
  addressBookProfileId: "addresses-1",
  approvalPolicyProfileId: "approvals-1",
  dataProfileId: "data-1",
  phoneNodeId: "phone-1",
  whatsappAccountId: "whatsapp-1",
  telegramAccountId: "telegram-1",
  modelProfileId: "models-1",
  asrProfileId: "asr-1",
  locale: "sg",
} as const;
