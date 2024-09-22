import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
      }
    }
  }
});
