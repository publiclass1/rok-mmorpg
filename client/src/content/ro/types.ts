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
}

export type StatBonusJson = {
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
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
  sourceUrl?: string | null
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

export type MobSpawnPointJson = { x: number; y: number; defId: string }

export type RoContentPack = {
  manifest: RoManifest
  jobs: RoJob[]
  skills: RoSkill[]
  items: RoItem[]
  mobs: RoMob[]
  maps: RoMap[]
  mobSpawns: Record<string, MobSpawnPointJson[]>
}
