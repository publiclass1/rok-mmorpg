import Phaser from 'phaser'

function drawGrassTile(g: Phaser.GameObjects.Graphics, x: number, base: number, accent: number) {
  g.fillStyle(0x0f172a, 0.35)
  g.fillRect(x, 26, 32, 6)
  g.fillStyle(base, 1)
  g.fillRect(x + 1, 4, 30, 24)
  g.fillStyle(accent, 1)
  g.fillRect(x + 2, 5, 28, 8)
  g.fillStyle(0xffffff, 0.08)
  g.fillRect(x + 3, 6, 12, 4)
}

function drawPathTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x0f172a, 0.35)
  g.fillRect(x, 26, 32, 6)
  g.fillStyle(0xa8845c, 1)
  g.fillRect(x + 1, 5, 30, 23)
  g.fillStyle(0xc4a574, 1)
  g.fillRect(x + 2, 6, 28, 10)
  g.fillStyle(0x8b6914, 0.25)
  g.fillRect(x + 4, 18, 24, 8)
}

function drawWallTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x1f2937, 1)
  g.fillRect(x, 22, 32, 10)
  g.fillStyle(0x4b5563, 1)
  g.fillRect(x + 2, 6, 28, 18)
  g.fillStyle(0x6b7280, 1)
  g.fillRect(x + 3, 7, 26, 8)
  g.fillStyle(0x374151, 1)
  g.fillRect(x + 2, 14, 6, 10)
  g.lineStyle(1, 0x9ca3af, 0.5)
  g.strokeRect(x + 3, 7, 26, 16)
}

function drawBuildingTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x0f172a, 0.35)
  g.fillRect(x, 26, 32, 6)
  g.fillStyle(0x78716c, 1)
  g.fillRect(x + 1, 14, 30, 16)
  g.fillStyle(0xb45309, 1)
  g.fillTriangle(x + 16, 4, x + 30, 14, x + 2, 14)
  g.fillStyle(0x44403c, 1)
  g.fillRect(x + 12, 18, 8, 10)
}

function drawTreeTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x15803d, 1)
  g.fillRect(x + 1, 22, 30, 8)
  g.fillStyle(0x78350f, 1)
  g.fillRect(x + 14, 18, 4, 8)
  g.fillStyle(0x166534, 1)
  g.fillCircle(x + 16, x + 12, 11)
  g.fillStyle(0x22c55e, 1)
  g.fillCircle(x + 12, x + 10, 6)
  g.fillStyle(0x16a34a, 1)
  g.fillCircle(x + 20, x + 11, 5)
}

function drawFountainTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x94a3b8, 1)
  g.fillRect(x, 0, 32, 32)
  g.fillStyle(0xcbd5e1, 0.5)
  g.fillRect(x + 2, 2, 28, 28)
  g.fillStyle(0x38bdf8, 0.85)
  g.fillCircle(x + 16, x + 16, 8)
  g.fillStyle(0x0ea5e9, 1)
  g.fillCircle(x + 16, x + 16, 4)
}

function drawPortalTile(g: Phaser.GameObjects.Graphics, x: number) {
  g.fillStyle(0x1e1b4b, 1)
  g.fillRect(x, 0, 32, 32)
  g.fillStyle(0x6366f1, 0.5)
  g.fillEllipse(x + 16, x + 18, 24, 12)
  g.fillStyle(0x818cf8, 0.9)
  g.fillCircle(x + 16, x + 16, 8)
  g.fillStyle(0xc4b5fd, 1)
  g.fillCircle(x + 16, x + 16, 4)
}

/** Tile strip width in px (8 tiles × 32). Gids 1–8: wall, grass A/B, path, building, tree, fountain, portal */
export const TILESET_TILE_COUNT = 8
export const TILESET_WIDTH_PX = TILESET_TILE_COUNT * 32

/** Procedural tile strip matching client/public/tiles/city-tileset.svg */
export function ensureTilesTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('tiles')) return

  const g = scene.add.graphics()
  drawWallTile(g, 0)
  drawGrassTile(g, 32, 0x22c55e, 0x16a34a)
  drawGrassTile(g, 64, 0x16a34a, 0x15803d)
  drawPathTile(g, 96)
  drawBuildingTile(g, 128)
  drawTreeTile(g, 160)
  drawFountainTile(g, 192)
  drawPortalTile(g, 224)
  g.generateTexture('tiles', TILESET_WIDTH_PX, 32)
  g.destroy()
}

export function ensurePlayerTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('player')) return

  const g = scene.add.graphics()
  g.fillStyle(0x1d4ed8, 1)
  g.fillRoundedRect(4, 10, 16, 14, 3)
  g.fillStyle(0xfcd34d, 1)
  g.fillCircle(12, 8, 7)
  g.generateTexture('player', 24, 28)
  g.destroy()
}

export function ensureMobTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('mob')) return

  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.2)
  g.fillEllipse(14, 26, 20, 6)
  g.fillStyle(0xf472b6, 1)
  g.fillCircle(14, 12, 12)
  g.fillStyle(0xffffff, 0.9)
  g.fillCircle(10, 10, 3)
  g.fillCircle(18, 10, 3)
  g.generateTexture('mob', 28, 28)
  g.destroy()
}
