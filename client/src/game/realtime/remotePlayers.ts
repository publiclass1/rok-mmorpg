import Phaser from 'phaser'
import type { EquipSlot } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'
import { appearanceKey } from '../character/characterAppearance'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerAppearance,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { startPlayerAttackAnim } from '../player/playerCombatAnim'
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
  label: Phaser.GameObjects.Text
  targetX: number
  targetY: number
  lastPayload: PlayerPresencePayload
  equipmentKey: string
  appearanceKey: string
}

function equipmentKey(equipment: Record<EquipSlot, string | null>): string {
  return EQUIP_SLOTS.map((s) => equipment[s] ?? '').join('|')
}

export function spawnRemotePlayer(scene: Phaser.Scene, payload: PlayerPresencePayload): RemotePlayerEntity {
  const display = createPlayerDisplay(scene, payload.x, payload.y, payload.appearance)
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
  const label = scene.add
    .text(payload.x, payload.y - 28, labelText, { fontSize: '11px', color: payload.isVending ? '#fbbf24' : '#fff' })
    .setOrigin(0.5)

  return {
    display,
    label,
    targetX: payload.x,
    targetY: payload.y,
    lastPayload: payload,
    equipmentKey: eqKey,
    appearanceKey: appearanceKey(payload.appearance),
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

  const labelText = p.isVending ? `${p.name} [Shop]` : p.name
  entity.label.setText(labelText)
  entity.label.setColor(p.isVending ? '#fbbf24' : '#ffffff')
  entity.label.setPosition(container.x, container.y - 28)
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
  startPlayerAttackAnim(scene, entity.display, facing, {
    variant: skillId === 'bash' ? 'bash' : 'basic',
    onComplete: () => {
      playPlayerAnim(entity.display, entity.lastPayload.anim, entity.lastPayload.facing)
    },
  })
  sfx.playAttackNearby(listenerX, listenerY, cx, cy)
}
