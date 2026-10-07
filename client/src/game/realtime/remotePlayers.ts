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
import { resolveJobAvatarKey, type PlayerAvatarKey } from '../player/playerJobAvatar'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerAppearance,
  setPlayerJobAvatar,
  setPlayerMounted,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { attackStyleForWeapon } from '../character/characterSpriteRegistry'
import { getEquippedWeaponClass } from '../combat/playerAttackRange'
import { startPlayerAttackAnim } from '../player/playerCombatAnim'
import { createPlayerChatBubble, type PlayerChatBubble } from '../world/playerChatBubble'
import { positionPlayerNameLabel, styleWorldNameLabel } from '../world/worldNameLabel'
import type { MapCombatSkillId } from './mapCombatTypes'
import type { SfxPlayer } from '../combat/sfx'
import {
  REMOTE_POSITION_EPSILON_PX,
  shouldSnapRemotePosition,
} from './remotePositionSnap'

export { REMOTE_POSITION_EPSILON_PX, REMOTE_SNAP_DISTANCE_PX } from './remotePositionSnap'
export { shouldSnapRemotePosition } from './remotePositionSnap'

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
  chatBubble: PlayerChatBubble
  targetX: number
  targetY: number
  lastPayload: PlayerPresencePayload
  equipmentKey: string
  appearanceKey: string
  jobAvatarKey: PlayerAvatarKey
  inViewport: boolean
}

function equipmentKey(equipment: Record<EquipSlot, string | null>): string {
  return EQUIP_SLOTS.map((s) => equipment[s] ?? '').join('|')
}

function snapRemoteContainerToTarget(entity: RemotePlayerEntity, x: number, y: number) {
  const container = entity.display.container
  if (shouldSnapRemotePosition(container.x, container.y, x, y)) {
    container.setPosition(x, y)
  }
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
  const jobAvatarKey = resolveJobAvatarKey(payload.jobId)
  const display = createPlayerDisplay(scene, payload.x, payload.y, payload.appearance, jobAvatarKey)
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

  const chatBubble = createPlayerChatBubble(scene)

  const entity: RemotePlayerEntity = {
    display,
    pecoMountGfx,
    label,
    chatBubble,
    targetX: payload.x,
    targetY: payload.y,
    lastPayload: payload,
    equipmentKey: eqKey,
    appearanceKey: appearanceKey(payload.appearance),
    jobAvatarKey,
    inViewport: true,
  }
  syncRemotePecoMount(entity, payload, payload.walkFrame)
  return entity
}

export function applyRemotePresence(entity: RemotePlayerEntity, payload: PlayerPresencePayload) {
  snapRemoteContainerToTarget(entity, payload.x, payload.y)
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

  const nextJobAvatarKey = resolveJobAvatarKey(payload.jobId)
  if (nextJobAvatarKey !== entity.jobAvatarKey) {
    entity.jobAvatarKey = nextJobAvatarKey
    setPlayerJobAvatar(entity.display, nextJobAvatarKey)
  }
}

/** Smooth toward last network position and drive walk cycles locally. */
export function tickRemotePlayer(entity: RemotePlayerEntity, _now: number, smoothFactor: number) {
  const container = entity.display.container
  container.x = Phaser.Math.Linear(container.x, entity.targetX, smoothFactor)
  container.y = Phaser.Math.Linear(container.y, entity.targetY, smoothFactor)

  if (
    Math.hypot(entity.targetX - container.x, entity.targetY - container.y) <
    REMOTE_POSITION_EPSILON_PX
  ) {
    container.setPosition(entity.targetX, entity.targetY)
  }

  const p = entity.lastPayload
  const walkFrame = p.walkFrame
  const mounted = Boolean(p.mounted)

  const localAttack = entity.display.pose.anim === 'attack'
  const forcePresenceAnim = p.anim === 'dead' || p.anim === 'sit'
  const pose = entity.display.pose
  const poseChanged =
    pose.anim !== p.anim || pose.facing !== p.facing || pose.mounted !== mounted

  if (!localAttack || forcePresenceAnim) {
    if (poseChanged || forcePresenceAnim) {
      playPlayerAnim(entity.display, p.anim, p.facing)
    }
    if (p.anim === 'walk' && (poseChanged || pose.walkFrame !== walkFrame)) {
      setPlayerWalkFrame(entity.display, walkFrame)
    }
  } else if (p.anim === 'walk' && pose.walkFrame !== walkFrame) {
    setPlayerWalkFrame(entity.display, walkFrame)
  }
  syncRemotePecoMount(entity, p, walkFrame)

  const labelText = p.isVending ? `${p.name} [Shop]` : p.name
  entity.label.setText(labelText)
  styleWorldNameLabel(entity.label, p.isVending ? '#fbbf24' : '#ffffff')
  positionPlayerNameLabel(entity.label, container.x, container.y)
}

export function destroyRemotePlayer(entity: RemotePlayerEntity) {
  entity.chatBubble.destroy()
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
