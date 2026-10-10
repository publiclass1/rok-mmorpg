import assert from 'node:assert/strict'
import { sanitizeSkillsForJob } from './skillLineageSanitize'

const archerSkills = {
  basic_attack: 1,
  sit: 1,
  play_dead: 1,
  owls_eye: 5,
  falcon_mastery: 3,
  blitz_beat: 2,
}

const cleaned = sanitizeSkillsForJob('archer', {
  ...archerSkills,
  ankle_snare: 3,
})
assert.equal(cleaned.falcon_mastery ?? 0, 0, 'strips Hunter falcon_mastery from Archer')
assert.equal(cleaned.blitz_beat ?? 0, 0, 'strips Hunter blitz_beat from Archer')
assert.equal(cleaned.ankle_snare ?? 0, 0, 'strips Hunter trap skills from Archer')
assert.equal(cleaned.owls_eye, 5, 'keeps Archer skills')

const hunterSkills = sanitizeSkillsForJob('hunter', {
  ...archerSkills,
  beast_bane: 5,
})
assert.equal(hunterSkills.falcon_mastery, 3)
assert.equal(hunterSkills.owls_eye, 5)

console.log('skillLineageSanitize.test.ts: ok')
