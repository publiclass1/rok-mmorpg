import {
  ARCHER_SKILL_IDS,
  expectedSkillJobId,
  HUNTER_SKILL_IDS,
  isArcherOrHunterSkillId,
} from './archerHunterSkillJobs'
import { loadRoContent } from './loadContent'

const pack = loadRoContent()

for (const skill of pack.skills) {
  const expected = expectedSkillJobId(skill.id)
  if (expected != null && skill.jobId !== expected) {
    throw new Error(
      `[content:validate] skill "${skill.id}" must be jobId "${expected}" (iRO Archer/Hunter), got "${skill.jobId}"`,
    )
  }
  if ((skill.jobId === 'archer' || skill.jobId === 'hunter') && !isArcherOrHunterSkillId(skill.id)) {
    throw new Error(
      `[content:validate] skill "${skill.id}" has jobId "${skill.jobId}" but is not listed in archerHunterSkillJobs.ts`,
    )
  }
}

const skillsById = new Map(pack.skills.map((s) => [s.id, s]))
for (const id of ARCHER_SKILL_IDS) {
  const skill = skillsById.get(id)
  if (!skill) {
    throw new Error(`[content:validate] missing Archer skill in skills.json: "${id}"`)
  }
  if (skill.jobId !== 'archer') {
    throw new Error(`[content:validate] Archer skill "${id}" must have jobId "archer"`)
  }
}
for (const id of HUNTER_SKILL_IDS) {
  const skill = skillsById.get(id)
  if (!skill) {
    throw new Error(`[content:validate] missing Hunter skill in skills.json: "${id}"`)
  }
  if (skill.jobId !== 'hunter') {
    throw new Error(`[content:validate] Hunter skill "${id}" must have jobId "hunter"`)
  }
}

console.log(
  `[content:validate] OK — pack=${pack.manifest.contentPackId} ruleset=${pack.manifest.ruleset} jobs=${pack.jobs.length} skills=${pack.skills.length} items=${pack.items.length} mobs=${pack.mobs.length} maps=${pack.maps.length} expTables=base${pack.expTables.baseExpToNext.length}`,
)
