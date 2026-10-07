import Phaser from 'phaser'
import type { CharacterPose } from './characterPose'
import type { Facing } from '../movement/clickToMove'
import { idleAnimProfile } from '../player/playerIdleMotion'
import type { PlayerAvatarKey } from '../player/playerJobAvatar'
import { stripFrameIndex, type CharacterSpriteDef } from './characterSpriteRegistry'

export function animKey(textureKey: string, anim: string, facing: Facing): string {
  return `${textureKey}_${anim}_${facing}`
}

export function registerIdleAnimations(scene: Phaser.Scene, textureKey: string, def: CharacterSpriteDef) {
  const facings: Facing[] = ['down', 'left', 'right', 'up']
  for (const facing of facings) {
    const key = animKey(textureKey, 'idle', facing)
    if (scene.anims.exists(key)) continue
    const start = stripFrameIndex(def, facing, def.strips.idle, 0)
    const end = stripFrameIndex(def, facing, def.strips.idle, def.strips.idle.count - 1)
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate: 4,
      repeat: -1,
    })
  }
}

/** Per-job idle: hold / blink pattern from idle strip frames. */
export function registerPlayerIdleAnimations(
  scene: Phaser.Scene,
  textureKey: string,
  def: CharacterSpriteDef,
  avatarKey: PlayerAvatarKey,
) {
  const profile = idleAnimProfile(avatarKey)
  const facings: Facing[] = ['down', 'left', 'right', 'up']
  for (const facing of facings) {
    const key = animKey(textureKey, 'idle', facing)
    if (scene.anims.exists(key)) continue
    const frames = profile.frames.map((step) => {
      const frame = stripFrameIndex(def, facing, def.strips.idle, step)
      return { key: textureKey, frame: `${frame}` }
    })
    scene.anims.create({
      key,
      frames,
      frameRate: profile.frameRate,
      repeat: -1,
    })
  }
}

/** Slow idle for NPCs — same pose, optional blink frames only. */
export function registerNpcIdleAnimations(scene: Phaser.Scene, textureKey: string, def: CharacterSpriteDef) {
  const facings: Facing[] = ['down', 'left', 'right', 'up']
  for (const facing of facings) {
    const key = animKey(textureKey, 'idle', facing)
    if (scene.anims.exists(key)) continue
    const f0 = stripFrameIndex(def, facing, def.strips.idle, 0)
    const f1 =
      def.strips.idle.count > 1
        ? stripFrameIndex(def, facing, def.strips.idle, 1)
        : f0
    scene.anims.create({
      key,
      frames: [
        { key: textureKey, frame: `${f0}` },
        { key: textureKey, frame: `${f0}` },
        { key: textureKey, frame: `${f1}` },
        { key: textureKey, frame: `${f0}` },
      ],
      frameRate: 2,
      repeat: -1,
    })
  }
}

function mountedRiderFrame(def: CharacterSpriteDef, facing: Facing): number {
  return stripFrameIndex(def, facing, def.strips.sit, 0)
}

export function poseToFrameIndex(def: CharacterSpriteDef, pose: CharacterPose): number {
  const { facing, anim } = pose
  if (pose.mounted && (anim === 'idle' || anim === 'walk')) {
    return mountedRiderFrame(def, facing)
  }
  switch (anim) {
    case 'idle':
      return stripFrameIndex(def, facing, def.strips.idle, 0)
    case 'walk': {
      const step = pose.walkFrame === 0 ? 0 : 2
      return stripFrameIndex(def, facing, def.strips.walk, step)
    }
    case 'sit':
      return stripFrameIndex(def, facing, def.strips.sit, 0)
    case 'attack':
      return stripFrameIndex(def, facing, def.strips.attack[pose.attackStyle], pose.attackPhase)
    case 'jump':
      return stripFrameIndex(def, facing, def.strips.jump, 0)
    case 'flinch':
      return stripFrameIndex(def, facing, def.strips.flinch, 0)
    case 'dead':
      return stripFrameIndex(def, facing, def.strips.dead, 0)
    default:
      return stripFrameIndex(def, facing, def.strips.idle, 0)
  }
}

export function applyPoseToSprite(
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  def: CharacterSpriteDef,
  pose: CharacterPose,
) {
  if (pose.anim === 'idle' && !pose.mounted) {
    const key = animKey(textureKey, 'idle', pose.facing)
    if (sprite.anims.currentAnim?.key !== key) {
      sprite.play(key)
    }
    return
  }
  sprite.anims.stop()
  const frame = poseToFrameIndex(def, pose)
  sprite.setTexture(textureKey, `${frame}`)
}
