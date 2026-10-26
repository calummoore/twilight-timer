import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// The Cloudflare plugin runs the Worker and its Durable Objects in the dev
// server, and the build writes the Worker next to the client. The unit tests
// have their own configuration in vitest.config.ts, without the plugin.
export default defineConfig({
  plugins: [react(), cloudflare()],
})
