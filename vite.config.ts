/// <reference types="vitest/config" />
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // The Cloudflare plugin runs the Worker and the game server object in
  // `npm run dev`, and builds them. Unit tests do not need it.
  plugins: process.env.VITEST ? [react()] : [react(), cloudflare()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
