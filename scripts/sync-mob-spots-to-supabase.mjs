/**
 * Copies content/ro/maps.json → mobSpots into supabase/functions/_shared/ro/mobSpots.json
 * for combat-report spawn validation. Run after editing mob spots in maps.json or map admin.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mapsJsonPath = path.join(repoRoot, 'content/ro/maps.json')
const outPath = path.join(repoRoot, 'supabase/functions/_shared/ro/mobSpots.json')

const checkOnly = process.argv.includes('--check')

const mapsJson = JSON.parse(await fs.readFile(mapsJsonPath, 'utf8'))
const mobSpots = mapsJson.mobSpots ?? {}
const serialized = `${JSON.stringify(mobSpots, null, 2)}\n`

if (checkOnly) {
  let existing = '{}'
  try {
    existing = await fs.readFile(outPath, 'utf8')
  } catch {
    console.error('[mob-spots:check] missing', outPath)
    process.exit(1)
  }
  const norm = (s) => JSON.stringify(JSON.parse(s))
  if (norm(existing) !== norm(serialized)) {
    console.error(
      '[mob-spots:check] supabase mobSpots.json is out of date. Run: npm run content:sync-mob-spots',
    )
    process.exit(1)
  }
  console.log('[mob-spots:check] OK')
  process.exit(0)
}

await fs.writeFile(outPath, serialized, 'utf8')
console.log(`[mob-spots:sync] wrote ${Object.keys(mobSpots).length} map(s) → ${path.relative(repoRoot, outPath)}`)
