import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const LAYOUT_PATH = path.join(ROOT, 'content/ro/maps/prontera.layout.json')
const TMJ_PATH = path.join(ROOT, 'client/public/maps/prontera.tmj')
const PREVIEW_PATH = path.join(ROOT, 'docs/maps/prontera-preview.svg')

const W = 40
const H = 28

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

export function buildPronteraLayout() {
  const grid = emptyGrid()

  for (let x = 0; x < W; x++) {
    grid[0][x] = 'W'
    grid[H - 1][x] = 'W'
  }
  for (let y = 1; y < H - 1; y++) {
    grid[y][0] = 'W'
    grid[y][W - 1] = 'W'
  }

  for (let y = 1; y < H - 1; y++) {
    grid[y][19] = 'P'
    grid[y][20] = 'P'
  }
  for (let x = 1; x < W - 1; x++) {
    grid[13][x] = 'P'
    grid[14][x] = 'P'
  }

  fillRect(grid, 17, 11, 6, 6, 'F')

  fillRect(grid, 17, 8, 4, 3, 'B')
  fillRect(grid, 24, 10, 4, 3, 'B')
  fillRect(grid, 24, 15, 4, 3, 'B')
  fillRect(grid, 13, 15, 3, 3, 'B')
  fillRect(grid, 5, 10, 3, 4, 'B')
  fillRect(grid, 32, 10, 3, 4, 'B')
  fillRect(grid, 8, 18, 4, 3, 'B')
  fillRect(grid, 28, 18, 4, 3, 'B')

  for (let x = 18; x <= 21; x++) {
    grid[25][x] = 'O'
    grid[26][x] = 'O'
  }

  for (let x = 2; x <= 12; x++) {
    for (let y = 2; y <= 5; y++) grid[y][x] = 'T'
  }
  for (let x = 27; x <= 37; x++) {
    for (let y = 2; y <= 5; y++) grid[y][x] = 'T'
  }
  for (let y = 6; y <= 10; y++) {
    for (let x = 35; x <= 37; x++) grid[y][x] = 'T'
  }
  for (let y = 6; y <= 9; y++) {
    for (let x = 2; x <= 4; x++) grid[y][x] = 'T'
  }
  for (let x = 3; x <= 6; x++) grid[20][x] = 'T'
  for (let x = 33; x <= 36; x++) grid[21][x] = 'T'

  const rows = grid.map((row) => row.join(''))

  return {
    id: 'prontera',
    width: W,
    height: H,
    legend: {
      W: { gid: 1, ground: 1, decor: 0, collision: 1, preview: '#4b5563' },
      G: { gid: 2, ground: 'checker', decor: 0, collision: 0, preview: '#22c55e' },
      P: { gid: 4, ground: 4, decor: 0, collision: 0, preview: '#c4a574' },
      B: { gid: 5, ground: 5, decor: 0, collision: 1, preview: '#b45309' },
      T: { gid: 2, ground: 'checker', decor: 6, collision: 1, preview: '#166534' },
      F: { gid: 7, ground: 7, decor: 0, collision: 0, preview: '#38bdf8' },
      O: { gid: 8, ground: 8, decor: 0, collision: 0, preview: '#818cf8' },
    },
    rows,
    npcAnchors: {
      prontera_kafra: { tileX: 16, tileY: 14 },
      prontera_save: { tileX: 19, tileY: 9 },
      prontera_warp: { tileX: 22, tileY: 23 },
      prontera_job_master: { tileX: 24, tileY: 16 },
      prontera_tool_dealer: { tileX: 25, tileY: 11 },
      prontera_healer: { tileX: 14, tileY: 15 },
      field_return_landing: { tileX: 19, tileY: 24 },
      default_spawn: { tileX: 20, tileY: 14 },
    },
  }
}

function tileCenterPx(tileX, tileY) {
  return { x: tileX * 32 + 16, y: tileY * 32 + 16 }
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
  const decor = []
  const collision = []

  for (let y = 0; y < height; y++) {
    const row = rows[y]
    if (row.length !== width) {
      throw new Error(`Row ${y} length ${row.length} !== width ${width}`)
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x]
      const def = legend[ch]
      if (!def) throw new Error(`Unknown char "${ch}" at ${x},${y}`)

      ground.push(groundGid(ch, x, legend))
      decor.push(def.decor || 0)
      collision.push(def.collision ? 1 : 0)
    }
  }

  return { ground, decor, collision }
}

function buildTmj(layout, layers) {
  const { width, height } = layout
  return {
    compressionlevel: -1,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: 32,
    tilewidth: 32,
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
        tileheight: 32,
        tilewidth: 32,
      },
    ],
    nextlayerid: 5,
    nextobjectid: 1,
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
        data: layers.decor,
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
    ],
  }
}

function buildPreviewSvg(layout) {
  const { width, height, rows, legend } = layout
  const tile = 16
  const rects = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x]
      const color = legend[ch]?.preview ?? '#333'
      rects.push(
        `<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="${color}" stroke="#0f172a" stroke-width="0.25"/>`,
      )
    }
  }

  const anchors = layout.npcAnchors ?? {}
  for (const [id, pos] of Object.entries(anchors)) {
    const cx = pos.tileX * tile + tile / 2
    const cy = pos.tileY * tile + tile / 2
    rects.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="#fbbf24" data-npc="${id}"/>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width * tile}" height="${height * tile}" viewBox="0 0 ${width * tile} ${height * tile}">
  <title>Prontera layout preview</title>
  ${rects.join('\n  ')}
</svg>
`
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

  const layers = buildLayers(layout)
  const tmj = buildTmj(layout, layers)
  fs.mkdirSync(path.dirname(TMJ_PATH), { recursive: true })
  fs.writeFileSync(TMJ_PATH, JSON.stringify(tmj))

  fs.mkdirSync(path.dirname(PREVIEW_PATH), { recursive: true })
  fs.writeFileSync(PREVIEW_PATH, buildPreviewSvg(layout))

  console.log('Wrote', TMJ_PATH)
  console.log('Wrote', PREVIEW_PATH)

  if (layout.npcAnchors) {
    console.log('\nNPC pixel centers (tile * 32 + 16):')
    for (const [id, pos] of Object.entries(layout.npcAnchors)) {
      const px = tileCenterPx(pos.tileX, pos.tileY)
      console.log(`  ${id}: ${px.x}, ${px.y} (tile ${pos.tileX},${pos.tileY})`)
    }
  }
}

main()
