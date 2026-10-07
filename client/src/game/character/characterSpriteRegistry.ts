import type { WeaponClass } from '../../content/ro/types'
import type { NpcRow } from '../../types/database'
import type { PlayerAvatarKey } from '../player/playerJobAvatar'
import type { CharacterAppearance } from './characterAppearance'
import type { Facing } from '../movement/clickToMove'
import { npcArchetypeFromNpcType, type NpcArchetype } from './npcArchetypes'

const PLAYER_MASTER_VERSION = 'v9'

export type AttackStyle = 'swing' | 'thrust' | 'bow' | 'cast'

export function attackStyleForWeapon(weaponClass: WeaponClass): AttackStyle {
  switch (weaponClass) {
    case 'spear':
      return 'thrust'
    case 'bow':
      return 'bow'
    case 'staff':
      return 'cast'
    default:
      return 'swing'
  }
}

export const SPRITE_FRAME_WIDTH = 48
export const SPRITE_FRAME_HEIGHT = 64

export type AnimStrip = {
  offset: number
  count: number
}

export type CharacterSpriteDef = {
  id: string
  masterTextureKey: string
  framesPerRow: number
  facingRow: Record<Facing, number>
  strips: {
    idle: AnimStrip
    walk: AnimStrip
    sit: AnimStrip
    attack: Record<AttackStyle, AnimStrip>
    jump: AnimStrip
    flinch: AnimStrip
    dead: AnimStrip
  }
  paletteSwap: boolean
  npcArchetype?: NpcArchetype
}

export const FACING_ROW: Record<Facing, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
}

const PLAYER_STRIPS = {
  idle: { offset: 0, count: 2 },
  walk: { offset: 2, count: 4 },
  sit: { offset: 18, count: 1 },
  attack: {
    swing: { offset: 6, count: 3 },
    thrust: { offset: 9, count: 3 },
    bow: { offset: 12, count: 3 },
    cast: { offset: 15, count: 3 },
  },
  jump: { offset: 0, count: 1 },
  flinch: { offset: 19, count: 1 },
  dead: { offset: 20, count: 2 },
}

const PLAYER_FRAMES_PER_ROW = 22

const NPC_ATTACK_ONE: Record<AttackStyle, AnimStrip> = {
  swing: { offset: 0, count: 1 },
  thrust: { offset: 0, count: 1 },
  bow: { offset: 0, count: 1 },
  cast: { offset: 0, count: 1 },
}

const NPC_IDLE_STRIPS = {
  idle: { offset: 0, count: 2 },
  walk: { offset: 0, count: 1 },
  sit: { offset: 0, count: 1 },
  attack: NPC_ATTACK_ONE,
  jump: { offset: 0, count: 1 },
  flinch: { offset: 0, count: 1 },
  dead: { offset: 0, count: 1 },
}

function npcSpriteDef(archetype: NpcArchetype): CharacterSpriteDef {
  return {
    id: archetype,
    masterTextureKey: `master_npc_${archetype}_v3`,
    framesPerRow: 2,
    facingRow: FACING_ROW,
    strips: NPC_IDLE_STRIPS,
    paletteSwap: false,
    npcArchetype: archetype,
  }
}

export function playerMasterTextureKey(female: boolean, avatarKey: PlayerAvatarKey): string {
  return `master_player_${female ? 'female' : 'male'}_${avatarKey}_${PLAYER_MASTER_VERSION}`
}

export const KAFRA_SPRITE = npcSpriteDef('kafra')

const NPC_SPRITES: Record<string, CharacterSpriteDef> = {
  kafra: KAFRA_SPRITE,
  warp_agent: npcSpriteDef('warp_agent'),
  save_priest: npcSpriteDef('save_priest'),
  job_master: npcSpriteDef('job_master'),
  merchant: npcSpriteDef('merchant'),
  healer: npcSpriteDef('healer'),
  dungeon_guide: npcSpriteDef('dungeon_guide'),
  rental_clerk: npcSpriteDef('rental_clerk'),
}

export const NPC_SPRITE_LABELS: Record<NpcArchetype, string> = {
  kafra: 'Kafra',
  warp_agent: 'Warp Agent',
  save_priest: 'Save Priest',
  job_master: 'Job Master',
  merchant: 'Merchant',
  healer: 'Healer',
  dungeon_guide: 'Dungeon Guide',
  rental_clerk: 'Rental Clerk',
}

export function listNpcSpriteKeys(): NpcArchetype[] {
  return Object.keys(NPC_SPRITES) as NpcArchetype[]
}

export function resolvePlayerSpriteDef(
  appearance: CharacterAppearance,
  avatarKey: PlayerAvatarKey,
): CharacterSpriteDef {
  const female = appearance.gender === 'female'
  const genderTag = female ? 'female' : 'male'
  return {
    id: `player_${genderTag}_${avatarKey}`,
    masterTextureKey: playerMasterTextureKey(female, avatarKey),
    framesPerRow: PLAYER_FRAMES_PER_ROW,
    facingRow: FACING_ROW,
    strips: PLAYER_STRIPS,
    paletteSwap: true,
  }
}

export function getNpcSpriteDef(spriteKey: string): CharacterSpriteDef | null {
  return NPC_SPRITES[spriteKey] ?? null
}

export function listNpcSpriteDefs(): CharacterSpriteDef[] {
  return Object.values(NPC_SPRITES)
}

export const DEFAULT_NPC_SPRITE_KEY = 'merchant'

const NPC_ROW_TYPES: NpcRow['npc_type'][] = [
  'teleport',
  'storage',
  'save',
  'job_master',
  'shop',
  'healer',
  'dungeon',
  'rental',
]

function normalizeNpcRowType(npcType: string): NpcRow['npc_type'] | null {
  const t = npcType.trim().toLowerCase()
  return NPC_ROW_TYPES.includes(t as NpcRow['npc_type']) ? (t as NpcRow['npc_type']) : null
}

/** Resolve a config override or npc type string to a registry sprite key. */
function spriteKeyFromAlias(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (getNpcSpriteDef(trimmed)) return trimmed
  const asType = normalizeNpcRowType(trimmed)
  if (asType) {
    const archetype = npcArchetypeFromNpcType(asType)
    if (archetype) return archetype
  }
  return null
}

export function resolveNpcSpriteKey(npc: NpcRow): string | null {
  const configKey = (npc.config as { spriteKey?: string }).spriteKey?.trim()
  if (configKey) {
    const fromConfig = spriteKeyFromAlias(configKey)
    if (fromConfig) return fromConfig
  }
  const rowType = normalizeNpcRowType(npc.npc_type) ?? npc.npc_type
  const archetype = npcArchetypeFromNpcType(rowType)
  return archetype ?? null
}

export function resolveNpcSpriteDef(npc: NpcRow): CharacterSpriteDef | null {
  const key = resolveNpcSpriteKey(npc)
  if (key) {
    const def = getNpcSpriteDef(key)
    if (def) return def
  }
  return getNpcSpriteDef(DEFAULT_NPC_SPRITE_KEY)
}

export function stripFrameIndex(
  def: CharacterSpriteDef,
  facing: Facing,
  strip: AnimStrip,
  frameInStrip: number,
): number {
  const row = def.facingRow[facing]
  const clamped = Math.max(0, Math.min(strip.count - 1, frameInStrip))
  return row * def.framesPerRow + strip.offset + clamped
}

export function playerTextureKey(def: CharacterSpriteDef, appearanceKey: string): string {
  return `${def.id}_${appearanceKey.replace(/\|/g, '_')}`
}

export function npcTextureKey(def: CharacterSpriteDef): string {
  return def.masterTextureKey
}
