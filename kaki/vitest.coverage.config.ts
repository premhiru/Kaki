import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { sharedVitestConfig } from "../test/vitest/vitest.shared.config.ts";

const root = resolve(import.meta.dirname, "..");
const kakiPackageAliases = [
  "approval-node",
  "browser-node",
  "channels",
  "channels-extra",
  "core",
  "locale",
  "memory",
  "models",
  "phone-node",
  "sea-data",
  "security",
  "sg-data",
  "skills",
].map((packageName) => ({
  find: new RegExp(`^@kaki/${packageName}$`, "u"),
  replacement: resolve(root, "kaki", "packages", packageName, "src", "index.ts"),
}));

const controlUiAliases = [
  {
    find: "next/font/google",
    replacement: resolve(root, "kaki/apps/control-ui/tests/stubs/next-font.ts"),
  },
  {
    find: "next/headers",
    replacement: resolve(root, "kaki/apps/control-ui/tests/stubs/next-headers.ts"),
  },
];

export default defineConfig({
  ...sharedVitestConfig,
  root,
  resolve: {
    ...sharedVitestConfig.resolve,
    alias: [
      ...(sharedVitestConfig.resolve?.alias ?? []),
      ...kakiPackageAliases,
      ...controlUiAliases,
    ],
  },
  test: {
    ...sharedVitestConfig.test,
    environment: "node",
    include: [
      "extensions/kaki/**/*.test.ts",
      "kaki/apps/control-ui/tests/**/*.ui.test.tsx",
      "kaki/evals/**/*.test.ts",
      "kaki/packages/approval-node/test/**/*.test.ts",
      "kaki/packages/browser-node/test/**/*.test.ts",
      "kaki/packages/channels/test/**/*.test.ts",
      "kaki/packages/channels-extra/test/**/*.test.ts",
      "kaki/packages/locale/test/**/*.test.ts",
      "kaki/packages/models/test/**/*.test.ts",
      "kaki/packages/phone-node/test/**/*.test.ts",
      "kaki/packages/sea-data/test/**/*.test.ts",
      "kaki/packages/security/test/**/*.test.ts",
      "kaki/packages/sg-data/test/**/*.test.ts",
      "kaki/packages/skills/test/**/*.test.ts",
      "kaki/scripts/**/*.test.ts",
    ],
    setupFiles: [
      resolve(root, "test/setup.ts"),
      resolve(root, "test/setup.extensions.ts"),
      resolve(root, "test/setup-openclaw-runtime.ts"),
    ],
    coverage: {
      provider: "v8",
      include: [
        // These are the hand-authored runtime owners. Generated one-line skill wrappers are
        // independently covered by generate:check plus the every-skill fixture replay.
        "extensions/kaki/**/*.ts",
        "kaki/apps/control-ui/app/**/*.{ts,tsx}",
        "kaki/evals/**/*.ts",
        "kaki/packages/approval-node/src/**/*.ts",
        "kaki/packages/browser-node/src/**/*.ts",
        "kaki/packages/channels/src/**/*.ts",
        "kaki/packages/channels-extra/src/**/*.ts",
        "kaki/packages/locale/src/**/*.ts",
        "kaki/packages/models/src/**/*.ts",
        "kaki/packages/phone-node/src/**/*.ts",
        "kaki/packages/sea-data/src/**/*.ts",
        "kaki/packages/security/src/**/*.ts",
        "kaki/packages/sg-data/src/**/*.ts",
        "kaki/packages/skills/src/**/*.ts",
        "kaki/scripts/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/test-support.ts",
        // The Gateway client has its own native V8 threshold and would otherwise appear as
        // uncovered because its boundary tests intentionally use node:test, not Vitest.
        "kaki/apps/control-ui/app/gateway.ts",
        "**/dist/**",
        "**/node_modules/**",
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: resolve(root, ".artifacts/kaki-coverage/vitest"),
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
