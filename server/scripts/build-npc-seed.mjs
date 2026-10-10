import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migrationsDir = path.join(repoRoot, 'supabase/migrations')
const outFile = path.join(repoRoot, 'server/prisma/data/npcs.json')

const npcs = new Map()

function parseConfig(raw) {
  const trimmed = raw.trim()
  if (trimmed.startsWith("'") && trimmed.endsWith("'::jsonb")) {
    return JSON.parse(trimmed.slice(1, -8))
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    try {
      return JSON.parse(trimmed.slice(1, -1))
    } catch {
      return {}
    }
  }
  return {}
}

function ingestInsert(sql) {
  const re =
    /insert\s+into\s+public\.npc_definitions\s*\([^)]+\)\s*values\s*([\s\S]*?)(?:on\s+conflict|;)/gi
  let m
  while ((m = re.exec(sql))) {
    const block = m[1]
    const tupleRe =
      /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*'([^']+)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*('(?:[^'\\]|\\.|'')*'|'\{[\s\S]*?\}'::jsonb)\s*\)/g
    let t
    while ((t = tupleRe.exec(block))) {
      const [, id, mapId, x, y, npcType, label, configRaw] = t
      npcs.set(id, {
        id,
        map_id: mapId,
        x: Number(x),
        y: Number(y),
        npc_type: npcType,
        label: label.replace(/''/g, "'"),
        config: parseConfig(configRaw),
      })
    }
  }
}

for (const file of fs.readdirSync(migrationsDir).sort()) {
  if (!file.endsWith('.sql')) continue
  ingestInsert(fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify([...npcs.values()], null, 2))
console.log(`Wrote ${npcs.size} NPCs to ${outFile}`)
