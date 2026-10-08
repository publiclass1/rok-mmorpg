/**
 * Regenerates Prontera Field 01 — open novice training field with weak mobs.
 * Writes client/public/maps/prt_fild01.tmj and patches content/ro/maps.json mobSpots.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const TMJ_PATH = path.join(ROOT, 'client/public/maps/prt_fild01.tmj')
const MAPS_JSON_PATH = path.join(ROOT, 'content/ro/maps.json')
const SEED_SQL_PATH = path.join(ROOT, 'supabase/seed/custom_maps/prt_fild01.sql')

const MAP_ID = 'prt_fild01'
const W = 60
const H = 50
const TILE = 32

/** Where Prontera Warp Agent sends players (pixels, feet). */
const ENTRY = { x: 480, y: 320 }
/** Return warp NPC anchor (south path). */
const RETURN_WARP = { x: 480, y: (H - 2) * TILE }
const KAFRA = { x: 400, y: 400 }

/** @returns {string[][]} */
function buildFieldGrid() {
  const grid = Array.from({ length: H }, () => Array(W).fill('G'))
  for (let x = 0; x < W; x++) {
    grid[0][x] = 'W'
    grid[H - 1][x] = 'W'
  }
  for (let y = 1; y < H - 1; y++) {
    grid[y][0] = 'W'
    grid[y][W - 1] = 'W'
  }

  const rockRects = [
    { x0: 8, y0: 6, w: 3, h: 2 },
    { x0: 28, y0: 8, w: 2, h: 3 },
    { x0: 6, y0: 20, w: 3, h: 2 },
    { x0: 30, y0: 18, w: 2, h: 3 },
    { x0: 18, y0: 22, w: 4, h: 2 },
  ]
  for (const { x0, y0, w, h } of rockRects) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x0 + dx
        const ty = y0 + dy
        if (grid[ty]?.[tx] === 'G') grid[ty][tx] = 'W'
      }
    }
  }

  const etx = Math.floor(ENTRY.x / TILE)
  const ety = Math.floor(ENTRY.y / TILE)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = etx + dx
      const ty = ety + dy
      if (grid[ty]?.[tx] === 'W') grid[ty][tx] = 'G'
    }
  }

  return grid
}

function groundGid(x, y) {
  return (x + y) % 2 === 0 ? 2 : 3
}

function buildLayers(grid) {
  const ground = []
  const collision = []
  const walkable = []

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x]
      const wall = ch === 'W'
      ground.push(wall ? 1 : groundGid(x, y))
      collision.push(wall ? 1 : 0)
      if (!wall) {
        walkable.push({ tileX: x, tileY: y, px: x * TILE + 16, py: y * TILE + 16 })
      }
    }
  }
  return { ground, collision, walkable }
}

function distSq(ax, ay, bx, by) {
  return (ax - bx) ** 2 + (ay - by) ** 2
}

function buildMobSpotDefs(walkable) {
  const minDistEntry = 140 ** 2
  const minDistWarp = 120 ** 2
  const pool = walkable.filter(
    (c) =>
      distSq(c.px, c.py, ENTRY.x, ENTRY.y) > minDistEntry &&
      distSq(c.px, c.py, RETURN_WARP.x, RETURN_WARP.y) > minDistWarp,
  )

  const mobPlan = [
    { defId: 'small_poring', n: 24 },
    { defId: 'poring', n: 12 },
    { defId: 'small_poring', n: 6 },
  ]

  const spots = []
  let poolIdx = 0
  const step = Math.max(1, Math.floor(pool.length / mobPlan.reduce((s, m) => s + m.n, 0)))

  let spotIndex = 0
  for (const { defId, n } of mobPlan) {
    for (let i = 0; i < n; i++) {
      const cell = pool[poolIdx % pool.length]
      poolIdx += step
      const x = cell.tileX * TILE
      const y = cell.tileY * TILE
      spots.push({
        id: `${MAP_ID}_spot_${spotIndex}`,
        x,
        y,
        width: 32,
        height: 32,
        defId,
        count: 1,
        spawnsPerMinute: 10,
        canLure: true,
        lureRadius: 48,
      })
      spotIndex += 1
    }
  }
  return spots
}

