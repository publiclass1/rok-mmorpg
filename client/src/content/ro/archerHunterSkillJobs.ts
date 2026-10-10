/**
 * Pre-Renewal job assignment per iRO Wiki (Archer / Hunter class pages).
 * Used by content validation and client skill sanitization.
 */
export const ARCHER_SKILL_IDS = [
  'owls_eye',
  'vultures_eye',
  'double_strafe',
  'arrow_shower',
  'improve_concentration',
  'arrow_crafting',
] as const

export const HUNTER_SKILL_IDS = [
  'beast_bane',
  'falcon_mastery',
  'steel_crow',
  'blitz_beat',
  'detect',
  'ankle_snare',
  'shockwave_trap',
  'sandman_trap',
  'flasher_trap',
  'freezing_trap',
  'blast_mine',
  'claymore_trap',
  'remove_trap',
  'skid_trap',
  'land_mine',
  'spring_trap',
  'talkie_box',
] as const

const ARCHER_SET = new Set<string>(ARCHER_SKILL_IDS)
const HUNTER_SET = new Set<string>(HUNTER_SKILL_IDS)

export function expectedSkillJobId(skillId: string): 'archer' | 'hunter' | null {
  if (ARCHER_SET.has(skillId)) return 'archer'
  if (HUNTER_SET.has(skillId)) return 'hunter'
  return null
}

export function isArcherOrHunterSkillId(skillId: string): boolean {
  return expectedSkillJobId(skillId) != null
}
