import type { CharacterPose } from '../character/characterPose'
import type { PlayerVisualLayer } from './playerDisplayLayers'

export type EquipPoseOffset = { dx: number; dy: number; rot?: number }

const ZERO: EquipPoseOffset = { dx: 0, dy: 0 }

/** Standing idle head anchor (feet origin); matches drawChibiFrame head ~y-34. */
const STAND_HEAD_Y = -35

function walkOffset(pose: CharacterPose): EquipPoseOffset {
  if (pose.walkFrame === 0) return ZERO
  const sway = pose.facing === 'left' ? -1 : pose.facing === 'right' ? 1 : 0
  return { dx: sway, dy: 2 }
}

function attackHeadOffset(pose: CharacterPose): EquipPoseOffset {
  if (pose.attackPhase === 0) return { dx: 0, dy: -1 }
  if (pose.attackPhase === 1) return { dx: 0, dy: 2 }
  return { dx: 0, dy: 0 }
}

/** Head center in dead sprites (see drawChibiDead), relative to feet. */
function deadHeadAnchor(pose: CharacterPose): { x: number; y: number; rot: number } {
  const collapse = pose.deadFrame === 0
  const f = pose.facing

  if (f === 'down' || f === 'up') {
    if (collapse) {
      return { x: 0, y: -24, rot: f === 'up' ? -0.35 : 0.35 }
    }
    const x = f === 'down' ? 10 : -8
    return { x, y: -12, rot: f === 'down' ? 1.15 : -1.05 }
  }

  const side = f === 'left' ? -1 : 1
  if (collapse) {
    return { x: side * 4, y: -22, rot: side * 0.55 }
  }
  return { x: side * 14, y: -14, rot: side * 1.25 }
}

function deadOffset(slot: PlayerVisualLayer, pose: CharacterPose): EquipPoseOffset {
  const { x, y, rot } = deadHeadAnchor(pose)
  const layerDy = slot === 'headTop' ? -2 : slot === 'headLower' ? 2 : 0
  return {
    dx: x,
    dy: y - STAND_HEAD_Y + layerDy,
    rot,
  }
}

/** Head center while seated (ground sit frame), relative to feet. */
function sitHeadAnchor(): { x: number; y: number } {
  const groundY = -2
  const torsoTop = groundY - 22
  return { x: 0, y: torsoTop - 6 }
}

function sitOffset(slot: PlayerVisualLayer, pose: CharacterPose): EquipPoseOffset {
  const { x, y } = sitHeadAnchor()
  const layerDy = slot === 'headTop' ? -2 : slot === 'headLower' ? 2 : 0
  return {
    dx: x,
    dy: y - STAND_HEAD_Y + layerDy,
  }
}

function flinchOffset(pose: CharacterPose): EquipPoseOffset {
  switch (pose.facing) {
    case 'left':
      return { dx: -2, dy: 1 }
    case 'right':
      return { dx: 2, dy: 1 }
    case 'up':
      return { dx: 0, dy: 0 }
    default:
      return { dx: 0, dy: 1 }
  }
}

export function equipmentPoseOffset(slot: PlayerVisualLayer, pose: CharacterPose): EquipPoseOffset {
  if (slot !== 'headTop' && slot !== 'headMiddle' && slot !== 'headLower') {
    return ZERO
  }
  if (pose.anim === 'walk') {
    return walkOffset(pose)
  }
  if (pose.anim === 'attack') {
    return attackHeadOffset(pose)
  }
  if (pose.anim === 'flinch') {
    return flinchOffset(pose)
  }
  if (pose.anim === 'dead') {
    return deadOffset(slot, pose)
  }
  if (pose.anim === 'sit' && !pose.mounted) {
    return sitOffset(slot, pose)
  }
  return ZERO
}
