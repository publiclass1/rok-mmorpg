import Phaser from 'phaser'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../character/characterAppearance'
import { ensurePlayerSwappedTexture } from '../character/characterPaletteSwap'
import { defaultCharacterPose, type CharacterPose } from '../character/characterPose'
import { applyPoseToSprite, registerPlayerIdleAnimations } from '../character/characterSpriteAnim'
import { stopIdleRigTween, syncPlayerIdleRigMotion } from './playerIdleMotion'
import type { CharacterSpriteDef } from '../character/characterSpriteRegistry'
import { createDefaultEquipment, type EquipSlot } from '../character/characterState'
import type { Facing } from '../movement/clickToMove'
import { ensureEquipPlaceholderTexture } from './itemEquipIconTexture'
import {
  MOUNT_BODY_Y_OFFSET,
  type PlayerVisualLayer,
} from './playerDisplayLayers'
import {
  applyPlayerEquipmentLayers,
  syncEquipmentTransforms,
} from './playerEquipmentVisual'
import { syncPlayerRarityGlow, type RarityGlowHost } from './playerRarityGlow'
import type { PlayerAvatarKey } from './playerJobAvatar'

export type { CharacterPose } from '../character/characterPose'
export { defaultCharacterPose } from '../character/characterPose'
export { MOUNT_BODY_Y_OFFSET } from './playerDisplayLayers'
export type { PlayerVisualLayer } from './playerDisplayLayers'

/** Scene reference for nested display parts (Phaser 4 may not set `.scene` on container children). */
export function playerDisplayScene(display: {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
}): Phaser.Scene | undefined {
  return display.container.scene ?? display.body.scene ?? undefined
}

export type PlayerDisplay = RarityGlowHost & {
  container: Phaser.GameObjects.Container
  /** Rider rig (lifted when mounted on peco). */
  riderLayer: Phaser.GameObjects.Container
  /** Body + worn gear move together (attack lunge, frame nudges). */
  bodyRig: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Image>>
  pose: CharacterPose
  appearance: CharacterAppearance
  avatarKey: PlayerAvatarKey
  textureKey: string
  spriteDef: CharacterSpriteDef
  equipment: Record<EquipSlot, string | null>
  idleRigTween?: Phaser.Tweens.Tween
}

function syncSpritePose(display: PlayerDisplay) {
  if (!playerDisplayScene(display)) return
  display.riderLayer.setY(display.pose.mounted ? MOUNT_BODY_Y_OFFSET : 0)
  display.body.setY(0)
  applyPoseToSprite(display.body, display.textureKey, display.spriteDef, display.pose)
  if (display.pose.hitFlash) {
    display.body.setTint(0xffffff)
  } else {
    display.body.clearTint()
  }
  syncEquipmentTransforms(display)
  syncPlayerRarityGlow(display, display.equipment)
  const scene = playerDisplayScene(display)
  if (scene) syncPlayerIdleRigMotion(scene, display)
}

function bindPlayerTexture(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  appearance: CharacterAppearance,
) {
  const { textureKey, def } = ensurePlayerSwappedTexture(scene, appearance, display.avatarKey)
  display.textureKey = textureKey
  display.spriteDef = def
  display.appearance = { ...appearance }
  stopIdleRigTween(display, true)
  registerPlayerIdleAnimations(scene, textureKey, def, display.avatarKey)
  display.body.setTexture(textureKey, '0')
  syncSpritePose(display)
}

export function setPlayerAttackPhase(display: PlayerDisplay, attackPhase: 0 | 1 | 2) {
  display.pose = { ...display.pose, attackPhase }
  syncSpritePose(display)
}

export function setPlayerHitFlash(display: PlayerDisplay, hitFlash: boolean) {
  display.pose = { ...display.pose, hitFlash }
  syncSpritePose(display)
}

export function setPlayerToIdle(display: PlayerDisplay, facing: Facing) {
  display.pose = { ...defaultCharacterPose(facing) }
  syncSpritePose(display)
}

function addEquipImage(scene: Phaser.Scene, placeholderKey: string): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, placeholderKey).setVisible(false)
}

