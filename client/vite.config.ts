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
  resolve: {
    alias: {
      '@ro-content': path.resolve(clientDir, '../content/ro'),
    },
  },
})
