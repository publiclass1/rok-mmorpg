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
  sourceUrl?: string | null
}

export type SkillPrerequisite = {
  skillId: string
  level: number
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
}

export type StatBonusJson = {
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
}

export type RoConsumableEffect = {
  healHp?: number
  healSp?: number
}

export type RoItem = {
  id: string
  name: string
  type: 'consumable' | 'weapon' | 'armor' | 'etc' | 'ammo' | 'card'
  weight: number
  stackMax: number
  equipSlot: string | null
  layerColor: string | null
  bonuses: StatBonusJson | null
  weaponAtk?: number
  weaponSize?: 'small' | 'medium' | 'large'
  attackElement?: string
  consumable?: RoConsumableEffect
  sourceUrl?: string | null
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

export type MobSpawnPointJson = { x: number; y: number; defId: string }

export type RoContentPack = {
  manifest: RoManifest
  jobs: RoJob[]
  skills: RoSkill[]
  items: RoItem[]
  mobs: RoMob[]
  maps: RoMap[]
  mobSpawns: Record<string, MobSpawnPointJson[]>
  portals: Record<string, MapPortalDef[]>
  expTables: RoExpTables
}
