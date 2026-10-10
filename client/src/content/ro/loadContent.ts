import manifestJson from '../../../../content/ro/manifest.json'
import jobsJson from '../../../../content/ro/jobs.json'
import skillsJson from '../../../../content/ro/skills.json'
import itemsJson from '../../../../content/ro/items.json'
import mobsJson from '../../../../content/ro/mobs.json'
import mapsJson from '../../../../content/ro/maps.json'
import lootJson from '../../../../content/ro/loot.json'
import expTablesJson from '../../../../content/ro/expTables.json'
import dungeonMobsJson from '../../../../content/ro/dungeonMobs.json'
import dungeonsJson from '../../../../content/ro/dungeons.json'
import jobStarterGearJson from '../../../../content/ro/jobStarterGear.json'
import jobMasterJson from '../../../../content/ro/jobMaster.json'
import rentalsJson from '../../../../content/ro/rentals.json'
import aspdJson from '../../../../content/ro/aspd.json'
import jobBonusesJson from '../../../../content/ro/jobBonuses.json'
import type {
  RoContentPack,
  RoJob,
  RoMob,
  RoSkill,
  RoItem,
  RoMap,
  MobSpawnSpotJson,
  MapPortalDef,
  RoExpTables,
  RoLootConfig,
  RoDungeonsConfig,
  RoJobStarterGearConfig,
  RoJobMasterConfig,
  RoRentalsConfig,
  RoAspdConfig,
  RoJobBonusesConfig,
} from './types'
import { expandAllMobSpots, type RuntimeMobSpawn } from './expandMobSpots'
import { validateRoContent } from './validateRoContent'

let cached: RoContentPack | null = null
let cachedRuntimeMobSpawns: Record<string, RuntimeMobSpawn[]> | null = null

function asJobs(raw: { jobs: RoJob[] }): RoJob[] {
  return raw.jobs
}

function asSkills(raw: { skills: RoSkill[] }): RoSkill[] {
  return raw.skills
}

function asItems(raw: { items: RoItem[] }): RoItem[] {
  return raw.items
}

function asMobs(raw: { mobs: RoMob[] }): RoMob[] {
  return raw.mobs
}

function asMaps(raw: {
  maps: RoMap[]
  mobSpots?: Record<string, MobSpawnSpotJson[]>
  portals?: Record<string, MapPortalDef[]>
}): {
  maps: RoMap[]
  mobSpots: Record<string, MobSpawnSpotJson[]>
  portals: Record<string, MapPortalDef[]>
} {
  return { maps: raw.maps, mobSpots: raw.mobSpots ?? {}, portals: raw.portals ?? {} }
}

export function loadRoContent(): RoContentPack {
  if (cached) return cached

  const { maps, mobSpots, portals } = asMaps(
    mapsJson as {
      maps: RoMap[]
      mobSpots?: Record<string, MobSpawnSpotJson[]>
      portals?: Record<string, MapPortalDef[]>
    },
  )

  const pack: RoContentPack = {
    manifest: manifestJson as RoContentPack['manifest'],
    jobs: asJobs(jobsJson as { jobs: RoJob[] }),
    skills: asSkills(skillsJson as { skills: RoSkill[] }),
    items: asItems(itemsJson as { items: RoItem[] }),
    mobs: [...asMobs(mobsJson as { mobs: RoMob[] }), ...asMobs(dungeonMobsJson as { mobs: RoMob[] })],
    maps,
    mobSpots,
    portals,
    expTables: expTablesJson as RoExpTables,
    loot: lootJson as RoLootConfig,
    dungeons: dungeonsJson as RoDungeonsConfig,
    jobStarterGear: jobStarterGearJson as RoJobStarterGearConfig,
    jobMaster: jobMasterJson as RoJobMasterConfig,
    rentals: rentalsJson as RoRentalsConfig,
    aspd: aspdJson as RoAspdConfig,
    jobBonuses: jobBonusesJson as RoJobBonusesConfig,
  }

  validateRoContent(pack)
  cachedRuntimeMobSpawns = expandAllMobSpots(pack.mobSpots)
  cached = pack
  return pack
}

export function getRuntimeMobSpawnsByMap(): Record<string, RuntimeMobSpawn[]> {
  if (!cachedRuntimeMobSpawns) {
    loadRoContent()
  }
  return cachedRuntimeMobSpawns!
}
