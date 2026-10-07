import Phaser from 'phaser'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../character/characterAppearance'
import { ensurePlayerSwappedTexture } from '../character/characterPaletteSwap'
import { defaultCharacterPose, type CharacterPose } from '../character/characterPose'
import { applyPoseToSprite, registerIdleAnimations } from '../character/characterSpriteAnim'
import type { CharacterSpriteDef } from '../character/characterSpriteRegistry'
import type { EquipSlot } from '../character/characterState'
import type { Facing } from '../movement/clickToMove'

export type { CharacterPose } from '../character/characterPose'
export { defaultCharacterPose } from '../character/characterPose'

/** Rider anchor lift so seated legs rest on the peco saddle (see pecoMountVisual saddle ~y-24). */
export const MOUNT_BODY_Y_OFFSET = -10

export type PlayerVisualLayer = 'weapon' | 'armor' | 'head' | 'offhand'

export type PlayerDisplay = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>>
  pose: CharacterPose
  appearance: CharacterAppearance
  textureKey: string
  spriteDef: CharacterSpriteDef
}

function syncSpritePose(display: PlayerDisplay) {
  display.body.setY(display.pose.mounted ? MOUNT_BODY_Y_OFFSET : 0)
  applyPoseToSprite(display.body, display.textureKey, display.spriteDef, display.pose)
  if (display.pose.hitFlash) {
    display.body.setTint(0xffffff)
  } else {
    display.body.clearTint()
  }
}

function bindPlayerTexture(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  appearance: CharacterAppearance,
) {
  const { textureKey, def } = ensurePlayerSwappedTexture(scene, appearance)
  display.textureKey = textureKey
  display.spriteDef = def
  display.appearance = { ...appearance }
  registerIdleAnimations(scene, textureKey, def)
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

export function createPlayerDisplay(
  scene: Phaser.Scene,
  x: number,
  y: number,
  appearance: CharacterAppearance = DEFAULT_CHARACTER_APPEARANCE,
): PlayerDisplay {
  const { textureKey, def } = ensurePlayerSwappedTexture(scene, appearance)
  registerIdleAnimations(scene, textureKey, def)

  const body = scene.add.sprite(0, 0, textureKey, '0')
  body.setOrigin(0.5, 1)

  const layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>> = {}
  const weapon = scene.add.rectangle(8, -20, 10, 4, 0xc0c0c0).setVisible(false)
  const armor = scene.add.rectangle(0, -16, 18, 12, 0xf5f5dc, 0.7).setVisible(false)
  const head = scene.add.rectangle(0, -34, 16, 6, 0x8b4513).setVisible(false)
  const offhand = scene.add.rectangle(-8, -22, 8, 10, 0x6b7280).setVisible(false)
  layers.weapon = weapon
  layers.armor = armor
  layers.head = head
  layers.offhand = offhand

  const container = scene.add.container(x, y, [body, armor, head, offhand, weapon])
  scene.physics.add.existing(container)
  const bodyPhys = container.body as Phaser.Physics.Arcade.Body
  bodyPhys.setSize(18, 14)
  bodyPhys.setOffset(-9, -14)

  const pose: CharacterPose = defaultCharacterPose('down')

  const display: PlayerDisplay = {
    container,
    body,
    layers,
    pose,
    appearance: { ...appearance },
    textureKey,
    spriteDef: def,
  }
  syncSpritePose(display)
  return display
}

export function setPlayerAppearance(display: PlayerDisplay, appearance: CharacterAppearance) {
  bindPlayerTexture(display.body.scene, display, appearance)
}

export function syncPlayerDisplayPosition(display: PlayerDisplay, x: number, y: number) {
  display.container.setPosition(x, y)
}

export function updatePlayerEquipmentLayers(
  display: PlayerDisplay,
  _equipment: Record<EquipSlot, string | null>,
) {
  const show = (layerKey: PlayerVisualLayer, visible: boolean, color?: number, alpha = 1) => {
    const layer = display.layers[layerKey]
    if (!layer) return
    layer.setVisible(visible)
    if (color !== undefined) layer.setFillStyle(color, alpha)
  }
  show('weapon', false)
  show('armor', false)
  show('head', false)
  show('offhand', false)
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
  }
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
