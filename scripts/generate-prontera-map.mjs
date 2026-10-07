import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const LAYOUT_PATH = path.join(ROOT, 'content/ro/maps/prontera.layout.json')
const TMJ_PATH = path.join(ROOT, 'client/public/maps/prontera.tmj')
const PREVIEW_PATH = path.join(ROOT, 'docs/maps/prontera-preview.svg')

const W = 100
const H = 80
const TILE = 32
const CX = 50
const CY = 40
const SPAWN_TILE = { tileX: 50, tileY: 44 }

/** Native decor size [width, height] — keep in sync with client/src/lib/mapDecor/catalog.ts */
const DECOR_SIZES = {
  castle: [576, 416],
  sanctuary: [320, 320],
  kafra_hq: [288, 224],
  large_house: [224, 192],
  large_house_b: [224, 192],
  shop_weapon: [192, 176],
  shop_armor: [192, 176],
  shop_tool: [192, 176],
  inn: [192, 176],
  fountain: [192, 192],
  gate: [224, 192],
  wall_tower: [96, 176],
  bridge_h: [192, 128],
  bridge_v: [128, 192],
  canal: [128, 128],
  tree_large: [160, 224],
  tree_oak: [192, 240],
  tree_pine: [112, 208],
  tree: [128, 176],
  house: [160, 144],
  lamp_post: [32, 96],
  bush: [64, 48],
}

const NPC_ANCHORS = [
  { id: 'prontera_kafra', label: 'Kafra', npcType: 'storage', tileX: 57, tileY: 44 },
  { id: 'prontera_save', label: 'Save Point', npcType: 'save', tileX: 50, tileY: 46 },
  { id: 'prontera_healer', label: 'Healer', npcType: 'healer', tileX: 43, tileY: 44 },
  { id: 'prontera_rental', label: 'Rental Shop', npcType: 'rental', tileX: 46, tileY: 44 },
  { id: 'prontera_warp', label: 'Warp Agent', npcType: 'teleport', tileX: 50, tileY: 51 },
  { id: 'prontera_job_master', label: 'Job Master', npcType: 'job_master', tileX: 50, tileY: 26 },
  { id: 'prontera_dungeon_guide', label: 'Dungeon Guide', npcType: 'dungeon', tileX: 90, tileY: 44 },
  { id: 'prontera_weapon_dealer', label: 'Weapon Dealer', npcType: 'shop', tileX: 26, tileY: 58 },
  { id: 'prontera_armor_dealer', label: 'Armor Dealer', npcType: 'shop', tileX: 34, tileY: 58 },
  { id: 'prontera_tool_dealer', label: 'Tool Dealer', npcType: 'shop', tileX: 74, tileY: 58 },
]

/** @returns {string[][]} */
function emptyGrid() {
  return Array.from({ length: H }, () => Array(W).fill('G'))
}

function fillRect(grid, x0, y0, w, h, ch) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = ch
    }
  }
}

function distTiles(x, y) {
  return Math.hypot(x - CX, y - CY)
}

function placeDecorAtFeet(decor, asset, tileX, tileY) {
  const size = DECOR_SIZES[asset]
  if (!size) throw new Error(`Unknown decor asset: ${asset}`)
  const [w, h] = size
  const feetX = tileX * TILE + TILE / 2
  const feetY = tileY * TILE
  decor.push({
    asset,
    x: Math.round(feetX - w / 2),
    y: Math.round(feetY - h),
    width: w,
    height: h,
  })
}

function readNpcConfigMap() {
  const configs = {}
  if (!fs.existsSync(TMJ_PATH)) return configs
  const m = JSON.parse(fs.readFileSync(TMJ_PATH, 'utf8'))
  for (const layer of m.layers) {
    if (layer.name !== 'npcs') continue
    for (const o of layer.objects) {
      const props = Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]))
      if (props.configJson) configs[o.name] = props.configJson
    }
  }
  return configs
}

