import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      pretendToBeVisual: true
    },
    exclude: ['**/node_modules/**'],
    coverage: {
      reporter: ['text', 'json-summary', 'json']
    }
  }
})
