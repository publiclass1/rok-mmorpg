import { expectedSkillJobId } from './archerHunterSkillJobs'
import { loadRoContent } from './loadContent'

const pack = loadRoContent()

for (const skill of pack.skills) {
  const expected = expectedSkillJobId(skill.id)
  if (expected != null && skill.jobId !== expected) {
    throw new Error(
      `[content:validate] skill "${skill.id}" must be jobId "${expected}" (iRO Archer/Hunter), got "${skill.jobId}"`,
    )
  }
}

console.log(
  `[content:validate] OK — pack=${pack.manifest.contentPackId} ruleset=${pack.manifest.ruleset} jobs=${pack.jobs.length} skills=${pack.skills.length} items=${pack.items.length} mobs=${pack.mobs.length} maps=${pack.maps.length} expTables=base${pack.expTables.baseExpToNext.length}`,
)
