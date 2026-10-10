export type GearRarityId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'artifact'

export type PrimaryStat = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk'

export type WeaponClass = 'unarmed' | 'knife' | 'sword' | 'spear' | 'staff' | 'bow'

export type RolledDamageEffectKind = 'melee' | 'range' | 'magic'

export type RolledGearAffix =
  | { pool: 'primary'; stat: PrimaryStat; value: number }
  | { pool: 'combat'; kind: CombatAffixKind; value: number }

export type CombatAffixKind =
  | 'def'
  | 'mdef'
  | 'critRate'
  | 'critResist'
  | 'hpPercent'
  | 'spPercent'
  | 'aspd'
  | 'atk'
  | 'atkPercent'
  | 'matk'
  | 'matkPercent'
  | 'defPercent'
  | 'mdefPercent'

export type RolledItemEffect =
  | { kind: RolledDamageEffectKind; level?: 1 | 2 | 3 | 4; percent: number }
  | { kind: 'critDamage'; level: 1 | 2 | 3 | 4; percent: number }
  | { kind: 'damageReduction'; level: 1 | 2 | 3 | 4; percent: number }
  | { kind: 'critChance'; percent: number }

export type RoItem = {
  id: string
  type: string
  equipSlot?: string | null
  bonuses?: Record<string, number> | null
  layerColor?: string | null
  rarity?: GearRarityId
  requiredBaseLevel?: number
  weaponClass?: WeaponClass
}

export type RolledItem = {
  id: string
  baseItemId: string
  rarity: GearRarityId
  requiredBaseLevel: number
  stats: Partial<Record<PrimaryStat, number>>
  affixes: RolledGearAffix[]
  effect: RolledItemEffect | null
  slots: 2
  cards: [string | null, string | null]
}
