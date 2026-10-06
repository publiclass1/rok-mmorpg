import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const TMJ_PATH = path.join(ROOT, 'client/public/maps/prt_sewb1.tmj')
const MAPS_JSON_PATH = path.join(ROOT, 'content/ro/maps.json')
const SHARED_PORTALS_PATH = path.join(ROOT, 'supabase/functions/_shared/mapPortals.json')

const W = 48
const H = 44
const TILE = 32

/** @returns {string[][]} */
function buildCulvertGrid() {
  const grid = Array.from({ length: H }, () => Array(W).fill('G'))
  for (let x = 0; x < W; x++) {
    grid[0][x] = 'W'
    grid[H - 1][x] = 'W'
  }
  for (let y = 1; y < H - 1; y++) {
    grid[y][0] = 'W'
    grid[y][W - 1] = 'W'
  }

  for (let y = 2; y < H - 2; y += 6) {
    for (let x = 4; x < W - 4; x++) {
      if (x % 12 !== 0) grid[y][x] = 'W'
    }
  }
  for (let x = 6; x < W - 6; x += 10) {
    for (let y = 3; y < H - 3; y++) {
      if (y % 8 !== 0) grid[y][x] = 'W'
    }
  }

  grid[2][Math.floor(W / 2)] = 'G'
  grid[2][Math.floor(W / 2) - 1] = 'G'
  grid[2][Math.floor(W / 2) + 1] = 'G'

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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildSpawns(walkable) {
  const pool = shuffle([...walkable])
  const counts = [
    { defId: 'thief_bug_egg', n: 80 },
    { defId: 'thief_bug', n: 30 },
    { defId: 'tarou', n: 10 },
    { defId: 'familiar', n: 10 },
  ]
  const spawns = []
  let idx = 0
  for (const { defId, n } of counts) {
    for (let i = 0; i < n; i++) {
      const cell = pool[idx++ % pool.length]
      spawns.push({ x: cell.px, y: cell.py, defId })
    }
  }
  return spawns
}

function buildTmj(layers) {
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
    nextlayerid: 4,
    nextobjectid: 1,
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
    ],
  }
}

function patchMapsJson(spawns) {
  const maps = JSON.parse(fs.readFileSync(MAPS_JSON_PATH, 'utf8'))
  const culvertMap = {
    id: 'prt_sewb1',
    displayName: 'Prontera Culvert 1',
    fieldType: 'dungeon',
    sourceUrl: 'https://db.irowiki.org/db/map-info/prt_sewb1/',
  }
  const existingIdx = maps.maps.findIndex((m) => m.id === 'prt_sewb1')
  if (existingIdx >= 0) maps.maps[existingIdx] = culvertMap
  else maps.maps.push(culvertMap)

  maps.mobSpawns.prt_sewb1 = spawns

  const entrancePx = { x: Math.floor(W / 2) * TILE + 16, y: 3 * TILE + 16 }
  maps.portals = maps.portals ?? {}
  maps.portals.prt_sewb1 = [
    {
      id: 'culvert_exit_prontera',
      x: entrancePx.x - 48,
      y: entrancePx.y - 32,
      width: 96,
      height: 64,
      targetMapId: 'prontera',
      targetX: 640,
      targetY: 400,
      label: 'Prontera',
      mode: 'walk',
    },
  ]

  fs.writeFileSync(MAPS_JSON_PATH, JSON.stringify(maps, null, 2) + '\n')

  const shared = JSON.parse(fs.readFileSync(SHARED_PORTALS_PATH, 'utf8'))
  shared.portals = shared.portals ?? {}
  shared.portals.prt_sewb1 = maps.portals.prt_sewb1
  fs.writeFileSync(SHARED_PORTALS_PATH, JSON.stringify(shared, null, 2) + '\n')
}

function main() {
  const grid = buildCulvertGrid()
  const layers = buildLayers(grid)
  const spawns = buildSpawns(layers.walkable)
  const tmj = buildTmj(layers)

  fs.mkdirSync(path.dirname(TMJ_PATH), { recursive: true })
  fs.writeFileSync(TMJ_PATH, JSON.stringify(tmj))
  patchMapsJson(spawns)

  console.log('Wrote', TMJ_PATH)
  console.log('Updated', MAPS_JSON_PATH, `with ${spawns.length} mob spawns`)
}

main()
