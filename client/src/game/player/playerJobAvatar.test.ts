import assert from 'node:assert'
import { loadRoContent } from '../../content/ro/loadContent'
import { isPlayerAvatarKey, PLAYER_AVATAR_KEYS, resolveJobAvatarKey } from './playerJobAvatar'

function run() {
  for (const key of PLAYER_AVATAR_KEYS) {
    assert.ok(isPlayerAvatarKey(key), `expected avatar key ${key}`)
  }

  for (const job of loadRoContent().jobs) {
    if (job.id === 'monster') continue
    const resolved = resolveJobAvatarKey(job.id)
    assert.ok(isPlayerAvatarKey(resolved), `job ${job.id} resolved to invalid key ${resolved}`)
    if (job.avatarKey) {
      assert.equal(resolved, job.avatarKey, `job ${job.id} avatarKey mismatch`)
    }
  }

  assert.equal(resolveJobAvatarKey('unknown_job'), 'novice')

  console.log('playerJobAvatar.test.ts: ok')
}

run()
