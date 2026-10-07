import Phaser from 'phaser'
import type { EquipSlot } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'
import { appearanceKey } from '../character/characterAppearance'
import {
  attachPecoMountToDisplay,
  createPecoMount,
  syncPecoMountGfx,
  type PecoMountGfx,
} from '../player/pecoMountVisual'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerAppearance,
  setPlayerMounted,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { attackStyleForWeapon } from '../character/characterSpriteRegistry'
import { getEquippedWeaponClass } from '../combat/playerAttackRange'
import { startPlayerAttackAnim } from '../player/playerCombatAnim'
import { positionPlayerNameLabel, styleWorldNameLabel } from '../world/worldNameLabel'
import type { MapCombatSkillId } from './mapCombatTypes'
import type { SfxPlayer } from '../combat/sfx'

const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'headTop',
  'headMiddle',
  'headLower',
  'armor',
  'garment',
  'boots',
  'offhand',
  'accLeft',
  'accRight',
]

export type RemotePlayerEntity = {
  display: PlayerDisplay
  pecoMountGfx: PecoMountGfx
  label: Phaser.GameObjects.Text
  targetX: number
  targetY: number
  lastPayload: PlayerPresencePayload
  equipmentKey: string
  appearanceKey: string
  inViewport: boolean
}

function equipmentKey(equipment: Record<EquipSlot, string | null>): string {
  return EQUIP_SLOTS.map((s) => equipment[s] ?? '').join('|')
}

function syncRemotePecoMount(entity: RemotePlayerEntity, payload: PlayerPresencePayload, walkFrame: 0 | 1) {
  const mounted = Boolean(payload.mounted)
  setPlayerMounted(entity.display, mounted)
  syncPecoMountGfx(
    entity.pecoMountGfx,
    mounted,
    payload.facing,
    payload.anim,
    walkFrame,
  )
}

export function spawnRemotePlayer(scene: Phaser.Scene, payload: PlayerPresencePayload): RemotePlayerEntity {
  const display = createPlayerDisplay(scene, payload.x, payload.y, payload.appearance)
  const pecoMountGfx = createPecoMount(scene)
  attachPecoMountToDisplay(display, pecoMountGfx)
  const body = display.container.body as Phaser.Physics.Arcade.Body | null
  if (body) {
    body.enable = false
  }

  const eqKey = equipmentKey(payload.equipment)
  updatePlayerEquipmentLayers(display, payload.equipment)
  playPlayerAnim(display, payload.anim, payload.facing)
  if (payload.anim === 'walk') {
    setPlayerWalkFrame(display, payload.walkFrame)
  }

  const labelText = payload.isVending ? `${payload.name} [Shop]` : payload.name
  const label = scene.add.text(payload.x, payload.y, labelText)
  styleWorldNameLabel(label, payload.isVending ? '#fbbf24' : '#ffffff')
  positionPlayerNameLabel(label, payload.x, payload.y)
  label.setVisible(false)

  const entity: RemotePlayerEntity = {
    display,
    pecoMountGfx,
    label,
    targetX: payload.x,
    targetY: payload.y,
    lastPayload: payload,
    equipmentKey: eqKey,
    appearanceKey: appearanceKey(payload.appearance),
    inViewport: true,
  }
  syncRemotePecoMount(entity, payload, payload.walkFrame)
  return entity
}

export function applyRemotePresence(entity: RemotePlayerEntity, payload: PlayerPresencePayload) {
  entity.targetX = payload.x
  entity.targetY = payload.y
  entity.lastPayload = payload

  const nextKey = equipmentKey(payload.equipment)
  if (nextKey !== entity.equipmentKey) {
    entity.equipmentKey = nextKey
    updatePlayerEquipmentLayers(entity.display, payload.equipment)
  }

  const nextAppearanceKey = appearanceKey(payload.appearance)
  if (nextAppearanceKey !== entity.appearanceKey) {
    entity.appearanceKey = nextAppearanceKey
    setPlayerAppearance(entity.display, payload.appearance)
  }
}

/** Smooth toward last network position and drive walk cycles locally. */
export function tickRemotePlayer(entity: RemotePlayerEntity, now: number, smoothFactor: number) {
  const container = entity.display.container
  container.x = Phaser.Math.Linear(container.x, entity.targetX, smoothFactor)
  container.y = Phaser.Math.Linear(container.y, entity.targetY, smoothFactor)

  const p = entity.lastPayload
  let walkFrame = p.walkFrame
  if (p.anim === 'walk') {
    walkFrame = (Math.floor(now / 150) % 2) as 0 | 1
  }

  playPlayerAnim(entity.display, p.anim, p.facing)
  if (p.anim === 'walk') {
    setPlayerWalkFrame(entity.display, walkFrame)
  }
  syncRemotePecoMount(entity, p, walkFrame)

  const labelText = p.isVending ? `${p.name} [Shop]` : p.name
  entity.label.setText(labelText)
  styleWorldNameLabel(entity.label, p.isVending ? '#fbbf24' : '#ffffff')
  positionPlayerNameLabel(entity.label, container.x, container.y)
}

export function destroyRemotePlayer(entity: RemotePlayerEntity) {
  entity.label.destroy()
  entity.display.container.destroy()
}

export function playRemotePlayerAction(
  scene: Phaser.Scene,
  entity: RemotePlayerEntity,
  facing: PlayerPresencePayload['facing'],
  skillId: MapCombatSkillId,
  listenerX: number,
  listenerY: number,
  sfx: SfxPlayer,
) {
  const cx = entity.display.container.x
  const cy = entity.display.container.y
  const attackStyle = attackStyleForWeapon(getEquippedWeaponClass(entity.lastPayload.equipment))
  startPlayerAttackAnim(scene, entity.display, facing, {
    variant: skillId === 'bash' ? 'bash' : 'basic',
    attackStyle,
    onComplete: () => {
      playPlayerAnim(entity.display, entity.lastPayload.anim, entity.lastPayload.facing)
    },
  })
  sfx.playAttackNearby(listenerX, listenerY, cx, cy)
}
