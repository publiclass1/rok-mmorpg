/**
 * Pre-Renewal job assignment per iRO Wiki (Archer / Hunter class pages).
 * Used by content validation and client skill sanitization.
 */
export const ARCHER_SKILL_IDS = [
  'owls_eye',
  'vultures_eye',
  'double_strafe',
  'arrow_shower',
  'arrow_crafting',
  'ankle_snare',
  'shockwave_trap',
  'sandman_trap',
  'flasher_trap',
  'freezing_trap',
  'blast_mine',
  'claymore_trap',
  'remove_trap',
] as const

export const HUNTER_SKILL_IDS = [
  'beast_bane',
  'falcon_mastery',
  'blitz_beat',
  'detect',
  'land_mine',
  'spring_trap',
  'talk_with_cute_pet',
] as const

const ARCHER_SET = new Set<string>(ARCHER_SKILL_IDS)
const HUNTER_SET = new Set<string>(HUNTER_SKILL_IDS)

export function expectedSkillJobId(skillId: string): 'archer' | 'hunter' | null {
  if (ARCHER_SET.has(skillId)) return 'archer'
  if (HUNTER_SET.has(skillId)) return 'hunter'
  return null
}
