import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mapAdminApiPlugin } from './vite-plugins/mapAdminApi.js'

const clientDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(clientDir, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mapAdminApiPlugin(repoRoot)],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
    },
  },
  resolve: {
    alias: {
      '@ro-content': path.resolve(clientDir, '../content/ro'),
    },
  },
})
