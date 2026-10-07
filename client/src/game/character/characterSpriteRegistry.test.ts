import assert from 'node:assert'
import type { NpcRow } from '../../types/database'
import { DEFAULT_CHARACTER_APPEARANCE } from './characterAppearance'
import {
  getNpcSpriteDef,
  playerMasterTextureKey,
  resolveNpcSpriteDef,
  resolveNpcSpriteKey,
  resolvePlayerSpriteDef,
} from './characterSpriteRegistry'

const NPC_TYPES: NpcRow['npc_type'][] = [
  'teleport',
  'storage',
  'save',
  'job_master',
  'shop',
  'healer',
  'dungeon',
  'rental',
]

function baseNpc(overrides: Partial<NpcRow> = {}): NpcRow {
  return {
    id: 'test_npc',
    map_id: 'prontera',
    x: 0,
    y: 0,
    npc_type: 'shop',
    label: 'Test',
    config: {},
    ...overrides,
  }
}

function run() {
  for (const npc_type of NPC_TYPES) {
    const npc = baseNpc({ npc_type })
    const key = resolveNpcSpriteKey(npc)
    assert.ok(key, `expected sprite key for npc_type ${npc_type}`)
    assert.ok(getNpcSpriteDef(key!), `expected sprite def for key ${key}`)
    assert.ok(resolveNpcSpriteDef(npc), `expected resolveNpcSpriteDef for ${npc_type}`)
  }

  const rentalKey = resolveNpcSpriteKey(baseNpc({ npc_type: 'rental' }))
  assert.equal(rentalKey, 'rental_clerk')

  const misconfigured = baseNpc({
    npc_type: 'rental',
    config: { spriteKey: 'rental' },
  })
  assert.equal(resolveNpcSpriteKey(misconfigured), 'rental_clerk')
  assert.equal(resolveNpcSpriteDef(misconfigured)?.id, 'rental_clerk')

  const trimmedType = baseNpc({ npc_type: '  RENTAL  ' as NpcRow['npc_type'] })
  assert.equal(resolveNpcSpriteKey(trimmedType), 'rental_clerk')

  const swordman = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'swordman')
  const knight = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'knight')
  assert.notEqual(swordman.masterTextureKey, knight.masterTextureKey)
  assert.equal(swordman.masterTextureKey, playerMasterTextureKey(false, 'swordman'))
  assert.equal(knight.masterTextureKey, playerMasterTextureKey(false, 'knight'))

  const mage = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'mage')
  const wizard = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'wizard')
  assert.notEqual(mage.masterTextureKey, wizard.masterTextureKey)
  assert.equal(wizard.masterTextureKey, playerMasterTextureKey(false, 'wizard'))

  console.log('characterSpriteRegistry.test.ts: ok')
}

run()
