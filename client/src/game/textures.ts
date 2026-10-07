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

const MOB_FRAME_W = 28
const MOB_FRAME_H = 28

function drawMobFrame(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number) {
  const cx = ox + 14
  const baseY = oy + 12
  g.fillStyle(0x000000, 0.2)
  g.fillEllipse(cx, oy + 26, frame >= 3 ? 22 : 20, frame >= 3 ? 4 : 6)

  if (frame === 0) {
    g.fillStyle(0xf472b6, 1)
    g.fillCircle(cx, baseY, 12)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(cx - 4, baseY - 2, 3)
    g.fillCircle(cx + 4, baseY - 2, 3)
  } else if (frame === 1) {
    g.fillStyle(0xf472b6, 1)
    g.fillEllipse(cx, baseY + 2, 16, 10)
    g.fillStyle(0x1f2937, 1)
    g.fillRect(cx - 5, baseY - 1, 4, 1)
    g.fillRect(cx + 1, baseY - 1, 4, 1)
  } else if (frame === 2) {
    g.fillStyle(0xf472b6, 1)
    g.fillEllipse(cx + 4, baseY + 4, 14, 9)
    g.fillStyle(0x1f2937, 1)
    g.lineBetween(cx + 2, baseY, cx + 6, baseY + 4)
    g.lineBetween(cx + 8, baseY, cx + 4, baseY + 4)
  } else if (frame === 3) {
    g.fillStyle(0xf472b6, 1)
    g.fillEllipse(cx, baseY + 10, 18, 6)
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(cx, baseY + 11, 16, 3)
  } else {
    g.fillStyle(0xf472b6, 0.5)
    g.fillEllipse(cx, baseY + 12, 20, 4)
  }
}

export function ensureMobTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('mob')) return

  const cols = 5
  const w = cols * MOB_FRAME_W
  const h = MOB_FRAME_H
  const g = scene.add.graphics()
  for (let i = 0; i < cols; i++) {
    drawMobFrame(g, i * MOB_FRAME_W, 0, i)
  }
  g.generateTexture('mob', w, h)
  g.destroy()

  const tex = scene.textures.get('mob')
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST)
  for (let i = 0; i < cols; i++) {
    if (!tex.has(`${i}`)) {
      tex.add(`${i}`, 0, i * MOB_FRAME_W, 0, MOB_FRAME_W, MOB_FRAME_H)
    }
  }
}

export function ensureMobParticleTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('mob_particle')) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1)
  g.fillRect(0, 0, 4, 4)
  g.generateTexture('mob_particle', 4, 4)
  g.destroy()
}

export function registerMobDeathAnimation(scene: Phaser.Scene) {
  if (scene.anims.exists('mob_death')) return
  scene.anims.create({
    key: 'mob_death',
    frames: scene.anims.generateFrameNumbers('mob', { start: 1, end: 4 }),
    frameRate: 12,
    repeat: 0,
  })
}
