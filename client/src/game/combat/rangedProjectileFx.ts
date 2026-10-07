import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'

export const COMBAT_AIM_Y_OFFSET = 14

export function toCombatAimPoint(x: number, y: number): { x: number; y: number } {
  return { x, y: y - COMBAT_AIM_Y_OFFSET }
}

export function projectileTravelMs(distPx: number): number {
  const ms = distPx * 2.8
  return Math.min(380, Math.max(120, ms))
}

export function rangedProjectileOrigin(
  playerX: number,
  playerY: number,
  facing: Facing,
): { x: number; y: number } {
  const y = playerY - 18
  switch (facing) {
    case 'left':
      return { x: playerX - 6, y }
    case 'right':
      return { x: playerX + 6, y }
    case 'up':
      return { x: playerX, y: playerY - 22 }
    case 'down':
      return { x: playerX, y: playerY - 14 }
  }
}

function drawArrowGraphic(g: Phaser.GameObjects.Graphics) {
  g.lineStyle(2, 0xcbd5e1, 1)
  g.lineBetween(-10, 0, 8, 0)
  g.fillStyle(0xe2e8f0, 1)
  g.fillTriangle(10, 0, 4, -3, 4, 3)
  g.lineStyle(1, 0x94a3b8, 0.9)
  g.lineBetween(-10, 0, -6, -4)
  g.lineBetween(-10, 0, -6, 4)
}

function sparkAt(scene: Phaser.Scene, x: number, y: number, depth: number, color: number) {
  const sparks = scene.add.graphics()
  sparks.setPosition(x, y)
  sparks.setDepth(depth)
  sparks.lineStyle(2, color, 0.9)
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + 0.15
    sparks.lineBetween(0, 0, Math.cos(a) * 6, Math.sin(a) * 6)
  }
  sparks.fillStyle(0xffffff, 0.75)
  sparks.fillCircle(0, 0, 2)
  scene.tweens.add({
    targets: sparks,
    alpha: 0,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 100,
    onComplete: () => sparks.destroy(),
  })
}

function tweenProjectile(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  duration: number,
  onArrive?: () => void,
  arc = false,
) {
  container.setPosition(fromX, fromY)
  container.setDepth(depth)
  const angle = Math.atan2(toY - fromY, toX - fromX)
  container.setRotation(angle)

  const progress = { t: 0 }
  scene.tweens.add({
    targets: progress,
    t: 1,
    duration,
    ease: 'Linear',
    onUpdate: () => {
      const t = progress.t
      const x = fromX + (toX - fromX) * t
      const arcLift = arc ? Math.sin(t * Math.PI) * 10 : 0
      const y = fromY + (toY - fromY) * t - arcLift
      container.setPosition(x, y)
      if (arc) {
        container.setRotation(Math.atan2(toY - y, toX - x))
      }
    },
    onComplete: () => {
      container.destroy()
      onArrive?.()
    },
  })
}

export function playBowArrowProjectile(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  onArrive?: () => void,
) {
  const dist = Math.hypot(toX - fromX, toY - fromY)
  const duration = projectileTravelMs(dist)

  const container = scene.add.container(0, 0)
  const arrow = scene.add.graphics()
  drawArrowGraphic(arrow)
  container.add(arrow)

  tweenProjectile(scene, container, fromX, fromY, toX, toY, depth, duration, () => {
    sparkAt(scene, toX, toY, depth, 0xe2e8f0)
    onArrive?.()
  })
}

export function playStaffMagicProjectile(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  onArrive?: () => void,
) {
  const dist = Math.hypot(toX - fromX, toY - fromY)
  const duration = projectileTravelMs(dist)

  const container = scene.add.container(0, 0)
  const core = scene.add.circle(0, 0, 4, 0x7dd3fc, 0.95)
  core.setStrokeStyle(1, 0xe0f2fe, 1)
  container.add(core)

  const trail = scene.add.graphics()
  trail.lineStyle(3, 0x38bdf8, 0.5)
  trail.lineBetween(-14, 0, -4, 0)
  container.add(trail)

  tweenProjectile(scene, container, fromX, fromY, toX, toY, depth, duration, () => {
    sparkAt(scene, toX, toY, depth, 0x7dd3fc)
    onArrive?.()
  }, true)
}

export function playRangedAttackRecoil(
  scene: Phaser.Scene,
  rig: Phaser.GameObjects.Container,
  facing: Facing,
) {
  const startX = rig.x
  const startY = rig.y
  let dx = 0
  let dy = 0
  switch (facing) {
    case 'left':
      dx = 3
      break
    case 'right':
      dx = -3
      break
    case 'up':
      dy = 3
      break
    case 'down':
      dy = -3
      break
  }
  scene.tweens.add({
    targets: rig,
    x: startX + dx,
    y: startY + dy,
    duration: 70,
    yoyo: true,
    onComplete: () => rig.setPosition(startX, startY),
  })
}
