/** Procedural NPC look — used when generating master sprite sheets. */
export type NpcArchetype =
  | 'kafra'
  | 'warp_agent'
  | 'save_priest'
  | 'job_master'
  | 'merchant'
  | 'healer'
  | 'dungeon_guide'
  | 'rental_clerk'
  | 'merchant_female'
  | 'guard'
  | 'citizen'
  | 'blacksmith'

export type NpcArchetypePalette = {
  skin: number
  hair: number
  shirt: number
  pants: number
  shoes: number
  eyes: number
  female: boolean
}

export const NPC_ARCHETYPE_PALETTES: Record<NpcArchetype, NpcArchetypePalette> = {
  kafra: {
    skin: 0xffdbac,
    hair: 0xec4899,
    shirt: 0x1d4ed8,
    pants: 0x1e3a8a,
    shoes: 0x111827,
    eyes: 0x111827,
    female: true,
  },
  warp_agent: {
    skin: 0xffdbac,
    hair: 0x1a1a1a,
    shirt: 0x4c1d95,
    pants: 0x312e81,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  save_priest: {
    skin: 0xffdbac,
    hair: 0xc0c0c0,
    shirt: 0xf8fafc,
    pants: 0x64748b,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  job_master: {
    skin: 0xffdbac,
    hair: 0x422006,
    shirt: 0x78350f,
    pants: 0x292524,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  merchant: {
    skin: 0xffdbac,
    hair: 0x4a3728,
    shirt: 0xca8a04,
    pants: 0x713f12,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  healer: {
    skin: 0xffdbac,
    hair: 0xf472b6,
    shirt: 0xffffff,
    pants: 0xe2e8f0,
    shoes: 0x111827,
    eyes: 0x111827,
    female: true,
  },
  dungeon_guide: {
    skin: 0xffdbac,
    hair: 0x7c3aed,
    shirt: 0x312e81,
    pants: 0x1e1b4b,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  rental_clerk: {
    skin: 0xffdbac,
    hair: 0x1e293b,
    shirt: 0x0d9488,
    pants: 0x134e4a,
    shoes: 0x111827,
    eyes: 0x111827,
    female: false,
  },
  merchant_female: { skin: 0xffdbac, hair: 0x7c3aed, shirt: 0xf59e0b, pants: 0x92400e, shoes: 0x111827, eyes: 0x111827, female: true },
  guard: { skin: 0xffdbac, hair: 0x1e293b, shirt: 0x64748b, pants: 0x334155, shoes: 0x111827, eyes: 0x111827, female: false },
  citizen: { skin: 0xffdbac, hair: 0x92400e, shirt: 0x16a34a, pants: 0x854d0e, shoes: 0x292524, eyes: 0x111827, female: false },
  blacksmith: { skin: 0xffdbac, hair: 0x292524, shirt: 0xb45309, pants: 0x44403c, shoes: 0x1c1917, eyes: 0x111827, female: false },
}

export function npcArchetypeFromNpcType(
  npcType: NpcRowNpcType,
): NpcArchetype | null {
  switch (npcType) {
    case 'storage':
      return 'kafra'
    case 'teleport':
      return 'warp_agent'
    case 'save':
      return 'save_priest'
    case 'job_master':
      return 'job_master'
    case 'shop':
      return 'merchant'
    case 'healer':
      return 'healer'
    case 'dungeon':
      return 'dungeon_guide'
    case 'rental':
      return 'rental_clerk'
    default:
      return null
  }
}

type NpcRowNpcType =
  | 'teleport'
  | 'storage'
  | 'save'
  | 'job_master'
  | 'shop'
  | 'healer'
  | 'dungeon'
  | 'rental'