export function buildPronteraLayout() {
  const grid = emptyGrid()

  for (let x = 0; x < W; x++) {
    grid[0][x] = 'W'
    grid[H - 1][x] = 'W'
  }
  for (let y = 0; y < H; y++) {
    grid[y][0] = 'W'
    grid[y][W - 1] = 'W'
  }

  const gateHalf = 3
  for (let dx = -gateHalf; dx <= gateHalf; dx++) {
    grid[0][CX + dx] = 'G'
    grid[H - 1][CX + dx] = 'G'
    grid[CY + dx][0] = 'G'
    grid[CY + dx][W - 1] = 'G'
  }

  fillRect(grid, CX - 3, 0, 7, H, 'P')
  fillRect(grid, 0, CY - 3, W, 7, 'P')

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (distTiles(x, y) <= 9) grid[y][x] = 'P'
    }
  }

  fillRect(grid, 24, 0, 3, H, 'P')
  fillRect(grid, 73, 0, 3, H, 'P')
  fillRect(grid, 0, 24, W, 3, 'P')
  fillRect(grid, 0, 56, W, 3, 'P')

  const decor = []

  placeDecorAtFeet(decor, 'castle', 50, 20)
  placeDecorAtFeet(decor, 'sanctuary', 74, 24)
  placeDecorAtFeet(decor, 'kafra_hq', 36, 42)
  placeDecorAtFeet(decor, 'fountain', 50, 39)

  placeDecorAtFeet(decor, 'shop_weapon', 26, 52)
  placeDecorAtFeet(decor, 'shop_armor', 34, 52)
  placeDecorAtFeet(decor, 'inn', 26, 46)
  placeDecorAtFeet(decor, 'shop_tool', 70, 52)
  placeDecorAtFeet(decor, 'large_house', 18, 48)
  placeDecorAtFeet(decor, 'large_house_b', 42, 48)
  placeDecorAtFeet(decor, 'large_house', 62, 48)
  placeDecorAtFeet(decor, 'large_house_b', 82, 48)
  placeDecorAtFeet(decor, 'house', 14, 62)
  placeDecorAtFeet(decor, 'house', 86, 62)

  const canalCols = [21, 22, 76, 77]
  for (const col of canalCols) {
    for (let row = 26; row <= 68; row += 4) {
      placeDecorAtFeet(decor, 'canal', col, row + 2)
    }
  }

  const bridgeRows = [28, 40, 52]
  for (const row of bridgeRows) {
    placeDecorAtFeet(decor, 'bridge_h', 22, row)
    placeDecorAtFeet(decor, 'bridge_h', 77, row)
  }

  placeDecorAtFeet(decor, 'gate', 50, 2)
  placeDecorAtFeet(decor, 'gate', 50, H - 3)
  placeDecorAtFeet(decor, 'gate', 2, CY)
  placeDecorAtFeet(decor, 'gate', W - 3, CY)

  const towers = [
    [2, 2],
    [W - 3, 2],
    [2, H - 3],
    [W - 3, H - 3],
    [12, 2],
    [W - 13, 2],
  ]
  for (const [tx, ty] of towers) placeDecorAtFeet(decor, 'wall_tower', tx, ty)

  const treeSpots = [
    [8, 8, 'tree_oak'],
    [92, 8, 'tree_oak'],
    [8, 72, 'tree_large'],
    [92, 72, 'tree_large'],
    [6, 40, 'tree_pine'],
    [94, 40, 'tree_pine'],
  ]
  for (let x = 10; x <= 18; x += 4) treeSpots.push([x, 10, 'tree'])
  for (let x = 82; x <= 90; x += 4) treeSpots.push([x, 10, 'tree'])
  for (const [tx, ty, asset] of treeSpots) placeDecorAtFeet(decor, asset, tx, ty)

  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2
    const tx = Math.round(CX + Math.cos(angle) * 11)
    const ty = Math.round(CY + Math.sin(angle) * 8)
    placeDecorAtFeet(decor, 'lamp_post', tx, ty)
    if (a % 2 === 0) placeDecorAtFeet(decor, 'bush', tx + 1, ty)
  }

  const rows = grid.map((row) => row.join(''))

  return {
    id: 'prontera',
    width: W,
    height: H,
    legend: {
      W: { gid: 1, ground: 1, decor: 0, collision: 1, preview: '#4b5563' },
      G: { gid: 2, ground: 'checker', decor: 0, collision: 0, preview: '#22c55e' },
      P: { gid: 4, ground: 4, decor: 0, collision: 0, preview: '#c4a574' },
    },
    rows,
    decor,
    npcAnchors: NPC_ANCHORS,
    spawnTile: SPAWN_TILE,
  }
}

function groundGid(ch, col, legend) {
  const def = legend[ch]
  if (!def) return 2
  if (def.ground === 'checker') return (col + Math.floor(col / 3)) % 2 === 0 ? 2 : 3
  return def.ground
}

function buildLayers(layout) {
  const { width, height, rows, legend } = layout
  const ground = []
  const decorTile = []
  const collision = []

  for (let y = 0; y < height; y++) {
    const row = rows[y]
    if (row.length !== width) throw new Error(`Row ${y} length ${row.length} !== width ${width}`)
    for (let x = 0; x < width; x++) {
      const ch = row[x]
      const def = legend[ch]
      if (!def) throw new Error(`Unknown char "${ch}" at ${x},${y}`)
      ground.push(groundGid(ch, x, legend))
      decorTile.push(0)
      collision.push(def.collision ? 1 : 0)
    }
  }

  return { ground, decorTile, collision }
}

function buildDecorObjects(decor, startId) {
  let id = startId
  return decor.map((d) => {
    const obj = {
      id: id++,
      name: d.asset,
      type: 'decor',
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      properties: [{ name: 'assetId', type: 'string', value: d.asset }],
    }
    return obj
  })
}

function buildNpcObjects(anchors, configMap, startId) {
  let id = startId
  return anchors.map((a) => {
    const feetX = a.tileX * TILE + TILE / 2
    const feetY = a.tileY * TILE + TILE / 2
    const configJson = configMap[a.id] ?? '{}'
    return {
      id: id++,
      name: a.id,
      type: 'npc',
      x: feetX - 24,
      y: feetY - 64,
      width: 48,
      height: 64,
      properties: [
        { name: 'npcId', type: 'string', value: a.id },
        { name: 'npcType', type: 'string', value: a.npcType },
        { name: 'label', type: 'string', value: a.label },
        { name: 'facing', type: 'string', value: 'down' },
        { name: 'spriteKey', type: 'string', value: '' },
        { name: 'configJson', type: 'string', value: configJson },
      ],
    }
  })
}

