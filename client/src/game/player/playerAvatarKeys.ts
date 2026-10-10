export const PLAYER_AVATAR_KEYS = [
  'novice',
  'swordman',
  'knight',
  'mage',
  'wizard',
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
