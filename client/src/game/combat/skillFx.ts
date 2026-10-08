import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'
import { usesGroundAoECastMarker } from './groundAoECastMarker'

export type SkillFxContext = {
  playerX: number
  playerY: number
  facing: Facing
  depth: number
  targetX?: number
  targetY?: number
}

function tweenFadeDestroy(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  duration = 280,
  extra?: Phaser.Types.Tweens.TweenBuilderConfig,
) {
  scene.tweens.add({
    targets: target,
    alpha: 0,
    duration,
    ease: 'Sine.easeOut',
    ...extra,
    onComplete: () => target.destroy(),
  })
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

function lineBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tx: number,
  ty: number,
  depth: number,
  color: number,
) {
  const g = scene.add.graphics()
  g.setDepth(depth)
  g.lineStyle(3, color, 0.95)
  g.lineBetween(x, y, tx, ty)
  tweenFadeDestroy(scene, g, 220)
}

function spinArc(scene: Phaser.Scene, x: number, y: number, depth: number, color: number) {
  const g = scene.add.graphics()
  g.setPosition(x, y)
  g.setDepth(depth)
  g.lineStyle(4, color, 0.9)
  g.beginPath()
  g.arc(0, 0, 22, 0, Math.PI * 1.6, false)
  g.strokePath()
  scene.tweens.add({
    targets: g,
    rotation: Math.PI * 2,
    alpha: 0,
    duration: 340,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  })
}

function speedStreaks(scene: Phaser.Scene, x: number, y: number, depth: number) {
  for (let i = 0; i < 6; i++) {
    const g = scene.add.graphics()
    g.setDepth(depth)
    const ox = (i - 2.5) * 8
    g.lineStyle(2, 0xf8fafc, 0.7)
    g.lineBetween(x + ox, y - 4, x + ox - 6, y + 10)
    tweenFadeDestroy(scene, g, 260 + i * 20)
  }
}

/** In-world cast feedback (Phaser graphics + tweens). */
export function playSkillCastFx(scene: Phaser.Scene, skillId: string, ctx: SkillFxContext) {
  const { playerX, playerY, depth, targetX, targetY } = ctx
  const tx = targetX ?? playerX
  const ty = targetY ?? playerY

  switch (skillId) {
    case 'provoke':
      expandingRing(scene, tx, ty - 20, depth, 0xef4444, 1.8, 280)
      lineBurst(scene, playerX, playerY - 16, tx, ty - 20, depth, 0xf87171)
      break
    case 'endure':
      expandingRing(scene, playerX, playerY - 8, depth, 0x60a5fa, 1.6, 360)
      break
    case 'magnum':
      expandingRing(scene, playerX, playerY, depth, 0xf97316, 2.4, 380)
      expandingRing(scene, playerX, playerY, depth + 0.01, 0xfbbf24, 1.5, 300)
      break
    case 'pierce':
      lineBurst(scene, playerX, playerY - 12, tx, ty - 16, depth, 0xe2e8f0)
      lineBurst(scene, playerX, playerY - 12, tx + (tx - playerX) * 0.3, ty - 16, depth, 0xcbd5e1)
      break
    case 'brandish_spear':
      spinArc(scene, playerX, playerY - 10, depth, 0xa5b4fc)
      break
    case 'spear_stab':
      lineBurst(scene, playerX, playerY - 12, tx, ty - 16, depth, 0xf1f5f9)
      break
    case 'spear_boomerang': {
      const dot = scene.add.circle(playerX, playerY - 14, 4, 0xe2e8f0, 1)
      dot.setDepth(depth)
      scene.tweens.add({
        targets: dot,
        x: tx,
        y: ty - 18,
        duration: 160,
        ease: 'Sine.easeOut',
        yoyo: true,
        onComplete: () => dot.destroy(),
      })
      break
    }
    case 'twohand_quicken':
      speedStreaks(scene, playerX, playerY - 8, depth)
      break
    case 'counter_attack':
      expandingRing(scene, playerX, playerY - 10, depth, 0xfbbf24, 1.4, 300)
      break
    case 'bowling_bash':
      expandingRing(scene, tx, ty - 12, depth, 0xfde68a, 2, 320)
      break
    case 'peco_peco_ride':
      expandingRing(scene, playerX, playerY, depth, 0xa3a3a3, 1.5, 260)
      break
    case 'fire_bolt':
    case 'cold_bolt':
    case 'lightning_bolt':
    case 'fire_ball':
    case 'frost_diver':
    case 'water_ball':
    case 'jupitel_thunder':
    case 'earth_spike':
    case 'meteor_storm':
    case 'lord_of_vermilion':
    case 'frost_nova':
    case 'storm_gust':
    case 'heavens_drive':
    case 'napalm_beat':
    case 'soul_strike':
    case 'stone_curse':
      playSkillCastWindup(scene, playerX, playerY - 12, depth, skillId)
      break
    case 'energy_coat':
      expandingRing(scene, playerX, playerY - 8, depth, 0x3b82f6, 1.5, 360)
      break
    case 'safety_wall':
    case 'ice_wall':
      expandingRing(scene, tx, ty - 8, depth, 0x94a3b8, 2, 400)
      break
    case 'quagmire':
      expandingRing(scene, tx, ty, depth, 0x78350f, 2.2, 380)
      break
    case 'sight':
    case 'sense':
      expandingRing(scene, playerX, playerY - 10, depth, 0xfbbf24, 1.3, 300)
      break
    case 'dispell':
      expandingRing(scene, tx, ty - 18, depth, 0x6366f1, 1.6, 280)
      break
    case 'magic_rod':
      expandingRing(scene, playerX, playerY - 8, depth, 0x7c3aed, 1.2, 280)
      break
    case 'bash':
    default:
      break
  }
}