function buildObstacles(grid) {
  const objects = []
  let id = 1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] !== 'W') continue
      const left = x > 0 && grid[y][x - 1] === 'G'
      const right = x < W - 1 && grid[y][x + 1] === 'G'
      const up = y > 0 && grid[y - 1][x] === 'G'
      const down = y < H - 1 && grid[y + 1][x] === 'G'
      if (!(left || right || up || down)) continue
      objects.push({
        id: id++,
        name: `obstacle_${id}`,
        type: 'obstacle',
        x: x * TILE,
        y: y * TILE,
        width: TILE,
        height: TILE,
      })
    }
  }
  return objects
}

function decorTrees() {
  const trees = []
  let id = 100
  const placements = [
    { assetId: 'tree', x: 96, y: 96 },
    { assetId: 'tree_oak', x: 1088, y: 128 },
    { assetId: 'tree_pine', x: 1120, y: 736 },
    { assetId: 'tree', x: 128, y: 768 },
    { assetId: 'bush', x: 320, y: 160 },
    { assetId: 'bush', x: 896, y: 192 },
    { assetId: 'bush', x: 256, y: 640 },
    { assetId: 'bush', x: 960, y: 640 },
  ]
  for (const p of placements) {
    trees.push({
      id: id++,
      name: p.assetId,
      type: 'decor',
      x: p.x,
      y: p.y,
      width: 128,
      height: 128,
      properties: [{ name: 'assetId', type: 'string', value: p.assetId }],
    })
  }
  return trees
}

function mobSpotTmjObject(spot, objectId) {
  return {
    id: objectId,
    name: spot.id,
    type: 'mob_spot',
    x: spot.x,
    y: spot.y,
    width: spot.width,
    height: spot.height,
    properties: [
      { name: 'spotId', type: 'string', value: spot.id },
      { name: 'defId', type: 'string', value: spot.defId },
      { name: 'count', type: 'float', value: spot.count },
      { name: 'spawnsPerMinute', type: 'float', value: spot.spawnsPerMinute },
      { name: 'canLure', type: 'bool', value: spot.canLure },
      { name: 'lureRadius', type: 'float', value: spot.lureRadius },
    ],
  }
}

function npcObject(id, npcId, npcType, label, x, y, configJson) {
  return {
    id,
    name: npcId,
    type: 'npc',
    x,
    y,
    width: 48,
    height: 64,
    properties: [
      { name: 'npcId', type: 'string', value: npcId },
      { name: 'npcType', type: 'string', value: npcType },
      { name: 'label', type: 'string', value: label },
      { name: 'facing', type: 'string', value: 'down' },
      { name: 'spriteKey', type: 'string', value: '' },
      { name: 'configJson', type: 'string', value: JSON.stringify(configJson) },
    ],
  }
}

