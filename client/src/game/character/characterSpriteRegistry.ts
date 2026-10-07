import type { NpcRow } from '../../types/database'
import type { CharacterAppearance } from './characterAppearance'
import type { Facing } from '../movement/clickToMove'

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
    attack: AnimStrip
    jump: AnimStrip
    flinch: AnimStrip
    dead: AnimStrip
  }
  paletteSwap: boolean
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
  sit: { offset: 0, count: 1 },
  attack: { offset: 2, count: 3 },
  jump: { offset: 0, count: 1 },
  flinch: { offset: 0, count: 1 },
  dead: { offset: 1, count: 1 },
}

const PLAYER_FRAMES_PER_ROW = 6

export const PLAYER_SPRITE_MALE: CharacterSpriteDef = {
  id: 'player_male',
  masterTextureKey: 'master_player_male_v2',
  framesPerRow: PLAYER_FRAMES_PER_ROW,
  facingRow: FACING_ROW,
  strips: PLAYER_STRIPS,
  paletteSwap: true,
}

export const PLAYER_SPRITE_FEMALE: CharacterSpriteDef = {
  id: 'player_female',
  masterTextureKey: 'master_player_female_v2',
  framesPerRow: PLAYER_FRAMES_PER_ROW,
  facingRow: FACING_ROW,
  strips: PLAYER_STRIPS,
  paletteSwap: true,
}

export const KAFRA_SPRITE: CharacterSpriteDef = {
  id: 'kafra',
  masterTextureKey: 'master_kafra_v2',
  framesPerRow: 2,
  facingRow: FACING_ROW,
  strips: {
    idle: { offset: 0, count: 2 },
    walk: { offset: 0, count: 1 },
    sit: { offset: 0, count: 1 },
    attack: { offset: 0, count: 1 },
    jump: { offset: 0, count: 1 },
    flinch: { offset: 0, count: 1 },
    dead: { offset: 0, count: 1 },
  },
  paletteSwap: false,
}

const NPC_SPRITES: Record<string, CharacterSpriteDef> = {
  kafra: KAFRA_SPRITE,
}

export function resolvePlayerSpriteDef(appearance: CharacterAppearance): CharacterSpriteDef {
  return appearance.gender === 'female' ? PLAYER_SPRITE_FEMALE : PLAYER_SPRITE_MALE
}

export function getNpcSpriteDef(spriteKey: string): CharacterSpriteDef | null {
  return NPC_SPRITES[spriteKey] ?? null
}

export function resolveNpcSpriteKey(npc: NpcRow): string | null {
  const fromConfig = (npc.config as { spriteKey?: string }).spriteKey
  if (fromConfig) return fromConfig
  if (npc.npc_type === 'storage') return 'kafra'
  return null
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
