import manifestJson from '../../../../content/ro/manifest.json'
import jobsJson from '../../../../content/ro/jobs.json'
import skillsJson from '../../../../content/ro/skills.json'
import itemsJson from '../../../../content/ro/items.json'
import mobsJson from '../../../../content/ro/mobs.json'
import mapsJson from '../../../../content/ro/maps.json'
import type { RoContentPack, RoJob, RoMob, RoSkill, RoItem, RoMap, MobSpawnPointJson } from './types'
import { validateRoContent } from './validateRoContent'

let cached: RoContentPack | null = null

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

function asMaps(raw: { maps: RoMap[]; mobSpawns: Record<string, MobSpawnPointJson[]> }): {
  maps: RoMap[]
  mobSpawns: Record<string, MobSpawnPointJson[]>
} {
  return { maps: raw.maps, mobSpawns: raw.mobSpawns }
}

export function loadRoContent(): RoContentPack {
  if (cached) return cached

  const { maps, mobSpawns } = asMaps(mapsJson as { maps: RoMap[]; mobSpawns: Record<string, MobSpawnPointJson[]> })

  const pack: RoContentPack = {
    manifest: manifestJson as RoContentPack['manifest'],
    jobs: asJobs(jobsJson as { jobs: RoJob[] }),
    skills: asSkills(skillsJson as { skills: RoSkill[] }),
    items: asItems(itemsJson as { items: RoItem[] }),
    mobs: asMobs(mobsJson as { mobs: RoMob[] }),
    maps,
    mobSpawns,
  }

  validateRoContent(pack)
  cached = pack
  return pack
}
