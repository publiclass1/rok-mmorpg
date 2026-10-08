import assert from 'node:assert'
import {
  createEmptySkillBars,
  isValidSkillBarPayload,
  parseSkillBars,
  serializeSkillBars,
  SKILL_BAR_ROW_COUNT,
} from './skillBars'

function run() {
  const empty = createEmptySkillBars()
  const legacy = serializeSkillBars(empty)
  assert.equal(Array.isArray(legacy), true)
  assert.equal((legacy as (string | null)[]).length, 9)
  assert.equal(isValidSkillBarPayload(legacy), true)

  const multi = parseSkillBars(empty)
  multi[1][0] = 'fire_bolt'
  const nested = serializeSkillBars(multi)
  assert.equal(Array.isArray(nested), true)
  assert.equal((nested as (string | null)[][]).length, SKILL_BAR_ROW_COUNT)
  assert.equal(isValidSkillBarPayload(nested), true)

  console.log('skillBars.test.ts: ok')
}

run()
