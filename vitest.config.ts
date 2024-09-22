import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 98,
        lines: 95
      }
    },
  }
})