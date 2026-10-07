import type { AttackStyle } from './characterSpriteRegistry'
import type { Facing } from '../movement/clickToMove'

export type CharacterPose = {
  facing: Facing
  anim: 'idle' | 'walk' | 'attack' | 'jump' | 'sit' | 'flinch' | 'dead'
  walkFrame: 0 | 1
  attackPhase: 0 | 1 | 2
  attackStyle: AttackStyle
  bash: boolean
  hitFlash: boolean
  mounted: boolean
  /** Frame within the dead strip (collapse vs lying). */
  deadFrame: 0 | 1
}

export function defaultCharacterPose(facing: Facing = 'down'): CharacterPose {
  return {
    facing,
    anim: 'idle',
    walkFrame: 0,
    attackPhase: 0,
    attackStyle: 'swing',
    bash: false,
    hitFlash: false,
    mounted: false,
    deadFrame: 0,
  }
}