export function createPlayerDisplay(
  scene: Phaser.Scene,
  x: number,
  y: number,
  appearance: CharacterAppearance = DEFAULT_CHARACTER_APPEARANCE,
  avatarKey: PlayerAvatarKey = 'novice',
): PlayerDisplay {
  const placeholderKey = ensureEquipPlaceholderTexture(scene)
  const { textureKey, def } = ensurePlayerSwappedTexture(scene, appearance, avatarKey)
  registerPlayerIdleAnimations(scene, textureKey, def, avatarKey)

  const body = scene.add.sprite(0, 0, textureKey, '0')
  body.setOrigin(0.5, 1)

  const layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Image>> = {}
  const headTop = addEquipImage(scene, placeholderKey)
  const headMiddle = addEquipImage(scene, placeholderKey)
  const headLower = addEquipImage(scene, placeholderKey)
  layers.headTop = headTop
  layers.headMiddle = headMiddle
  layers.headLower = headLower

  const bodyRig = scene.add.container(0, 0, [body, headTop, headMiddle, headLower])
  const riderLayer = scene.add.container(0, 0, [bodyRig])
  const container = scene.add.container(x, y, [riderLayer])
  scene.physics.add.existing(container)
  const bodyPhys = container.body as Phaser.Physics.Arcade.Body
  bodyPhys.setSize(18, 14)
  bodyPhys.setOffset(-9, -14)

  const pose: CharacterPose = defaultCharacterPose('down')

  const display: PlayerDisplay = {
    container,
    riderLayer,
    bodyRig,
    body,
    layers,
    pose,
    appearance: { ...appearance },
    avatarKey,
    textureKey,
    spriteDef: def,
    equipment: createDefaultEquipment(),
  }
  syncSpritePose(display)
  return display
}

export function setPlayerAppearance(display: PlayerDisplay, appearance: CharacterAppearance) {
  const scene = playerDisplayScene(display)
  if (!scene) return
  bindPlayerTexture(scene, display, appearance)
}

export function setPlayerJobAvatar(display: PlayerDisplay, avatarKey: PlayerAvatarKey) {
  if (display.avatarKey === avatarKey) return
  display.avatarKey = avatarKey
  const scene = playerDisplayScene(display)
  if (!scene) return
  bindPlayerTexture(scene, display, display.appearance)
}

export function syncPlayerDisplayPosition(display: PlayerDisplay, x: number, y: number) {
  display.container.setPosition(x, y)
}

export function updatePlayerEquipmentLayers(
  display: PlayerDisplay,
  equipment: Record<EquipSlot, string | null>,
) {
  applyPlayerEquipmentLayers(display, equipment)
  syncPlayerRarityGlow(display, equipment)
}

export function playPlayerAnim(display: PlayerDisplay, key: string, facing: Facing) {
  const anim = key === 'sit' ? 'sit' : (key as CharacterPose['anim'])
  const resolved =
    anim === 'walk' ||
    anim === 'attack' ||
    anim === 'jump' ||
    anim === 'sit' ||
    anim === 'idle' ||
    anim === 'flinch' ||
    anim === 'dead'
      ? anim
      : 'idle'
  display.pose = {
    ...display.pose,
    facing,
    anim: resolved,
    attackPhase: resolved === 'attack' ? display.pose.attackPhase : 0,
    bash: resolved === 'attack' ? display.pose.bash : false,
    hitFlash: resolved === 'flinch' ? display.pose.hitFlash : false,
    deadFrame: resolved === 'dead' ? display.pose.deadFrame : 0,
  }
  syncSpritePose(display)
}

export function setPlayerDeadFrame(display: PlayerDisplay, deadFrame: 0 | 1) {
  if (display.pose.anim !== 'dead') return
  display.pose = { ...display.pose, deadFrame }
  syncSpritePose(display)
}

export function setPlayerWalkFrame(display: PlayerDisplay, walkFrame: 0 | 1) {
  if (display.pose.anim !== 'walk') return
  display.pose = { ...display.pose, walkFrame }
  syncSpritePose(display)
}

export function setPlayerMounted(display: PlayerDisplay, mounted: boolean) {
  if (display.pose.mounted === mounted) {
    if (mounted) syncSpritePose(display)
    return
  }
  display.pose = { ...display.pose, mounted }
  syncSpritePose(display)
}

export function setPlayerSitting(display: PlayerDisplay, sitting: boolean, facing: Facing) {
  display.pose = {
    ...defaultCharacterPose(facing),
    anim: sitting ? 'sit' : 'idle',
  }
  syncSpritePose(display)
}

export function getPlayerPhysicsSprite(display: PlayerDisplay): Phaser.Types.Physics.Arcade.GameObjectWithBody {
  return display.container as Phaser.Types.Physics.Arcade.GameObjectWithBody
}
