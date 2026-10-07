import assert from 'node:assert'
import {
  PRESENCE_STALE_MS,
  parsePresenceLeaveCharacterId,
  parsePresenceLeaveMapId,
  pruneStaleRemoteEntries,
} from './mapPresenceUtils'

assert.strictEqual(parsePresenceLeaveCharacterId({ characterId: 'abc' }), 'abc')
assert.strictEqual(parsePresenceLeaveMapId({ characterId: 'abc', mapId: 'prontera' }), 'prontera')
assert.strictEqual(parsePresenceLeaveMapId({ characterId: 'abc' }), null)
assert.strictEqual(parsePresenceLeaveCharacterId({ characterId: '  x  ' }), 'x')
assert.strictEqual(parsePresenceLeaveCharacterId({ characterId: '' }), null)
assert.strictEqual(parsePresenceLeaveCharacterId(null), null)
assert.strictEqual(parsePresenceLeaveCharacterId({}), null)

const now = 50_000
const remotes = new Map<string, { at: number }>([
  ['fresh', { at: now - 500 }],
  ['stale', { at: now - PRESENCE_STALE_MS - 1 }],
])
assert.strictEqual(PRESENCE_STALE_MS, 2000)
assert.strictEqual(pruneStaleRemoteEntries(remotes, now), true)
assert.deepStrictEqual([...remotes.keys()], ['fresh'])
assert.strictEqual(pruneStaleRemoteEntries(remotes, now), false)

console.log('mapChannel.test.ts: ok')