function buildTmj(layers, mobSpots, obstacles, decor, npcs) {
  let nextId = 1
  const mobObjects = mobSpots.map((s) => mobSpotTmjObject(s, nextId++))

  return {
    compressionlevel: -1,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TILE,
    tilewidth: TILE,
    type: 'map',
    version: '1.10',
    width: W,
    height: H,
    tilesets: [
      {
        columns: 4,
        firstgid: 1,
        image: 'tiles.png',
        imagewidth: 128,
        imageheight: 32,
        margin: 0,
        name: 'tiles',
        spacing: 0,
        tilecount: 4,
        tileheight: TILE,
        tilewidth: TILE,
      },
    ],
    nextlayerid: 9,
    nextobjectid: nextId + 20,
    layers: [
      {
        data: layers.ground,
        height: H,
        id: 1,
        name: 'ground',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width: W,
        x: 0,
        y: 0,
      },
      {
        data: layers.collision,
        height: H,
        id: 2,
        name: 'collision',
        opacity: 1,
        type: 'tilelayer',
        visible: false,
        width: W,
        x: 0,
        y: 0,
      },
      {
        id: 4,
        name: 'obstacles',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: obstacles,
      },
      {
        id: 5,
        name: 'portals',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
      {
        id: 6,
        name: 'decor',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: decor,
      },
      {
        id: 7,
        name: 'npcs',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: npcs,
      },
      {
        id: 8,
        name: 'mob_spots',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: mobObjects,
      },
    ],
  }
}

function patchMapsJson(mobSpots) {
  const maps = JSON.parse(fs.readFileSync(MAPS_JSON_PATH, 'utf8'))
  const entry = {
    id: MAP_ID,
    displayName: 'Prontera Field 01',
    fieldType: 'custom',
    sourceUrl: 'https://irowiki.org/wiki/Prontera_Field_01',
  }
  const idx = maps.maps.findIndex((m) => m.id === MAP_ID)
  if (idx >= 0) maps.maps[idx] = entry
  else maps.maps.push(entry)

  if (!maps.mobSpots) maps.mobSpots = {}
  maps.mobSpots[MAP_ID] = mobSpots
  if (!maps.portals) maps.portals = {}
  maps.portals[MAP_ID] = []

  fs.writeFileSync(MAPS_JSON_PATH, `${JSON.stringify(maps, null, 2)}\n`)
}

function writeSeedSql() {
  const sql = `-- Map: ${MAP_ID} (Prontera Field 01)
-- Generated by scripts/generate-prt-fild01-map.mjs

-- Add/replace map on Prontera Warp Agent (Custom maps; idempotent by map_id)
update public.npc_definitions
set config = jsonb_set(
  config,
  '{destinations}',
  (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(coalesce(config->'destinations', '[]'::jsonb)) elem
    where elem->>'map_id' is distinct from '${MAP_ID}'
  ) || '[{"map_id": "${MAP_ID}", "label": "Prontera Field 01", "x": ${ENTRY.x}, "y": ${ENTRY.y}, "category": "custom"}]'::jsonb
)
where id = 'prontera_warp';

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values
  (
    '${MAP_ID}_kafra',
    '${MAP_ID}',
    ${KAFRA.x},
    ${KAFRA.y},
    'storage',
    'Kafra',
    '{}'::jsonb
  ),
  (
    '${MAP_ID}_warp',
    '${MAP_ID}',
    ${RETURN_WARP.x},
    ${RETURN_WARP.y},
    'teleport',
    'Return Warp',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":640,"y":360}]}'::jsonb
  )
on conflict (id) do update set
  map_id = excluded.map_id,
  x = excluded.x,
  y = excluded.y,
  npc_type = excluded.npc_type,
  label = excluded.label,
  config = excluded.config;
`
  fs.writeFileSync(SEED_SQL_PATH, sql)
}

function main() {
  const grid = buildFieldGrid()
  const layers = buildLayers(grid)
  const mobSpots = buildMobSpotDefs(layers.walkable)
  const obstacles = buildObstacles(grid)
  const decor = decorTrees()
  const npcs = [
    npcObject(2, `${MAP_ID}_warp`, 'teleport', 'Return Warp', RETURN_WARP.x - 24, RETURN_WARP.y - 32, {
      destinations: [{ x: 640, y: 360, label: 'Prontera', map_id: 'prontera' }],
      facing: 'down',
    }),
    npcObject(3, `${MAP_ID}_kafra`, 'storage', 'Kafra', KAFRA.x - 24, KAFRA.y - 32, {}),
  ]

  const tmj = buildTmj(layers, mobSpots, obstacles, decor, npcs)
  fs.mkdirSync(path.dirname(TMJ_PATH), { recursive: true })
  fs.writeFileSync(TMJ_PATH, `${JSON.stringify(tmj, null, 2)}\n`)
  patchMapsJson(mobSpots)
  writeSeedSql()
  execSync('node scripts/sync-mob-spots-to-supabase.mjs', { cwd: ROOT, stdio: 'inherit' })

  console.log(`Wrote ${TMJ_PATH} (${W}x${H} tiles)`)
  console.log(`Novice mob spots: ${mobSpots.length} (mostly small_poring / poring)`)
  console.log(`Entry from Prontera: ${ENTRY.x}, ${ENTRY.y}`)
}

main()
