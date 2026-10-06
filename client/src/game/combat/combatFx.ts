import Phaser from 'phaser'

export type FloatStyle = 'hit' | 'miss' | 'exp' | 'mobHitPlayer'

const STYLE_COLORS: Record<FloatStyle, string> = {
  hit: '#fef08a',
  miss: '#9ca3af',
  exp: '#67e8f9',
  mobHitPlayer: '#fca5a5',
}

export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: FloatStyle,
) {
  const label = scene.add
    .text(x, y, text, { fontSize: style === 'miss' ? '11px' : '12px', color: STYLE_COLORS[style] })
    .setOrigin(0.5)
  scene.tweens.add({
    targets: label,
    y: y - 28,
    alpha: 0,
    duration: 550,
    onComplete: () => label.destroy(),
  })
}

export function playMobHitShake(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, tintColor: number) {
  sprite.setTint(0xffffff)
  scene.tweens.add({
    targets: sprite,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: 60,
    yoyo: true,
    onComplete: () => {
      sprite.clearTint()
      sprite.setTint(tintColor)
    },
  })
}

export function flashPlayer(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite) {
  player.setTint(0xf87171)
  scene.time.delayedCall(100, () => player.clearTint())
}

export function playPlayerAttack(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.Sprite,
  facing: 'up' | 'down' | 'left' | 'right',
  onComplete?: () => void,
) {
  const offset = { x: 0, y: 0 }
  switch (facing) {
    case 'up':
      offset.y = -8
      break
    case 'down':
      offset.y = 8
      break
    case 'left':
      offset.x = -8
      break
    case 'right':
      offset.x = 8
      break
  }

  const startX = player.x
  const startY = player.y
  const slash = scene.add.graphics()
  slash.lineStyle(3, 0xe2e8f0, 0.9)
  const sx = player.x + (facing === 'left' ? -20 : facing === 'right' ? 20 : 0)
  const sy = player.y + (facing === 'up' ? -20 : facing === 'down' ? 20 : 0)
  slash.beginPath()
  if (facing === 'left' || facing === 'right') {
    slash.arc(sx, sy, 18, facing === 'right' ? -0.8 : Math.PI - 0.8, facing === 'right' ? 0.8 : Math.PI + 0.8, false)
  } else {
    slash.arc(sx, sy, 18, facing === 'down' ? 0.3 : Math.PI + 0.3, facing === 'down' ? Math.PI - 0.3 : -0.3, false)
  }
  slash.strokePath()

  scene.tweens.add({
    targets: player,
    x: startX + offset.x,
    y: startY + offset.y,
    duration: 100,
    yoyo: true,
    onComplete: () => onComplete?.(),
  })

  scene.tweens.add({
    targets: slash,
    alpha: 0,
    duration: 150,
    onComplete: () => slash.destroy(),
  })
}

export function missTextPosition(
  playerX: number,
  playerY: number,
  facing: 'up' | 'down' | 'left' | 'right',
): { x: number; y: number } {
  switch (facing) {
    case 'up':
      return { x: playerX, y: playerY - 36 }
    case 'down':
      return { x: playerX, y: playerY + 12 }
    case 'left':
      return { x: playerX - 28, y: playerY - 16 }
    case 'right':
      return { x: playerX + 28, y: playerY - 16 }
  }
}
