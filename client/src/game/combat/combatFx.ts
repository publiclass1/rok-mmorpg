import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'
import type { PlayerDisplay } from '../player/playerSprites'
import { setPlayerHitFlash } from '../player/playerSprites'
import type { AttackVariant } from '../player/playerCombatAnim'

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

export function playMobAttackLunge(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  targetX: number,
  targetY: number,
) {
  const startX = sprite.x
  const startY = sprite.y
  const dx = targetX - startX
  const dy = targetY - startY
  const len = Math.hypot(dx, dy)
  const nx = len > 0.01 ? dx / len : 0
  const ny = len > 0.01 ? dy / len : 1
  const lunge = 6

  scene.tweens.add({
    targets: sprite,
    x: startX + nx * lunge,
    y: startY + ny * lunge,
    duration: 70,
    yoyo: true,
  })
}

export function playMobDeath(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  tintColor: number,
  onComplete: () => void,
) {
  sprite.setTint(0xffffff)
  scene.tweens.add({
    targets: sprite,
    y: sprite.y - 10,
    scaleX: 1.2,
    scaleY: 0.35,
    alpha: 0,
    duration: 320,
    ease: 'Quad.easeIn',
    onComplete: () => {
      sprite.clearTint()
      sprite.setTint(tintColor)
      sprite.setAlpha(1)
      sprite.setScale(1, 1)
      onComplete()
    },
  })
}

export function flashPlayerHit(scene: Phaser.Scene, display: PlayerDisplay) {
  setPlayerHitFlash(display, true)
  scene.time.delayedCall(120, () => setPlayerHitFlash(display, false))
}

export function playPlayerAttackSlash(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  facing: Facing,
  options: { variant: AttackVariant },
) {
  const container = display.container
  const playerX = container.x
  const playerY = container.y
  const bash = options.variant === 'bash'

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

  const slash = scene.add.graphics()
  slash.lineStyle(bash ? 4 : 3, bash ? 0xfbbf24 : 0xe2e8f0, 0.95)
  const arcR = bash ? 24 : 18
  const sx = playerX + (facing === 'left' ? -20 : facing === 'right' ? 20 : 0)
  const sy = playerY + (facing === 'up' ? -20 : facing === 'down' ? 20 : 0)
  slash.beginPath()
  if (facing === 'left' || facing === 'right') {
    slash.arc(sx, sy, arcR, facing === 'right' ? -0.8 : Math.PI - 0.8, facing === 'right' ? 0.8 : Math.PI + 0.8, false)
  } else {
    slash.arc(sx, sy, arcR, facing === 'down' ? 0.3 : Math.PI + 0.3, facing === 'down' ? Math.PI - 0.3 : -0.3, false)
  }
  slash.strokePath()

  const startX = container.x
  const startY = container.y
  scene.tweens.add({
    targets: container,
    x: startX + offset.x,
    y: startY + offset.y,
    duration: 90,
    yoyo: true,
  })

  scene.tweens.add({
    targets: slash,
    alpha: 0,
    duration: bash ? 200 : 150,
    onComplete: () => slash.destroy(),
  })
}

/** @deprecated Use playPlayerAttackSlash with PlayerDisplay */
export function playPlayerAttack(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.Sprite,
  facing: Facing,
  onComplete?: () => void,
) {
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
    targets: slash,
    alpha: 0,
    duration: 150,
    onComplete: () => {
      slash.destroy()
      onComplete?.()
    },
  })
}

export function missTextPosition(
  playerX: number,
  playerY: number,
  facing: Facing,
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
