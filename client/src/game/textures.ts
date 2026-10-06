import Phaser from 'phaser'

/** Procedural 128×32 tile strip (gid 1–4): wall, grass A, grass B, path */
export function ensureTilesTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('tiles')) return

  const g = scene.add.graphics()
  const colors = [0x6b7280, 0x22c55e, 0x16a34a, 0xc4a574]
  for (let i = 0; i < 4; i++) {
    const x = i * 32
    g.fillStyle(colors[i], 1)
    g.fillRect(x, 0, 32, 32)
    if (i === 0) {
      g.lineStyle(2, 0x374151, 1)
      g.strokeRect(x + 2, 2, 28, 28)
    }
  }
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
  g.fillStyle(0xf472b6, 1)
  g.fillCircle(14, 14, 12)
  g.fillStyle(0xffffff, 0.9)
  g.fillCircle(10, 11, 3)
  g.fillCircle(18, 11, 3)
  g.generateTexture('mob', 28, 28)
  g.destroy()
}
