import type { Facing } from '../movement/clickToMove'

export type CharacterPose = {
  facing: Facing
  anim: 'idle' | 'walk' | 'attack' | 'jump' | 'sit' | 'flinch' | 'dead'
  walkFrame: 0 | 1
  attackPhase: 0 | 1 | 2
  bash: boolean
  hitFlash: boolean
}

export function defaultCharacterPose(facing: Facing = 'down'): CharacterPose {
  return {
    facing,
    anim: 'idle',
    walkFrame: 0,
    attackPhase: 0,
    bash: false,
    hitFlash: false,
  }
}
