import Phaser from 'phaser'
import type { EquipSlot } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'

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
  label: Phaser.GameObjects.Text
  targetX: number
  targetY: number
  lastPayload: PlayerPresencePayload
  equipmentKey: string
}

function equipmentKey(equipment: Record<EquipSlot, string | null>): string {
  return EQUIP_SLOTS.map((s) => equipment[s] ?? '').join('|')
}

export function spawnRemotePlayer(scene: Phaser.Scene, payload: PlayerPresencePayload): RemotePlayerEntity {
  const display = createPlayerDisplay(scene, payload.x, payload.y)
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

  const label = scene.add
    .text(payload.x, payload.y - 28, payload.name, { fontSize: '11px', color: '#fff' })
    .setOrigin(0.5)

  return {
    display,
    label,
    targetX: payload.x,
    targetY: payload.y,
    lastPayload: payload,
    equipmentKey: eqKey,
  }
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

  entity.label.setPosition(container.x, container.y - 28)
}

export function destroyRemotePlayer(entity: RemotePlayerEntity) {
  entity.label.destroy()
  entity.display.container.destroy()
}
