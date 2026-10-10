/**
 * Copies content/ro/items.json into server + Supabase edge validation bundles.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(repoRoot, 'content/ro/items.json')
const targets = [
  path.join(repoRoot, 'server/src/shared/ro/items.json'),
  path.join(repoRoot, 'supabase/functions/_shared/ro/items.json'),
]

const checkOnly = process.argv.includes('--check')
const raw = await fs.readFile(source, 'utf8')
JSON.parse(raw)

if (checkOnly) {
  for (const target of targets) {
    let existing = ''
    try {
      existing = await fs.readFile(target, 'utf8')
    } catch {
      console.error('[items:check] missing', target)
      process.exit(1)
    }
    if (existing !== raw) {
      console.error('[items:check] out of date:', target)
      console.error('Run: npm run content:sync-items')
      process.exit(1)
    }
  }
  console.log('[items:check] ok')
  process.exit(0)
}

for (const target of targets) {
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, raw)
  console.log('wrote', path.relative(repoRoot, target))
}
