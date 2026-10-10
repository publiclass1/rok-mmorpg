import Phaser from 'phaser'
import { usesGroundAoECastMarker } from './groundAoECastMarker'
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
  playMagicSkillProjectile(scene, 'staff_basic', fromX, fromY, toX, toY, depth, onArrive)
}

type MagicProjectileKind =
  | 'staff_basic'
  | 'fire'
  | 'water'
  | 'wind'
  | 'ghost'
  | 'earth'
  | 'earth_rise'

export function magicProjectileKindForSkill(skillId: string): MagicProjectileKind {
  switch (skillId) {
    case 'fire_bolt':
    case 'fire_ball':
    case 'meteor_storm':
    case 'lord_of_vermilion':
      return 'fire'
    case 'cold_bolt':
    case 'frost_diver':
    case 'frost_nova':
    case 'storm_gust':
    case 'water_ball':
      return 'water'
    case 'lightning_bolt':
    case 'jupitel_thunder':
      return 'wind'
    case 'napalm_beat':
    case 'soul_strike':
    case 'dispell':
      return 'ghost'
    case 'stone_curse':
      return 'earth_rise'
    case 'earth_spike':
    case 'heavens_drive':
      return 'earth'
    default:
      return 'staff_basic'
  }
}

function buildMagicProjectileGraphic(
  scene: Phaser.Scene,
  kind: MagicProjectileKind,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()

  switch (kind) {
    case 'fire': {
      const glow = scene.add.circle(0, 0, 9, 0xf97316, 0.35)
      container.add(glow)
      const core = scene.add.circle(0, 0, 6, 0xf97316, 0.98)
      core.setStrokeStyle(2, 0xfde047, 1)
      container.add(core)
      g.lineStyle(4, 0xef4444, 0.65)
      g.lineBetween(-18, 0, -4, 0)
      container.add(g)
      break
    }
    case 'water': {
      const glow = scene.add.circle(0, 0, 9, 0x38bdf8, 0.3)
      container.add(glow)
      const core = scene.add.circle(0, 0, 6, 0x38bdf8, 0.98)
      core.setStrokeStyle(2, 0xe0f2fe, 1)
      container.add(core)
      g.lineStyle(4, 0x0ea5e9, 0.6)
      g.lineBetween(-18, 0, -4, 0)
      container.add(g)
      break
    }
    case 'wind': {
      const core = scene.add.circle(0, 0, 5, 0xfde047, 0.9)
      container.add(core)
      g.lineStyle(4, 0xfde047, 0.95)
      g.lineBetween(-16, 2, 12, -2)
      g.lineStyle(3, 0xfbbf24, 0.75)
      g.lineBetween(-10, -4, 10, 2)
      container.add(g)
      break
    }
    case 'ghost': {
      const glow = scene.add.circle(0, 0, 10, 0xa78bfa, 0.35)
      container.add(glow)
      const core = scene.add.circle(0, 0, 6, 0xa78bfa, 0.85)
      container.add(core)
      g.lineStyle(3, 0xc4b5fd, 0.7)
      g.lineBetween(-14, 0, 8, 0)
      container.add(g)
      break
    }
    case 'earth': {
      g.fillStyle(0xa8a29e, 1)
      g.fillTriangle(0, -6, -5, 4, 5, 4)
      container.add(g)
      break
    }
    case 'earth_rise':
    case 'staff_basic':
    default: {
      const core = scene.add.circle(0, 0, 4, 0x7dd3fc, 0.95)
      core.setStrokeStyle(1, 0xe0f2fe, 1)
      container.add(core)
      g.lineStyle(3, 0x38bdf8, 0.5)
      g.lineBetween(-14, 0, -4, 0)
      container.add(g)
      break
    }
  }

  return container
}

export function playMagicSkillProjectile(
  scene: Phaser.Scene,
  skillId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  depth: number,
  onArrive?: () => void,
) {
  if (usesGroundAoECastMarker(skillId)) {
    onArrive?.()
    return
  }
  const kind = magicProjectileKindForSkill(skillId)
  const dist = Math.hypot(toX - fromX, toY - fromY)
  let duration = projectileTravelMs(dist)
  if (kind === 'wind') duration = Math.max(80, Math.floor(duration * 0.65))
  if (kind === 'earth_rise') duration = Math.max(100, Math.floor(duration * 0.5))

  const container = buildMagicProjectileGraphic(scene, kind)
  const useArc = kind === 'water' || kind === 'staff_basic' || kind === 'fire' || kind === 'ghost'
  const sparkColor =
    kind === 'fire'
      ? 0xf97316
      : kind === 'water'
        ? 0x38bdf8
        : kind === 'wind'
          ? 0xfde047
          : kind === 'ghost'
            ? 0xa78bfa
            : kind === 'earth' || kind === 'earth_rise'
              ? 0xa8a29e
              : 0x7dd3fc

  if (kind === 'earth_rise') {
    const riseFromY = toY + 28
    container.setPosition(toX, riseFromY)
    container.setDepth(depth)
    scene.tweens.add({
      targets: container,
      y: toY - 8,
      alpha: 0.85,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        container.destroy()
        sparkAt(scene, toX, toY - 8, depth, sparkColor)
        onArrive?.()
      },
    })
    return
  }

  tweenProjectile(scene, container, fromX, fromY, toX, toY, depth + 0.02, duration, () => {
    sparkAt(scene, toX, toY, depth + 0.05, sparkColor)
    onArrive?.()
  }, useArc)

  if (kind === 'fire' || kind === 'water' || kind === 'wind') {
    const trail = scene.add.graphics()
    trail.setDepth(depth + 0.01)
    const trailProgress = { t: 0 }
    scene.tweens.add({
      targets: trailProgress,
      t: 1,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        const t = trailProgress.t
        const x = fromX + (toX - fromX) * t
        const arcLift = useArc ? Math.sin(t * Math.PI) * 10 : 0
        const y = fromY + (toY - fromY) * t - arcLift
        trail.clear()
        trail.lineStyle(kind === 'wind' ? 2 : 3, sparkColor, 0.5 * (1 - t * 0.45))
        trail.lineBetween(fromX, fromY, x, y)
      },
      onComplete: () => trail.destroy(),
    })
  }
}

const BOLT_STAGGER_MS = 90

/** Launches one or more skill projectiles from the player toward a combat aim point. */
export function playMagicSkillProjectileVolley(
  scene: Phaser.Scene,
  skillId: string,
  facing: Facing,
  playerX: number,
  playerY: number,
  aimX: number,
  aimY: number,
  depth: number,
  hitCount: number,
  onHit: (hitIndex: number) => void,
  onVolleyComplete?: () => void,
) {
  if (usesGroundAoECastMarker(skillId)) {
    scene.time.delayedCall(0, () => {
      onHit(0)
      onVolleyComplete?.()
    })
    return
  }

  const origin = rangedProjectileOrigin(playerX, playerY, facing)
  const count = Math.max(1, hitCount)
  const stagger = skillId.endsWith('_bolt') ? BOLT_STAGGER_MS : 0

  if (count === 1) {
    playMagicSkillProjectile(scene, skillId, origin.x, origin.y, aimX, aimY, depth, () => {
      onHit(0)
      onVolleyComplete?.()
    })
    return
  }

  let finished = 0
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * stagger, () => {
      playMagicSkillProjectile(scene, skillId, origin.x, origin.y, aimX, aimY, depth, () => {
        onHit(i)
        finished += 1
        if (finished >= count) onVolleyComplete?.()
      })
    })
  }
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
