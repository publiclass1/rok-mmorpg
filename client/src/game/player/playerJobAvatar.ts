import { loadRoContent } from '../../content/ro/loadContent'

export const PLAYER_AVATAR_KEYS = [
  'novice',
  'swordman',
  'knight',
  'mage',
  'archer',
  'hunter',
  'acolyte',
  'merchant',
  'thief',
] as const

export type PlayerAvatarKey = (typeof PLAYER_AVATAR_KEYS)[number]

const AVATAR_KEY_SET = new Set<string>(PLAYER_AVATAR_KEYS)

export function isPlayerAvatarKey(value: string): value is PlayerAvatarKey {
  return AVATAR_KEY_SET.has(value)
}

export function resolveJobAvatarKey(jobId: string): PlayerAvatarKey {
  const job = loadRoContent().jobs.find((j) => j.id === jobId)
  const raw = job?.avatarKey ?? 'novice'
  if (isPlayerAvatarKey(raw)) return raw
  return 'novice'
}
