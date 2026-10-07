import type { NpcRow } from '../../types/database'
import { ensureObjectGroups } from './parse'
import { writeNpcProps } from './properties'
import type { NpcObjectProps, TmjMap, TmjMapObject } from './types'

const NPC_MARKER_W = 48
const NPC_MARKER_H = 64

function configJsonFromRow(row: NpcRow): string {
  const config = { ...(row.config ?? {}) } as Record<string, unknown>
  delete config.facing
  delete config.spriteKey
  return JSON.stringify(config)
}

function npcObjectFromRow(map: TmjMap, row: NpcRow): TmjMapObject {
  const id = map.nextobjectid
  map.nextobjectid += 1
  const config = row.config ?? {}
  const facing =
    config.facing === 'up' || config.facing === 'left' || config.facing === 'right'
      ? config.facing
      : 'down'
  const spriteKey = typeof config.spriteKey === 'string' ? config.spriteKey : ''
  const props: NpcObjectProps = {
    npcId: row.id,
    npcType: row.npc_type,
    label: row.label,
    facing,
    spriteKey,
    configJson: configJsonFromRow(row),
  }
  const obj: TmjMapObject = {
    id,
    name: row.id,
    type: 'npc',
    x: Math.round(row.x - NPC_MARKER_W / 2),
    y: Math.round(row.y - NPC_MARKER_H / 2),
    width: NPC_MARKER_W,
    height: NPC_MARKER_H,
  }
  writeNpcProps(obj, props)
  return obj
}

/** Replace TMJ npcs layer from Supabase rows (DB is source of truth on load). */
export function importNpcRowsIntoMap(map: TmjMap, _mapId: string, rows: NpcRow[]): TmjMap {
  const draft: TmjMap = structuredClone(map)
  ensureObjectGroups(draft)
  const objects = rows.map((row) => npcObjectFromRow(draft, row))
  return {
    ...draft,
    layers: draft.layers.map((layer) => {
      if (layer.type !== 'objectgroup' || layer.name !== 'npcs') return layer
      return { ...layer, objects }
    }),
  }
}
