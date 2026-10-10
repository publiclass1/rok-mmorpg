export type RoManifest = {
  schemaVersion: number
  contentPackId: string
  ruleset: string
  description?: string
}

export type RoJob = {
  id: string
  name: string
  maxJobLevel: number
  parentJobId: string | null
  /** Procedural player body silhouette key (see playerJobAvatar.ts). */
  avatarKey?: string | null
  /** iRO Classic Max HP: HP_JOB_A (wiki job modifier table). */
  hpJobA?: number
  /** iRO Classic Max HP: HP_JOB_B (parenthetical value, default 5). */
  hpJobB?: number
  /** iRO Classic Max SP: SP_JOB per base level. */
  spJob?: number
  /** Pre-Renewal transcendent max HP/SP multiplier (1.25 when true). */
  transcendent?: boolean
  sourceUrl?: string | null
}

export type SkillPrerequisite = {
  skillId: string
  level: number
}

export type RoSkillSelfBuff = {
  statusId: string
  durationMsBase: number
  durationMsPerLevel?: number
}

export type RoSkillMagicElement = 'fire' | 'water' | 'wind' | 'earth' | 'ghost' | 'neutral'

export type RoSkillMagic = {
  element: RoSkillMagicElement
  /** Bolt skills: one hit per skill level. */
  hitsEqualLevel?: boolean
  /** Ground / nova AoE radius in pixels. */
  aoeRadius?: number
  skillModifierBase?: number
  skillModifierPerLevel?: number
}

/** Bow / ranged physical skills (not magic MATK). */
export type RoSkillPhysical = {
  /** Fixed projectile hits (e.g. Double Strafe = 2). */
  hitCount?: number
  /** One hit per skill level when true. */
  hitsEqualLevel?: boolean
  aoeRadius?: number
  skillModifierBase?: number
  skillModifierPerLevel?: number
}

export type RoSkill = {
  id: string
  name: string
  jobId: string
  maxLevel: number
  requiredJobLevel: number
  type: 'active' | 'passive'
  target: 'enemy' | 'self' | 'ally' | 'ground'
  mpCost: number
  castTimeMs: number
  range: number
  prerequisites: SkillPrerequisite[]
  description: string
  sourceUrl?: string | null
  /** Override path under /skills/; default `{id}.svg` */
  iconFile?: string | null
  selfBuff?: RoSkillSelfBuff
  magic?: RoSkillMagic
  physical?: RoSkillPhysical
  /** Mob-only skill damage scale vs normal hit. */
  mobDamageMultiplier?: number
}

export type StatBonusJson = {
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
}

export type RoCombatBonuses = {
  critChance?: number
}

export type RoConsumableBuff = {
  durationMs: number
  aspd?: number
  atk?: number
  matk?: number
  def?: number
  mdef?: number
}

export type RoConsumableEffect = {
  healHp?: number
  healSp?: number
  buff?: RoConsumableBuff
}

export type WeaponClass = 'unarmed' | 'knife' | 'sword' | 'spear' | 'staff' | 'bow'

export type RoItem = {
  id: string
  name: string
  type: 'consumable' | 'weapon' | 'armor' | 'etc' | 'ammo' | 'card'
  weight: number
  stackMax: number
  equipSlot: string | null
  layerColor: string | null
  bonuses: StatBonusJson | null
  combatBonuses?: RoCombatBonuses
  weaponAtk?: number
  weaponSize?: 'small' | 'medium' | 'large'
  attackElement?: string
  /** Player basic-attack reach class; required when type is weapon. */
  weaponClass?: WeaponClass
  consumable?: RoConsumableEffect
  /** Minimum base level to equip; defaults to 1 when omitted. */
  requiredBaseLevel?: number
  /** When set, current job must be one of these ids; omitted means all jobs. */
  requiredJobIds?: string[]
  /** Offhand subtype for combat rules (e.g. shield ASPD penalty). */
  offhandKind?: 'shield'
  sourceUrl?: string | null
  /** Override path under public root; weapons default to `/items/weapons/{id}.svg` */
  iconFile?: string | null
  /** NPC showcase tier — cosmetic glow/UI only when set on base items. */
  rarity?: GearRarityId
  /** When false, item cannot be chosen as a dungeon rolled-gear base. Default true. */
  dungeonRollable?: boolean
}

export type RoJobStarterPiece = {
  slot: string
  baseItemId: string
}

export type RoJobStarterGearConfig = {
  kits: Record<string, { pieces: RoJobStarterPiece[] }>
}

export type RoJobChangeOfferJson = {
  jobId: string
  fromJobId?: string
  requiredJobLevel: number
  requiredBaseLevel?: number
  zenyCost?: number
}

export type RoJobMasterConfig = {
  offersByNpcId: Record<string, RoJobChangeOfferJson[]>
}

export type RoRentalKind = 'cart' | 'peco_peco' | 'falcon'

export type RoRentalDurationTierId = '1d' | '3d' | '7d' | '30d'

export type RoRentalDurationTier = {
  id: RoRentalDurationTierId
  label: string
  days: number
}

export type RoRentalCatalogEntry = {
  name: string
  speedMultiplier: number
  requiredJobIds: string[]
  requiredSkills: SkillPrerequisite[]
  sourceUrl?: string | null
}

