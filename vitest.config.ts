import { defineConfig } from 'vitest/config'

// The unit tests of src/model/ run in Node. They need neither React nor the
// Cloudflare plugin of vite.config.ts.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
