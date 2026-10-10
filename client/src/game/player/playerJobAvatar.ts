import { loadRoContent } from '../../content/ro/loadContent'
import { isPlayerAvatarKey, type PlayerAvatarKey } from './playerAvatarKeys'

export { PLAYER_AVATAR_KEYS, type PlayerAvatarKey, isPlayerAvatarKey } from './playerAvatarKeys'

export function resolveJobAvatarKey(jobId: string): PlayerAvatarKey {
  const job = loadRoContent().jobs.find((j) => j.id === jobId)
  const raw = job?.avatarKey ?? 'novice'
  if (isPlayerAvatarKey(raw)) return raw
  return 'novice'
}
