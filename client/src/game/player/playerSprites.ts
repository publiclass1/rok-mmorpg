import Phaser from 'phaser'
import { resolveHeadItemId, type EquipSlot } from '../character/characterState'
import { EQUIPMENT } from '../character/equipmentConfig'
import type { Facing } from '../movement/clickToMove'
import {
  applyCharacterPose,
  createCharacterRig,
  type CharacterPose,
  type CharacterRig,
} from './playerCharacterRig'

const FRAME_W = 24
const FRAME_H = 28

/** Invisible sprite used only for animation timing / legacy hooks. */
function ensurePlayerAnimationTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('player_body')) return

  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0)
  g.fillRect(0, 0, FRAME_W, FRAME_H)
  g.fillRect(FRAME_W, 0, FRAME_W, FRAME_H)
  g.generateTexture('player_body', FRAME_W * 2, FRAME_H)
  g.destroy()

  const tex = scene.textures.get('player_body')
  if (!tex.has('0')) {
    tex.add('0', 0, 0, 0, FRAME_W, FRAME_H)
    tex.add('1', 0, FRAME_W, 0, FRAME_W, FRAME_H)
  }
}

export type PlayerVisualLayer = 'weapon' | 'armor' | 'head' | 'offhand'

export type PlayerDisplay = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  rig: CharacterRig
  layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>>
  pose: CharacterPose
}

export function createPlayerDisplay(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerDisplay {
  ensurePlayerAnimationTextures(scene)
  const body = scene.add.sprite(0, 0, 'player_body', '0')
  body.setOrigin(0.5, 0.85)
  body.setVisible(false)

  const rig = createCharacterRig(scene)
  const pose: CharacterPose = { facing: 'down', anim: 'idle', walkFrame: 0 }

  const layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>> = {}
  const weapon = scene.add.rectangle(8, 4, 10, 4, 0xc0c0c0).setVisible(false)
  const armor = scene.add.rectangle(0, 8, 18, 12, 0xf5f5dc, 0.7).setVisible(false)
  const head = scene.add.rectangle(0, -10, 16, 6, 0x8b4513).setVisible(false)
  const offhand = scene.add.rectangle(-8, 6, 8, 10, 0x6b7280).setVisible(false)
  layers.weapon = weapon
  layers.armor = armor
  layers.head = head
  layers.offhand = offhand

  const container = scene.add.container(x, y, [rig.root, armor, head, offhand, weapon])
  scene.physics.add.existing(container)
  const bodyPhys = container.body as Phaser.Physics.Arcade.Body
  bodyPhys.setSize(18, 14)
  bodyPhys.setOffset(-9, -12)

  return { container, body, rig, layers, pose }
}

export function syncPlayerDisplayPosition(display: PlayerDisplay, x: number, y: number) {
  display.container.setPosition(x, y)
}

export function updatePlayerEquipmentLayers(
  display: PlayerDisplay,
  equipment: Record<EquipSlot, string | null>,
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

  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const def = EQUIPMENT[itemId]
    if (!def) continue
    if (def.slot === 'headTop' || def.slot === 'headMiddle' || def.slot === 'headLower') continue
    if (def.slot === 'offhand') {
      show('offhand', true, def.layerColor)
      continue
    }
    if (def.slot === 'weapon') show('weapon', true, def.layerColor)
    else if (def.slot === 'armor') show('armor', true, def.layerColor, 0.7)
  }

  const headItemId = resolveHeadItemId(equipment)
  if (headItemId) {
    const def = EQUIPMENT[headItemId]
    if (def) show('head', true, def.layerColor)
  }
}

export function playPlayerAnim(display: PlayerDisplay, key: string, facing: Facing) {
  const anim = key === 'sit' ? 'sit' : (key as CharacterPose['anim'])
  display.pose = {
    ...display.pose,
    facing,
    anim: anim === 'walk' || anim === 'attack' || anim === 'jump' || anim === 'sit' || anim === 'idle' ? anim : 'idle',
  }
  applyCharacterPose(display.rig, display.pose)
}

export function setPlayerWalkFrame(display: PlayerDisplay, walkFrame: 0 | 1) {
  if (display.pose.anim !== 'walk') return
  display.pose = { ...display.pose, walkFrame }
  applyCharacterPose(display.rig, display.pose)
}

export function setPlayerSitting(display: PlayerDisplay, sitting: boolean, facing: Facing) {
  display.pose = {
    facing,
    anim: sitting ? 'sit' : 'idle',
    walkFrame: 0,
  }
  applyCharacterPose(display.rig, display.pose)
}

export function getPlayerPhysicsSprite(display: PlayerDisplay): Phaser.Types.Physics.Arcade.GameObjectWithBody {
  return display.container as Phaser.Types.Physics.Arcade.GameObjectWithBody
}
