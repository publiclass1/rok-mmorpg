import Phaser from 'phaser'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../character/characterAppearance'
import { resolveHeadItemId, type EquipSlot } from '../character/characterState'
import { EQUIPMENT } from '../character/equipmentConfig'
import type { Facing } from '../movement/clickToMove'
import {
  applyCharacterPose,
  createCharacterRig,
  defaultCharacterPose,
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
  appearance: CharacterAppearance
}

function syncWeaponLayerForPose(display: PlayerDisplay) {
  const weapon = display.layers.weapon
  if (!weapon?.visible) return
  const { pose } = display
  if (pose.anim === 'attack') {
    const reach = pose.attackPhase === 1 ? (pose.bash ? 16 : 12) : pose.attackPhase === 0 ? 4 : 8
    weapon.setPosition(reach, pose.bash ? 2 : 4)
    weapon.setAngle(pose.bash ? -30 : pose.attackPhase === 1 ? -15 : 0)
  } else {
    weapon.setPosition(8, 4)
    weapon.setAngle(0)
  }
}

function redrawPose(display: PlayerDisplay) {
  applyCharacterPose(display.rig, display.pose, display.appearance)
  syncWeaponLayerForPose(display)
}

export function setPlayerAttackPhase(display: PlayerDisplay, attackPhase: 0 | 1 | 2) {
  display.pose = { ...display.pose, attackPhase }
  redrawPose(display)
}

export function setPlayerHitFlash(display: PlayerDisplay, hitFlash: boolean) {
  display.pose = { ...display.pose, hitFlash }
  redrawPose(display)
}

export function setPlayerToIdle(display: PlayerDisplay, facing: Facing) {
  display.pose = { ...defaultCharacterPose(facing) }
  redrawPose(display)
}

export function createPlayerDisplay(
  scene: Phaser.Scene,
  x: number,
  y: number,
  appearance: CharacterAppearance = DEFAULT_CHARACTER_APPEARANCE,
): PlayerDisplay {
  ensurePlayerAnimationTextures(scene)
  const body = scene.add.sprite(0, 0, 'player_body', '0')
  body.setOrigin(0.5, 0.85)
  body.setVisible(false)

  const rig = createCharacterRig(scene)
  const pose: CharacterPose = defaultCharacterPose('down')

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

  const display: PlayerDisplay = {
    container,
    body,
    rig,
    layers,
    pose,
    appearance: { ...appearance },
  }
  redrawPose(display)
  return display
}

export function setPlayerAppearance(display: PlayerDisplay, appearance: CharacterAppearance) {
  display.appearance = { ...appearance }
  redrawPose(display)
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
  redrawPose(display)
}

export function setPlayerWalkFrame(display: PlayerDisplay, walkFrame: 0 | 1) {
  if (display.pose.anim !== 'walk') return
  display.pose = { ...display.pose, walkFrame }
  redrawPose(display)
}

export function setPlayerSitting(display: PlayerDisplay, sitting: boolean, facing: Facing) {
  display.pose = {
    ...defaultCharacterPose(facing),
    anim: sitting ? 'sit' : 'idle',
  }
  redrawPose(display)
}

export function getPlayerPhysicsSprite(display: PlayerDisplay): Phaser.Types.Physics.Arcade.GameObjectWithBody {
  return display.container as Phaser.Types.Physics.Arcade.GameObjectWithBody
}
