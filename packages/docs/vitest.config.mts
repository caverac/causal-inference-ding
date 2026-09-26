import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // The same alias Docusaurus defines, so modules import each other alike
    // under test and on the site.
    alias: { '@site': import.meta.dirname }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
})