function buildTmj(layout, layers, decorObjects, npcObjects) {
  const { width, height } = layout
  const nextObjectId =
    Math.max(0, ...decorObjects.map((o) => o.id), ...npcObjects.map((o) => o.id)) + 1
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
    width,
    height,
    tilesets: [
      {
        columns: 8,
        firstgid: 1,
        image: 'tiles.png',
        imagewidth: 256,
        imageheight: 32,
        margin: 0,
        name: 'tiles',
        spacing: 0,
        tilecount: 8,
        tileheight: TILE,
        tilewidth: TILE,
      },
    ],
    nextlayerid: 9,
    nextobjectid: nextObjectId,
    layers: [
      {
        data: layers.ground,
        height,
        id: 1,
        name: 'ground',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width,
        x: 0,
        y: 0,
      },
      {
        data: layers.decorTile,
        height,
        id: 2,
        name: 'decor',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width,
        x: 0,
        y: 0,
      },
      {
        data: layers.collision,
        height,
        id: 3,
        name: 'collision',
        opacity: 1,
        type: 'tilelayer',
        visible: false,
        width,
        x: 0,
        y: 0,
      },
      {
        id: 5,
        name: 'obstacles',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
      {
        id: 6,
        name: 'portals',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
      {
        id: 7,
        name: 'decor',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: decorObjects,
      },
      {
        id: 8,
        name: 'npcs',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: npcObjects,
      },
    ],
  }
}

function buildPreviewSvg(layout, decor) {
  const { width, height, rows, legend } = layout
  const tile = 8
  const rects = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x]
      const color = legend[ch]?.preview ?? '#333'
      rects.push(
        `<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="${color}"/>`,
      )
    }
  }
  const scale = tile / TILE
  for (const d of decor) {
    rects.push(
      `<rect x="${d.x * scale}" y="${d.y * scale}" width="${d.width * scale}" height="${d.height * scale}" fill="none" stroke="#6366f1" stroke-width="0.5"/>`,
    )
  }
  for (const a of layout.npcAnchors) {
    const cx = a.tileX * tile + tile / 2
    const cy = a.tileY * tile + tile / 2
    rects.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="#fbbf24"/>`)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width * tile}" height="${height * tile}" viewBox="0 0 ${width * tile} ${height * tile}">
  <title>Prontera layout preview</title>
  ${rects.join('\n  ')}
</svg>
`
}

function assertLayout(layout, tmj) {
  const { width, height, rows, spawnTile } = layout
  if (width !== W || height !== H) throw new Error('Unexpected map size')
  const expected = W * H
  for (const layer of tmj.layers) {
    if (layer.type === 'tilelayer' && layer.data.length !== expected) {
      throw new Error(`Layer ${layer.name} length ${layer.data.length} !== ${expected}`)
    }
  }
  const ch = rows[spawnTile.tileY][spawnTile.tileX]
  if (ch === 'W') throw new Error('Spawn tile is wall')
  const spawnFeetX = spawnTile.tileX * TILE + TILE / 2
  const spawnFeetY = spawnTile.tileY * TILE + TILE / 2
  console.log(`Spawn check: tile (${spawnTile.tileX},${spawnTile.tileY}) char=${ch} feet=(${spawnFeetX},${spawnFeetY})`)
}

function main() {
  const writeLayout = process.argv.includes('--write-layout')
  let layout

  if (writeLayout || !fs.existsSync(LAYOUT_PATH)) {
    layout = buildPronteraLayout()
    fs.mkdirSync(path.dirname(LAYOUT_PATH), { recursive: true })
    fs.writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2) + '\n')
    console.log('Wrote', LAYOUT_PATH)
  } else {
    layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf8'))
  }

  const configMap = readNpcConfigMap()
  const layers = buildLayers(layout)
  const decorObjects = buildDecorObjects(layout.decor ?? [], 1)
  const npcStart = decorObjects.length + 1
  const npcObjects = buildNpcObjects(layout.npcAnchors ?? NPC_ANCHORS, configMap, npcStart)
  const tmj = buildTmj(layout, layers, decorObjects, npcObjects)
  assertLayout(layout, tmj)

  fs.mkdirSync(path.dirname(TMJ_PATH), { recursive: true })
  fs.writeFileSync(TMJ_PATH, JSON.stringify(tmj, null, 2) + '\n')

  fs.mkdirSync(path.dirname(PREVIEW_PATH), { recursive: true })
  fs.writeFileSync(PREVIEW_PATH, buildPreviewSvg(layout, layout.decor ?? []))

  console.log('Wrote', TMJ_PATH)
  console.log('Wrote', PREVIEW_PATH)
  console.log(`Map ${W}x${H}, decor objects: ${decorObjects.length}, npcs: ${npcObjects.length}`)
}

main()
