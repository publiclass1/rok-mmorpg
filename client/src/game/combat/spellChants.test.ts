import assert from 'node:assert'
import { SKILLS } from '../character/skillsConfig'
import {
  DEFAULT_SPELL_CHANT,
  resolveSpellChant,
  spellChantVisibleLength,
  SPELL_CHANTS,
} from './spellChants'

function run() {
  assert.ok(SPELL_CHANTS.fire_bolt.length > 0)
  assert.equal(resolveSpellChant('fire_bolt', SKILLS.fire_bolt), SPELL_CHANTS.fire_bolt)

  const fakeDef = { ...SKILLS.fire_bolt, id: 'unknown_fire', magic: { element: 'fire' as const } }
  assert.equal(resolveSpellChant('unknown_fire', fakeDef), 'πῦρ ἀνάπτω')

  const noMagic = { ...SKILLS.bash }
  assert.equal(resolveSpellChant('bash', noMagic), DEFAULT_SPELL_CHANT)

  assert.equal(spellChantVisibleLength('abcd', 0), 0)
  assert.equal(spellChantVisibleLength('abcd', 0.25), 1)
  assert.equal(spellChantVisibleLength('abcd', 0.5), 2)
  assert.equal(spellChantVisibleLength('abcd', 1), 4)
  assert.equal(spellChantVisibleLength('abcd', 2), 4)

  let prev = 0
  for (let i = 1; i <= 10; i++) {
    const len = spellChantVisibleLength('μετεώρων', i / 10)
    assert.ok(len >= prev, 'visible length should be monotonic')
    prev = len
  }

  console.log('spellChants.test.ts: ok')
}

run()
