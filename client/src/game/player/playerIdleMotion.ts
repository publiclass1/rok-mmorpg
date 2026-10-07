import Phaser from 'phaser'
import type { PlayerAvatarKey } from './playerJobAvatar'
export type IdleRigMotionHost = {
  avatarKey: PlayerAvatarKey
  pose: { anim: string; mounted: boolean }
  bodyRig: Phaser.GameObjects.Container
  idleRigTween?: Phaser.Tweens.Tween
}

export type PlayerIdleSpritePose = {
  bob: number
  armSwing: number
  legSpread: number
}

export type PlayerIdleAnimProfile = {
  frameRate: number
  /** Indices within the idle strip (0 = open eyes, 1 = blink). */
  frames: (0 | 1)[]
}

export type PlayerIdleRigTween = {
  dx: number
  dy: number
  durationMs: number
  ease?: string
}

type IdleConfig = {
  sprite: [PlayerIdleSpritePose, PlayerIdleSpritePose]
  anim: PlayerIdleAnimProfile
  rig: PlayerIdleRigTween
}

const DEFAULT_POSE: PlayerIdleSpritePose = { bob: 0, armSwing: 0, legSpread: 2 }

const IDLE_CONFIG: Record<PlayerAvatarKey, IdleConfig> = {
  novice: {
    sprite: [
      { bob: 0, armSwing: 0, legSpread: 2 },
      { bob: 0, armSwing: 0, legSpread: 2 },
    ],
    anim: { frameRate: 2, frames: [0, 0, 1, 0] },
    rig: { dx: 0, dy: -1, durationMs: 2200, ease: 'Sine.easeInOut' },
  },
  swordman: {
    sprite: [
      { bob: 0, armSwing: 1, legSpread: 3 },
      { bob: -1, armSwing: 2, legSpread: 4 },
    ],
    anim: { frameRate: 2, frames: [0, 0, 0, 1, 0] },
    rig: { dx: 0, dy: -1, durationMs: 2600, ease: 'Sine.easeInOut' },
  },
  knight: {
    sprite: [
      { bob: 0, armSwing: 0, legSpread: 2 },
      { bob: -1, armSwing: 1, legSpread: 3 },
    ],
    anim: { frameRate: 1.6, frames: [0, 0, 0, 0, 1, 0] },
    rig: { dx: 0, dy: -1, durationMs: 3000, ease: 'Sine.easeInOut' },
  },
  mage: {
    sprite: [
      { bob: -1, armSwing: 0, legSpread: 0 },
      { bob: -2, armSwing: -1, legSpread: 0 },
    ],
    anim: { frameRate: 1.8, frames: [0, 0, 0, 1, 0] },
    rig: { dx: 0, dy: -2, durationMs: 2400, ease: 'Sine.easeInOut' },
  },
  archer: {
    sprite: [
      { bob: 0, armSwing: -1, legSpread: 3 },
      { bob: 0, armSwing: 1, legSpread: 4 },
    ],
    anim: { frameRate: 2.2, frames: [0, 0, 1, 0] },
    rig: { dx: 1, dy: -1, durationMs: 2000, ease: 'Sine.easeInOut' },
  },
  hunter: {
    sprite: [
      { bob: 0, armSwing: -1, legSpread: 3 },
      { bob: -1, armSwing: 2, legSpread: 5 },
    ],
    anim: { frameRate: 2, frames: [0, 0, 0, 1, 0] },
    rig: { dx: 1, dy: -1, durationMs: 2100, ease: 'Sine.easeInOut' },
  },
  acolyte: {
    sprite: [
      { bob: -1, armSwing: 0, legSpread: 0 },
      { bob: -2, armSwing: 0, legSpread: 1 },
    ],
    anim: { frameRate: 1.8, frames: [0, 0, 0, 1, 0] },
    rig: { dx: 0, dy: -2, durationMs: 2500, ease: 'Sine.easeInOut' },
  },
  merchant: {
    sprite: [
      { bob: 0, armSwing: 0, legSpread: 3 },
      { bob: 0, armSwing: 1, legSpread: 4 },
    ],
    anim: { frameRate: 2, frames: [0, 0, 1, 0, 0] },
    rig: { dx: 0, dy: -1, durationMs: 2300, ease: 'Sine.easeInOut' },
  },
  thief: {
    sprite: [
      { bob: 0, armSwing: 2, legSpread: 4 },
      { bob: 0, armSwing: -2, legSpread: 5 },
    ],
    anim: { frameRate: 3, frames: [0, 1, 0, 1, 0, 0] },
    rig: { dx: 2, dy: 0, durationMs: 1400, ease: 'Sine.easeInOut' },
  },
}

export function idleSpritePose(avatarKey: PlayerAvatarKey, step: 0 | 1): PlayerIdleSpritePose {
  const cfg = IDLE_CONFIG[avatarKey]
  return cfg?.sprite[step] ?? DEFAULT_POSE
}

export function idleAnimProfile(avatarKey: PlayerAvatarKey): PlayerIdleAnimProfile {
  return IDLE_CONFIG[avatarKey]?.anim ?? { frameRate: 2, frames: [0, 0, 1, 0] }
}

export function idleRigTween(avatarKey: PlayerAvatarKey): PlayerIdleRigTween {
  return IDLE_CONFIG[avatarKey]?.rig ?? { dx: 0, dy: -1, durationMs: 2200, ease: 'Sine.easeInOut' }
}

export function listPlayerIdleConfigKeys(): PlayerAvatarKey[] {
  return Object.keys(IDLE_CONFIG) as PlayerAvatarKey[]
}

function shouldRunIdleRigTween(display: IdleRigMotionHost): boolean {
  const { anim, mounted } = display.pose
  return anim === 'idle' && !mounted
}

export function stopIdleRigTween(display: IdleRigMotionHost, resetRig: boolean) {
  const tween = display.idleRigTween
  if (tween) {
    tween.stop()
    tween.remove()
    display.idleRigTween = undefined
  }
  if (resetRig) {
    display.bodyRig.setPosition(0, 0)
  }
}

/** Looping body rig offset while standing; stopped for walk, combat, mount, etc. */
export function syncPlayerIdleRigMotion(scene: Phaser.Scene, display: IdleRigMotionHost) {
  if (!shouldRunIdleRigTween(display)) {
    const reset =
      display.pose.anim !== 'attack' &&
      display.pose.anim !== 'flinch' &&
      display.pose.anim !== 'dead'
    stopIdleRigTween(display, reset)
    return
  }

  const existing = display.idleRigTween
  if (existing?.isPlaying()) return

  stopIdleRigTween(display, true)
  const spec = idleRigTween(display.avatarKey)
  const rig = display.bodyRig
  display.idleRigTween = scene.tweens.add({
    targets: rig,
    x: spec.dx,
    y: spec.dy,
    duration: spec.durationMs,
    ease: spec.ease ?? 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  })
}
