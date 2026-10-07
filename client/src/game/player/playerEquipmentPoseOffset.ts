import type { CharacterPose } from '../character/characterPose'
import type { PlayerVisualLayer } from './playerDisplayLayers'

export type EquipPoseOffset = { dx: number; dy: number; rot?: number }

const ZERO: EquipPoseOffset = { dx: 0, dy: 0 }

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
  return ZERO
}
