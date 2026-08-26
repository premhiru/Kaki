import { describe, expect, it } from "vitest";
import { readBoundedJsonInput, registerKakiOnboardingCli } from "./onboarding-cli.js";
import { parseKakiOnboardingInput } from "./onboarding-state.js";

const secretRef = (id: string) => ({ source: "env", provider: "default", id }) as const;
const validInput = {
  config: {
    householdProfileId: "household-fixture",
    operatorPersonId: "person-fixture",
    addressBookProfileId: "address-fixture",
    approvalPolicyProfileId: "approval-fixture",
    dataProfileId: "data-fixture",
    phoneNodeId: "phone-fixture",
    whatsappAccountId: "assistant",
    telegramAccountId: "control",
    modelProfileId: "model-fixture",
    asrProfileId: "asr-fixture",
    locale: "sg",
  },
  householdName: "Fixture Household",
  operatorName: "Fixture Operator",
  members: [
    {
      id: "person-fixture",
      name: "Fixture Operator",
      relation: "self",
      languages: ["English"],
      register: "casual",
      dietary: [],
      commute: ["MRT"],
    },
  ],
  addresses: [
    {
      id: "home",
      label: "home",
      oneMapSearchValue: "1 Fusionopolis Place, Singapore 138522",
      postalCode: "138522",
      latitude: 1.2996,
      longitude: 103.7874,
    },
  ],
  approvalAutoCap: 30,
  approvalCurrency: "SGD",
  monthlyModelBudgetUsd: 1,
  monitorSessionKey: "agent:main:main",
  secretRefs: {
    householdMemoryKey: secretRef("KAKI_MEMORY_KEY"),
    model: secretRef("OPENAI_API_KEY"),
    ltaDataMall: secretRef("KAKI_LTA_KEY"),
    oneMap: secretRef("KAKI_ONEMAP_KEY"),
    phonePairing: secretRef("KAKI_PHONE_KEY"),
  },
} as const;

describe("Kaki onboarding boundary", () => {
  it("accepts a complete profile containing only opaque secret references", () => {
    expect(parseKakiOnboardingInput(validInput)).toEqual(validInput);
  });

  it("rejects plaintext secret values", () => {
    expect(() =>
      parseKakiOnboardingInput({
        ...validInput,
        secretRefs: { ...validInput.secretRefs, model: "plaintext-provider-key" },
      }),
    ).toThrow("kaki-onboard-model-ref-invalid");
  });

  it("rejects an oversized stdin stream before reading later chunks", async () => {
    let yieldedLaterChunk = false;
    async function* hostileInput() {
      yield Buffer.alloc(1024 * 1024 + 1, 0x20);
      yieldedLaterChunk = true;
      yield "{}";
    }

    await expect(readBoundedJsonInput(hostileInput())).rejects.toThrow(
      "kaki-onboard-input-too-large",
    );
    expect(yieldedLaterChunk).toBe(false);
  });

  it("reads a complete JSON document across string and byte chunks", async () => {
    async function* chunks() {
      yield '{"ready":';
      yield Buffer.from("true}");
    }
    await expect(readBoundedJsonInput(chunks())).resolves.toEqual({ ready: true });
    await expect(
      readBoundedJsonInput(
        (async function* () {
          yield "{";
        })(),
      ),
    ).rejects.toThrow();
  });

  it.each([
    ["closed root", { ...validInput, extra: true }],
    ["invalid config", { ...validInput, config: { ...validInput.config, locale: "xx" } }],
    ["missing members", { ...validInput, members: [] }],
    ["too many members", { ...validInput, members: Array(101).fill(validInput.members[0]) }],
    ["missing addresses", { ...validInput, addresses: [] }],
    ["too many addresses", { ...validInput, addresses: Array(33).fill(validInput.addresses[0]) }],
    [
      "invalid secret map",
      { ...validInput, secretRefs: { ...validInput.secretRefs, extra: secretRef("EXTRA") } },
    ],
    ["operator absent", { ...validInput, members: [{ ...validInput.members[0], id: "other" }] }],
    ["empty household", { ...validInput, householdName: " " }],
    ["member keys", { ...validInput, members: [{ ...validInput.members[0], extra: true }] }],
    ["member languages", { ...validInput, members: [{ ...validInput.members[0], languages: [] }] }],
    [
      "address label",
      { ...validInput, addresses: [{ ...validInput.addresses[0], label: "other" }] },
    ],
    ["address keys", { ...validInput, addresses: [{ ...validInput.addresses[0], extra: true }] }],
    [
      "address latitude",
      { ...validInput, addresses: [{ ...validInput.addresses[0], latitude: 91 }] },
    ],
    ["approval cap", { ...validInput, approvalAutoCap: -1 }],
    ["model budget", { ...validInput, monthlyModelBudgetUsd: 0 }],
    [
      "secret source",
      {
        ...validInput,
        secretRefs: {
          ...validInput.secretRefs,
          model: { source: "plain", provider: "default", id: "KEY" },
        },
      },
    ],
    [
      "secret provider",
      {
        ...validInput,
        secretRefs: {
          ...validInput.secretRefs,
          model: { source: "env", provider: " ", id: "KEY" },
        },
      },
    ],
  ])("rejects %s onboarding state at its owning parser", (_name, value) => {
    expect(() => parseKakiOnboardingInput(value)).toThrow();
  });

  it("registers the stdin-only provisioning contract and rejects other ingress", async () => {
    let action: ((options: { stdin: boolean; json?: boolean }) => Promise<void>) | undefined;
    const command = {
      command: () => command,
      description: () => command,
      requiredOption: () => command,
      option: () => command,
      action: (handler: typeof action) => {
        action = handler;
        return command;
      },
    };
    registerKakiOnboardingCli(command as never, { runtime: {}, config: {} } as never);
    expect(action).toBeDefined();
    await expect(action!({ stdin: false })).rejects.toThrow("kaki-onboard-stdin-required");
  });
});
