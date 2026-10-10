import Phaser from 'phaser'
import { setDepthByFeet } from '../world/depthSort'

export const BLITZ_AOE_VISUAL_RADIUS_PX = 72

export type ArcherHunterGroundStyle = {
  fill: number
  stroke: number
  accent: number
}

export const ARCHER_SHOWER_STYLE: ArcherHunterGroundStyle = {
  fill: 0x4d7c0f,
  stroke: 0x84cc16,
  accent: 0xe2e8f0,
}

const ARCHER_SHAFT = 0x451a03
const FALCON_BODY = 0x1e293b
const FALCON_TALON = 0xfbbf24
const FALCON_CLAW = 0xef4444

export function archerGroundStyle(skillId: string): ArcherHunterGroundStyle | null {
  if (skillId === 'arrow_shower') return ARCHER_SHOWER_STYLE
  return null
}

function drawArrowGraphic(g: Phaser.GameObjects.Graphics, shaftColor = ARCHER_SHAFT) {
  g.lineStyle(2, 0xcbd5e1, 1)
  g.lineBetween(-10, 0, 8, 0)
  g.fillStyle(0xe2e8f0, 1)
  g.fillTriangle(10, 0, 4, -3, 4, 3)
  g.lineStyle(1, shaftColor, 0.9)
  g.lineBetween(-10, 0, -6, -4)
  g.lineBetween(-10, 0, -6, 4)
}

function expandingRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  color: number,
  maxScale = 2.2,
  duration = 320,
) {
  const g = scene.add.circle(x, y, 10, color, 0.35)
  g.setStrokeStyle(2, color, 0.9)
  g.setDepth(depth)
  scene.tweens.add({
    targets: g,
    scaleX: maxScale,
    scaleY: maxScale * 0.75,
    alpha: 0,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  })
}

export function playArrowShowerCastWindup(scene: Phaser.Scene, x: number, y: number, depth: number) {
  const g = scene.add.graphics()
  g.setPosition(x, y)
  g.setDepth(depth)
  g.lineStyle(2, 0x84cc16, 0.9)
  g.beginPath()
  g.arc(0, 4, 14, Math.PI * 1.15, Math.PI * 1.85, false)
  g.strokePath()
  for (let i = -1; i <= 1; i++) {
    g.lineStyle(2, 0xe2e8f0, 0.85)
    g.lineBetween(i * 5, -18, i * 3, -8)
  }
  scene.tweens.add({
    targets: g,
    y: y - 6,
    alpha: 0,
    duration: 280,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  })
  expandingRing(scene, x, y, depth, 0x84cc16, 1.4, 260)
}

export function playArrowShowerRain(
  scene: Phaser.Scene,
  x: number,
  feetY: number,
  radiusPx: number,
  depthEpsilon: number,
  durationMs: number,
) {
  const arrowCount = 18
  const stagger = durationMs / arrowCount

  for (let i = 0; i < arrowCount; i++) {
    scene.time.delayedCall(i * stagger, () => {
      const ox = (Math.random() - 0.5) * radiusPx * 1.6
      const oy = (Math.random() - 0.5) * radiusPx * 0.9
      const landX = x + ox
      const landY = feetY + oy
      const startY = landY - radiusPx * 1.4 - Math.random() * 24

      const container = scene.add.container(landX, startY)
      setDepthByFeet(container, landY, depthEpsilon + 0.02)
      container.setRotation(Math.PI / 2 + (Math.random() - 0.5) * 0.4)
      const arrow = scene.add.graphics()
      drawArrowGraphic(arrow)
      container.add(arrow)

      scene.tweens.add({
        targets: container,
        y: landY,
        duration: 180 + Math.random() * 80,
        ease: 'Quad.easeIn',
        onComplete: () => {
          container.destroy()
          const dust = scene.add.circle(landX, landY, 3, 0xa8a29e, 0.5)
          setDepthByFeet(dust, landY, depthEpsilon + 0.01)
          scene.tweens.add({
            targets: dust,
            scaleX: 2.2,
            scaleY: 1.2,
            alpha: 0,
            duration: 220,
            onComplete: () => dust.destroy(),
          })
        },
      })
    })
  }
}

export function playDoubleStrafeCastWindup(scene: Phaser.Scene, x: number, y: number, depth: number) {
  const g = scene.add.graphics()
  g.setPosition(x, y)
  g.setDepth(depth)
  for (const dy of [-4, 4]) {
    g.lineStyle(2, 0xe2e8f0, 0.95)
    g.lineBetween(-8, dy, 10, dy)
    g.fillStyle(0xe2e8f0, 1)
    g.fillTriangle(12, dy, 6, dy - 2, 6, dy + 2)
  }
  scene.tweens.add({
    targets: g,
    x: x + 8,
    alpha: 0,
    duration: 240,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  })
}

