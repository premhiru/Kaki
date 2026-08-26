import type { OpenClawPluginServiceContext } from "openclaw/plugin-sdk/core";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createKakiControlCommands } from "./commands.js";
import { parseKakiPluginConfig, type KakiPluginConfig } from "./config.js";
import type { KakiRuntimeOwners } from "./contracts.js";
import { createKakiControlUiAssetHandler, KAKI_CONTROL_UI_PATH } from "./control-ui-assets.js";
import { createHostBackedKakiOwners } from "./host-owners.js";
import { createKakiHttpHandlers } from "./http.js";
import { registerKakiOnboardingCli } from "./onboarding-cli.js";
import { KakiRuntimeOwnerRegistry, resolveInstalledKakiRuntimeOwners } from "./owner-registry.js";
import { createKakiSkillTool } from "./skill-tool.js";

export function createKakiPlugin(
  options: {
    registry?: KakiRuntimeOwnerRegistry;
    ownerFactory?: (
      context: OpenClawPluginServiceContext,
      config: KakiPluginConfig,
    ) => KakiRuntimeOwners | Promise<KakiRuntimeOwners>;
  } = {},
) {
  return definePluginEntry({
    id: "kaki",
    name: "Kaki",
    description: "Authenticated household control routes and operator commands for Kaki.",
    register(api) {
      api.registerCli(async ({ program }) => registerKakiOnboardingCli(program, api), {
        descriptors: [
          {
            name: "kaki-bootstrap",
            description: "Provision validated encrypted Kaki onboarding state",
            hasSubcommands: true,
            machineOutput: () => true,
          },
        ],
      });
      const config = parseKakiPluginConfig(api.pluginConfig);
      const registry = options.registry ?? new KakiRuntimeOwnerRegistry();
      if (config && (options.ownerFactory || !options.registry)) {
        const ownerFactory =
          options.ownerFactory ??
          ((context: OpenClawPluginServiceContext) =>
            createHostBackedKakiOwners(api.runtime, config, api.session.workflow));
        let release: (() => void) | undefined;
        api.registerService({
          id: "kaki-runtime-owners",
          async start(context) {
            const owners = await ownerFactory(context, config);
            release = registry.install({
              householdProfileId: config.householdProfileId,
              owners,
            }).release;
          },
          stop() {
            release?.();
            release = undefined;
          },
        });
      }
      const resolveOwners = () =>
        config
          ? (registry.current(config.householdProfileId) ??
            resolveInstalledKakiRuntimeOwners(config.householdProfileId))
          : undefined;
      api.registerTool((context) => createKakiSkillTool(context, resolveOwners), {
        name: "kaki_skill",
        optional: true,
      });
      const handlers = createKakiHttpHandlers({
        resolveOwners,
        operatorPersonId: config?.operatorPersonId,
        warn: (message) => api.logger.warn?.(message),
      });
      api.registerHttpRoute({
        path: "/api/kaki/snapshot",
        auth: "gateway",
        match: "exact",
        gatewayRuntimeScopeSurface: "trusted-operator",
        handler: handlers.snapshot,
      });
      api.registerHttpRoute({
        path: "/api/kaki/action",
        auth: "gateway",
        match: "exact",
        gatewayRuntimeScopeSurface: "trusted-operator",
        handler: handlers.action,
      });
      api.registerHttpRoute({
        path: KAKI_CONTROL_UI_PATH,
        auth: "gateway",
        match: "prefix",
        gatewayRuntimeScopeSurface: "trusted-operator",
        handler: createKakiControlUiAssetHandler(),
      });
      api.session.controls.registerControlUiDescriptor({
        surface: "tab",
        id: "kaki",
        label: "Kaki",
        description: "Household control, approvals, phone, journeys, skills, and monitors.",
        icon: "house",
        group: "control",
        order: 20,
        path: KAKI_CONTROL_UI_PATH,
        requiredScopes: ["operator.write"],
      });
      for (const controlCommand of createKakiControlCommands(
        resolveOwners,
        config?.operatorPersonId,
      )) {
        api.registerCommand(controlCommand);
      }
    },
  });
}
