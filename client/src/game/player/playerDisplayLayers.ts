/** Rider anchor lift so seated legs rest on the peco saddle (see pecoMountVisual saddle ~y-24). */
export const MOUNT_BODY_Y_OFFSET = -10

export type PlayerVisualLayer =
  | 'garment'
  | 'armor'
  | 'headTop'
  | 'headMiddle'
  | 'headLower'
  | 'weapon'
  | 'offhand'

/** In-world avatar: only head slots are drawn; rarity glow still uses all equipment. */
export const WORLD_VISIBLE_EQUIP_LAYERS: PlayerVisualLayer[] = [
  'headTop',
  'headMiddle',
  'headLower',
]