export type RoRentalsConfig = {
  zenyPerDay: number
  durationTiers: RoRentalDurationTier[]
  catalog: Record<RoRentalKind, RoRentalCatalogEntry>
  offersByNpcId: Record<string, RoRentalKind[]>
}

export type RoAspdWeaponClass = WeaponClass | 'unarmed'

export type RoAspdJobRow = {
  jobId: string
  shieldAspdPenalty: number
  baseAspdAt1Agi1Dex: Record<RoAspdWeaponClass, number>
}

export type RoAspdConfig = {
  sourceUrl?: string
  weaponClasses: RoAspdWeaponClass[]
  jobs: RoAspdJobRow[]
}

export type RoExpTables = {
  sourceUrl?: string
  baseLevelCap: number
  jobLevelCap: number
  baseExpToNext: number[]
  jobExpToNext: number[]
  jobBaseHp: Record<string, number[]>
  jobBaseSp: Record<string, number[]>
  statPointsOnBaseLevelUp: number[]
}

export type RoMobDrop = {
  itemId: string
  rate: number
  note?: string
}

export type RoMobRuntime = {
  maxHp: number
  color: string
  aggroRange: number
  attackRange: number
  attackDamage: number
  attackCooldownMs: number
  roamRadius: number
  moveSpeed: number
  wanderPauseMs: number
  baseExp: number
  jobExp: number
}

export type RoMobSkill = {
  skillId: string
  level: number
  chance?: number
  cooldownMs?: number
}

export type RoMob = {
  id: string
  name: string
  sourceUrl?: string | null
  level: number
  hp: number
  atk: number
  def: number
  mdef: number
  size: string
  element: string
  wikiBaseExp: number
  wikiJobExp: number
  drops: RoMobDrop[]
  runtime: RoMobRuntime
  skills?: RoMobSkill[]
  boss?: boolean
}

export type RoMap = {
  id: string
  displayName: string
  fieldType: string
  sourceUrl?: string | null
}

export type MapPortalDef = {
  id: string
  x: number
  y: number
  width: number
  height: number
  targetMapId: string
  targetX: number
  targetY: number
  label: string
  mode: 'walk' | 'npc' | 'both'
}

/** @deprecated Authoring uses MobSpawnSpotJson; runtime uses RuntimeMobSpawn from expandMobSpots. */
export type MobSpawnPointJson = { x: number; y: number; defId: string }

export type MobSpawnSpotJson = {
  id: string
  x: number
  y: number
  width: number
  height: number
  defId: string
  count: number
  spawnsPerMinute: number
  canLure: boolean
  lureRadius?: number
}

export type RoLootZenyLinear = {
  levelMul: number
  offset: number
}

export type RoLootZenyConfig = {
  note?: string
  minLinear: RoLootZenyLinear
  maxLinear: RoLootZenyLinear
}

export type RoLootWeightedItem = {
  itemId: string
  weight: number
}

export type RoLootLevelBand = {
  minLevel: number
  maxLevel: number
  chancePerMille: number
  items: RoLootWeightedItem[]
}

export type RoLootConfig = {
  sourceUrl?: string | null
  zeny: RoLootZenyConfig
  levelBands: RoLootLevelBand[]
}

export type GearRarityId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'artifact'

export type RoGearRarity = {
  label: string
  color: string
  statMin: number
  affixCapPercent: number
  effectMin: number
}

export type RoDungeonGearDrop = {
  chancePerMille: number
  mvpRolls: number
  rarityWeights: Record<GearRarityId, number>
}

export type RoDungeonFloor = {
  id: string
  mapId: string
  name: string
  minLevel: number
  maxLevel: number
  entry: { x: number; y: number }
  mvpDefId: string
  mvpSpawn: { x: number; y: number }
  gearDrop: RoDungeonGearDrop
}

export type RoJobBonusGrant = {
  jobLevel: number
  str?: number
  agi?: number
  vit?: number
  int?: number
  dex?: number
  luk?: number
}

export type RoJobBonusTable = {
  sourceUrl?: string | null
  bonusAtJobLevel: RoJobBonusGrant[]
}

export type RoJobBonusesConfig = {
  schemaVersion: number
  description?: string
  jobs: Record<string, RoJobBonusTable>
}

export type RoDungeonsConfig = {
  gear: {
    dropSlots: string[]
    rarities: Record<GearRarityId, RoGearRarity>
    effectKinds: Array<'melee' | 'range' | 'magic' | 'critChance'>
  }
  floors: RoDungeonFloor[]
}

export type RoContentPack = {
  manifest: RoManifest
  jobs: RoJob[]
  skills: RoSkill[]
  items: RoItem[]
  mobs: RoMob[]
  maps: RoMap[]
  mobSpots: Record<string, MobSpawnSpotJson[]>
  portals: Record<string, MapPortalDef[]>
  expTables: RoExpTables
  loot: RoLootConfig
  dungeons: RoDungeonsConfig
  jobStarterGear: RoJobStarterGearConfig
  jobMaster: RoJobMasterConfig
  rentals: RoRentalsConfig
  aspd: RoAspdConfig
  jobBonuses: RoJobBonusesConfig
}
