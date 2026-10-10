import assert from 'node:assert/strict'
import { ARCHER_SKILL_IDS, HUNTER_SKILL_IDS } from './archerHunterSkillJobs'
import { loadRoContent } from './loadContent'

const pack = loadRoContent()
const byId = new Map(pack.skills.map((s) => [s.id, s]))

assert.equal(ARCHER_SKILL_IDS.length, 6)
assert.equal(HUNTER_SKILL_IDS.length, 17)

for (const id of ARCHER_SKILL_IDS) {
  assert.equal(byId.get(id)?.jobId, 'archer', `archer skill ${id}`)
}
for (const id of HUNTER_SKILL_IDS) {
  assert.equal(byId.get(id)?.jobId, 'hunter', `hunter skill ${id}`)
}

console.log('archerHunterSkillJobs.test.ts: ok')
