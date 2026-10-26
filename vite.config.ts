import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// One id for the page and the Worker of one build: the first seven
// characters of the commit in CI, else the time of the build. Vite evaluates
// this file once for each environment of a build, so the first evaluation
// keeps the id in the environment of the process, and the others read it.
process.env.TI4_BUILD ||=
  process.env.GITHUB_SHA?.slice(0, 7) || Date.now().toString(36)

// https://vite.dev/config/
// The Cloudflare plugin runs the Worker and its Durable Objects in the dev
// server, and the build writes the Worker next to the client. The unit tests
// have their own configuration in vitest.config.ts, without the plugin.
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: { __BUILD__: JSON.stringify(process.env.TI4_BUILD) },
})
