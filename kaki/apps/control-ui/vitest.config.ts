import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "next/font/google": resolve(import.meta.dirname, "tests/stubs/next-font.ts"),
      "next/headers": resolve(import.meta.dirname, "tests/stubs/next-headers.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.ui.test.tsx"],
    pool: "threads",
  },
});
