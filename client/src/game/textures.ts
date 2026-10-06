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

/** Procedural 128×32 tile strip (gid 1–4): wall, grass A, grass B, path */
export function ensureTilesTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('tiles')) return

  const g = scene.add.graphics()
  drawWallTile(g, 0)
  drawGrassTile(g, 32, 0x22c55e, 0x16a34a)
  drawGrassTile(g, 64, 0x16a34a, 0x15803d)
  drawPathTile(g, 96)
  g.generateTexture('tiles', 128, 32)
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