export function playDoubleStrafeImpactSpark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  hitIndex: number,
) {
  const ox = hitIndex === 0 ? -5 : 5
  const sparks = scene.add.graphics()
  sparks.setPosition(x + ox, y)
  sparks.setDepth(depth)
  sparks.lineStyle(2, 0xe2e8f0, 0.95)
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + 0.2
    sparks.lineBetween(0, 0, Math.cos(a) * 7, Math.sin(a) * 7)
  }
  sparks.fillStyle(0xffffff, 0.8)
  sparks.fillCircle(0, 0, 2)
  scene.tweens.add({
    targets: sparks,
    alpha: 0,
    scaleX: 1.4,
    scaleY: 1.4,
    duration: 120,
    onComplete: () => sparks.destroy(),
  })
}

export function playBlitzBeatCastWindup(scene: Phaser.Scene, playerX: number, playerY: number, depth: number) {
  expandingRing(scene, playerX, playerY - 14, depth, FALCON_BODY, 1.3, 300)
  expandingRing(scene, playerX, playerY - 14, depth + 0.01, FALCON_TALON, 0.9, 240)
  const eye = scene.add.circle(playerX, playerY - 16, 3, FALCON_TALON, 0.9)
  eye.setDepth(depth + 0.02)
  scene.tweens.add({
    targets: eye,
    alpha: 0,
    scaleX: 2,
    scaleY: 2,
    duration: 320,
    onComplete: () => eye.destroy(),
  })
}

function buildFalconGraphic(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  g.fillStyle(FALCON_BODY, 1)
  g.fillEllipse(0, 0, 14, 6)
  g.fillTriangle(-6, 0, -14, -8, -10, 2)
  g.fillTriangle(-6, 0, -14, 8, -10, -2)
  g.fillStyle(FALCON_TALON, 1)
  g.fillTriangle(8, 0, 14, -3, 14, 3)
  container.add(g)
  return container
}

export function playBlitzBeatFalconStrike(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  onArrive?: () => void,
) {
  const dist = Math.hypot(toX - fromX, toY - fromY)
  const duration = Math.min(320, Math.max(100, dist * 2))

  const container = buildFalconGraphic(scene)
  container.setPosition(fromX, fromY - 20)
  container.setDepth(depth + 0.05)

  const progress = { t: 0 }
  scene.tweens.add({
    targets: progress,
    t: 1,
    duration,
    ease: 'Sine.easeIn',
    onUpdate: () => {
      const t = progress.t
      const x = fromX + (toX - fromX) * t
      const arcLift = Math.sin(t * Math.PI) * 28
      const y = fromY - 20 + (toY - fromY) * t - arcLift
      container.setPosition(x, y)
      container.setRotation(Math.atan2(toY - y, toX - x))
    },
    onComplete: () => {
      const flash = scene.add.circle(toX, toY, 6, FALCON_CLAW, 0.85)
      flash.setDepth(depth + 0.06)
      scene.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 100,
        onComplete: () => flash.destroy(),
      })
      container.destroy()
      onArrive?.()
    },
  })
}

export function playBlitzBeatAoEImpact(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  radiusPx = BLITZ_AOE_VISUAL_RADIUS_PX,
) {
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    const feather = scene.add.graphics()
    feather.setPosition(x, y)
    feather.setDepth(depth)
    feather.lineStyle(2, 0xe2e8f0, 0.75)
    const dist = radiusPx * 0.55
    feather.lineBetween(0, 0, Math.cos(a) * dist, Math.sin(a) * dist * 0.7)
    scene.tweens.add({
      targets: feather,
      alpha: 0,
      duration: 380,
      onComplete: () => feather.destroy(),
    })
  }

  for (let c = 0; c < 3; c++) {
    const claw = scene.add.graphics()
    claw.setPosition(x + (c - 1) * 10, y)
    claw.setDepth(depth + 0.01)
    claw.lineStyle(3, FALCON_CLAW, 0.9)
    claw.beginPath()
    claw.arc(0, 4, 8, Math.PI * 1.1, Math.PI * 1.9, false)
    claw.strokePath()
    scene.tweens.add({
      targets: claw,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 340,
      delay: c * 40,
      onComplete: () => claw.destroy(),
    })
  }

  expandingRing(scene, x, y, depth, FALCON_TALON, 1.8, 300)
}
