import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const TILE = 32

const FLOORS = [
  { mapId: 'dun_f1', name: 'Crypt', w: 32, h: 42, spawns: ['zombie', 'skeleton', 'poporing', 'familiar'], counts: [10, 10, 8, 8] },
  { mapId: 'dun_f2', name: 'Orc Catacombs', w: 32, h: 42, spawns: ['orc_warrior', 'orc_lady', 'orc_zombie', 'orc_archer'], counts: [10, 8, 10, 8] },
  { mapId: 'dun_f3', name: 'Chivalry Hall', w: 32, h: 42, spawns: ['raydric', 'raydric_archer', 'khalitzburg', 'abysmal_knight'], counts: [9, 9, 9, 9] },
  { mapId: 'dun_f4', name: 'Dark Throne', w: 32, h: 42, spawns: ['wanderer', 'dark_priest', 'chimera', 'alice'], counts: [9, 9, 9, 9] },
  { mapId: 'dun_f5', name: 'Niflheim Depths', w: 32, h: 42, spawns: ['dullahan', 'bloody_murderer', 'gibbet', 'loli_ruri'], counts: [9, 9, 9, 9] },
]

function buildGrid(w, h) {
  const grid = Array.from({ length: h }, () => Array(w).fill('G'))
  for (let x = 0; x < w; x++) {
    grid[0][x] = 'W'
    grid[h - 1][x] = 'W'
  }
  for (let y = 1; y < h - 1; y++) {
    grid[y][0] = 'W'
    grid[y][w - 1] = 'W'
  }
  for (let y = 4; y < h - 6; y += 5) {
    for (let x = 2; x < w - 2; x++) {
      if (x % 6 !== 0) grid[y][x] = 'W'
    }
  }
  const mid = Math.floor(w / 2)
  for (let y = 1; y < h - 1; y++) {
    grid[y][mid] = 'G'
    if (mid > 0) grid[y][mid - 1] = 'G'
    if (mid < w - 1) grid[y][mid + 1] = 'G'
  }
  return grid
}

function groundGid(x, y) {
  return (x + y) % 2 === 0 ? 2 : 3
}

function buildLayers(grid, w, h) {
  const ground = []
  const collision = []
  const walkable = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wall = grid[y][x] === 'W'
      ground.push(wall ? 1 : groundGid(x, y))
      collision.push(wall ? 1 : 0)
      if (!wall) walkable.push({ px: x * TILE + 16, py: y * TILE + 16 })
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

function buildMobSpawns(walkable, spawns, counts) {
  const pool = shuffle([...walkable])
  const out = []
  let idx = 0
  for (let s = 0; s < spawns.length; s++) {
    for (let i = 0; i < counts[s]; i++) {
      const cell = pool[idx++ % pool.length]
      out.push({ x: cell.px, y: cell.py, defId: spawns[s] })
    }
  }
  return out
}

function buildTmj(layers, w, h) {
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
    width: w,
    height: h,
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
        height: h,
        id: 1,
        name: 'ground',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width: w,
        x: 0,
        y: 0,
      },
      {
        data: layers.collision,
        height: h,
        id: 2,
        name: 'collision',
        opacity: 1,
        type: 'tilelayer',
        visible: false,
        width: w,
        x: 0,
        y: 0,
      },
    ],
  }
}

function patchMapsJson(floorSpawns) {
  const mapsPath = path.join(ROOT, 'content/ro/maps.json')
  const maps = JSON.parse(fs.readFileSync(mapsPath, 'utf8'))
  maps.portals = maps.portals ?? {}

  for (const floor of FLOORS) {
    const spawns = floorSpawns[floor.mapId]
    const meta = {
      id: floor.mapId,
      displayName: floor.name,
      fieldType: 'dungeon',
      sourceUrl: null,
    }
    const idx = maps.maps.findIndex((m) => m.id === floor.mapId)
    if (idx >= 0) maps.maps[idx] = meta
    else maps.maps.push(meta)
    maps.mobSpawns[floor.mapId] = spawns

    const mid = Math.floor(floor.w / 2) * TILE + 16
    const exitY = (floor.h - 4) * TILE + 16
    maps.portals[floor.mapId] = [
      {
        id: `${floor.mapId}_exit`,
        x: mid - 48,
        y: exitY - 32,
        width: 96,
        height: 64,
        targetMapId: 'prontera',
        targetX: 640,
        targetY: 400,
        label: 'Prontera',
        mode: 'walk',
      },
    ]
  }

  fs.writeFileSync(mapsPath, JSON.stringify(maps, null, 2) + '\n')

  const sharedPortals = path.join(ROOT, 'supabase/functions/_shared/mapPortals.json')
  const shared = JSON.parse(fs.readFileSync(sharedPortals, 'utf8'))
  shared.portals = shared.portals ?? {}
  for (const floor of FLOORS) {
    shared.portals[floor.mapId] = maps.portals[floor.mapId]
  }
  fs.writeFileSync(sharedPortals, JSON.stringify(shared, null, 2) + '\n')
}

function writeSharedDungeons(floorSpawns) {
  const dungeonsPath = path.join(ROOT, 'content/ro/dungeons.json')
  const dungeons = JSON.parse(fs.readFileSync(dungeonsPath, 'utf8'))
  const shared = {
    floors: dungeons.floors.map((f) => ({
      id: f.id,
      mapId: f.mapId,
      minLevel: f.minLevel,
      maxLevel: f.maxLevel,
      entry: f.entry,
      mvpDefId: f.mvpDefId,
      completionReward: f.completionReward,
      totalSpawns: (floorSpawns[f.mapId] ?? []).length,
    })),
  }
  const out = path.join(ROOT, 'supabase/functions/_shared/dungeons.json')
  fs.writeFileSync(out, JSON.stringify(shared, null, 2) + '\n')
}

function main() {
  const floorSpawns = {}
  for (const floor of FLOORS) {
    const grid = buildGrid(floor.w, floor.h)
    const layers = buildLayers(grid, floor.w, floor.h)
    const spawns = buildMobSpawns(layers.walkable, floor.spawns, floor.counts)
    floorSpawns[floor.mapId] = spawns
    const tmj = buildTmj(layers, floor.w, floor.h)
    const tmjPath = path.join(ROOT, `client/public/maps/${floor.mapId}.tmj`)
    fs.mkdirSync(path.dirname(tmjPath), { recursive: true })
    fs.writeFileSync(tmjPath, JSON.stringify(tmj))
    console.log('Wrote', tmjPath, `(${spawns.length} spawns)`)
  }
  patchMapsJson(floorSpawns)
  writeSharedDungeons(floorSpawns)
  console.log('Updated maps.json, mapPortals.json, _shared/dungeons.json')
}

main()