function playSkillCastWindup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  skillId: string,
) {
  const color =
    skillId.includes('fire') || skillId === 'meteor_storm' || skillId === 'lord_of_vermilion'
      ? 0xf97316
      : skillId.includes('cold') ||
          skillId.includes('frost') ||
          skillId.includes('water') ||
          skillId === 'storm_gust'
        ? 0x38bdf8
        : skillId.includes('lightning') || skillId === 'jupitel_thunder'
          ? 0xfde047
          : skillId.includes('earth') || skillId === 'stone_curse'
            ? 0xa8a29e
            : 0xa78bfa
  expandingRing(scene, x, y, depth, color, 1.2, 240)
}

/** Impact FX when a magic projectile reaches its aim point. */
export function playSkillImpactFx(
  scene: Phaser.Scene,
  skillId: string,
  x: number,
  y: number,
  depth: number,
) {
  if (usesGroundAoECastMarker(skillId)) return
  const ty = y
  switch (skillId) {
    case 'fire_bolt':
    case 'fire_ball':
    case 'meteor_storm':
    case 'lord_of_vermilion':
      expandingRing(scene, x, ty, depth, 0xef4444, 1.6, 280)
      break
    case 'cold_bolt':
    case 'frost_diver':
    case 'frost_nova':
    case 'storm_gust':
    case 'water_ball':
      expandingRing(scene, x, ty, depth, 0x0ea5e9, 1.5, 300)
      break
    case 'lightning_bolt':
    case 'jupitel_thunder':
      expandingRing(scene, x, ty, depth, 0xeab308, 1.4, 260)
      lineBurst(scene, x, ty - 24, x, ty, depth, 0xfde047)
      break
    case 'napalm_beat':
    case 'soul_strike':
      expandingRing(scene, x, ty, depth, 0xa78bfa, 1.7, 320)
      break
    case 'stone_curse':
    case 'earth_spike':
    case 'heavens_drive':
      expandingRing(scene, x, ty, depth, 0xa8a29e, 1.8, 340)
      break
    case 'dispell':
      expandingRing(scene, x, ty, depth, 0x6366f1, 1.6, 280)
      break
    default:
      expandingRing(scene, x, ty, depth, 0x7dd3fc, 1.4, 260)
      break
  }
}

