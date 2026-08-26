import { describe, expect, it, vi } from "vitest";
import manifest from "./openclaw.plugin.json" with { type: "json" };
import { KAKI_CONTROL_COMMANDS } from "./src/commands.js";
import { KakiRuntimeOwnerRegistry } from "./src/owner-registry.js";
import { createKakiPlugin } from "./src/plugin.js";
import { createTestOwners, validPluginConfig } from "./src/test-support.js";

function registerPlugin() {
  const registry = new KakiRuntimeOwnerRegistry();
  registry.install({
    householdProfileId: "household-1",
    owners: createTestOwners(),
  });
  const routes: Array<Record<string, unknown>> = [];
  const commands: Array<Record<string, unknown>> = [];
  const services: Array<Record<string, unknown>> = [];
  const cli: Array<Record<string, unknown>> = [];
  const tools: Array<Record<string, unknown>> = [];
  const controls: Array<Record<string, unknown>> = [];
  createKakiPlugin({ registry }).register({
    pluginConfig: validPluginConfig,
    logger: { warn: vi.fn() },
    registerHttpRoute(route) {
      routes.push(route as unknown as Record<string, unknown>);
    },
    registerCommand(command) {
      commands.push(command as unknown as Record<string, unknown>);
    },
    registerService(service) {
      services.push(service as unknown as Record<string, unknown>);
    },
    registerCli(_registrar, options) {
      cli.push(options as unknown as Record<string, unknown>);
    },
    registerTool(_factory, options) {
      tools.push(options as unknown as Record<string, unknown>);
    },
    session: {
      controls: {
        registerControlUiDescriptor(descriptor) {
          controls.push(descriptor as unknown as Record<string, unknown>);
        },
      },
    },
  } as never);
  return { routes, commands, services, cli, tools, controls };
}

describe("Kaki plugin entry", () => {
  it("is opt-in and requires the complete non-secret onboarding reference contract", () => {
    expect(manifest.enabledByDefault).toBe(false);
    expect(manifest.activation.onStartup).toBe(false);
    expect(manifest.activation.onConfigPaths).toEqual(["plugins.entries.kaki"]);
    expect(manifest.configSchema.additionalProperties).toBe(false);
    expect(new Set(manifest.configSchema.required)).toEqual(
      new Set([
        "householdProfileId",
        "operatorPersonId",
        "addressBookProfileId",
        "approvalPolicyProfileId",
        "dataProfileId",
        "phoneNodeId",
        "whatsappAccountId",
        "telegramAccountId",
        "modelProfileId",
        "asrProfileId",
        "locale",
      ]),
    );
  });

  it("registers exact Gateway-authenticated control routes", () => {
    const { routes, services, cli, tools, controls } = registerPlugin();
    expect(services).toEqual([]);
    expect(routes).toHaveLength(3);
    expect(
      routes.map(({ path, auth, match, gatewayRuntimeScopeSurface }) => ({
        path,
        auth,
        match,
        gatewayRuntimeScopeSurface,
      })),
    ).toEqual([
      {
        path: "/api/kaki/snapshot",
        auth: "gateway",
        match: "exact",
        gatewayRuntimeScopeSurface: "trusted-operator",
      },
      {
        path: "/api/kaki/action",
        auth: "gateway",
        match: "exact",
        gatewayRuntimeScopeSurface: "trusted-operator",
      },
      {
        path: "/plugins/kaki/control",
        auth: "gateway",
        match: "prefix",
        gatewayRuntimeScopeSurface: "trusted-operator",
      },
    ]);
    expect(cli[0]?.descriptors).toEqual([
      expect.objectContaining({ name: "kaki-bootstrap", machineOutput: expect.any(Function) }),
    ]);
    expect(tools).toEqual([expect.objectContaining({ name: "kaki_skill", optional: true })]);
    expect(controls).toEqual([
      expect.objectContaining({
        id: "kaki",
        path: "/plugins/kaki/control",
        requiredScopes: ["operator.write"],
      }),
    ]);
  });

  it("enumerates every required control command without shadowing host status or approvals", () => {
    expect(KAKI_CONTROL_COMMANDS.map((entry) => entry.invocation)).toEqual([
      "/status",
      "/approve",
      "/deny",
      "/relink-wa",
      "/journey",
      "/household",
      "/phone",
      "/skills",
      "/cron",
      "/locale",
      "/pause",
      "/resume",
      "/cost",
    ]);
    const { commands } = registerPlugin();
    expect(commands.map((entry) => entry.name)).toEqual(
      KAKI_CONTROL_COMMANDS.filter((entry) => entry.owner === "kaki").map((entry) =>
        entry.invocation.slice(1),
      ),
    );
    expect(commands.every((entry) => entry.requireAuth === true)).toBe(true);
    expect(commands.every((entry) => entry.exposeSenderIsOwner === true)).toBe(true);
    expect(commands.every((entry) => JSON.stringify(entry.channels) === '["telegram"]')).toBe(true);
  });
});
