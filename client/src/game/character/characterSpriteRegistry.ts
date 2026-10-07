import type { NpcRow } from '../../types/database'
import type { CharacterAppearance } from './characterAppearance'
import type { Facing } from '../movement/clickToMove'
import { npcArchetypeFromNpcType, type NpcArchetype } from './npcArchetypes'

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
  sit: { offset: 0, count: 1 },
  attack: { offset: 2, count: 3 },
  jump: { offset: 0, count: 1 },
  flinch: { offset: 0, count: 1 },
  dead: { offset: 1, count: 1 },
}

const PLAYER_FRAMES_PER_ROW = 6

const NPC_IDLE_STRIPS = {
  idle: { offset: 0, count: 2 },
  walk: { offset: 0, count: 1 },
  sit: { offset: 0, count: 1 },
  attack: { offset: 0, count: 1 },
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

export const KAFRA_SPRITE = npcSpriteDef('kafra')

const NPC_SPRITES: Record<string, CharacterSpriteDef> = {
  kafra: KAFRA_SPRITE,
  warp_agent: npcSpriteDef('warp_agent'),
  save_priest: npcSpriteDef('save_priest'),
  job_master: npcSpriteDef('job_master'),
  merchant: npcSpriteDef('merchant'),
  healer: npcSpriteDef('healer'),
}

export function resolvePlayerSpriteDef(appearance: CharacterAppearance): CharacterSpriteDef {
  return appearance.gender === 'female' ? PLAYER_SPRITE_FEMALE : PLAYER_SPRITE_MALE
}

export function getNpcSpriteDef(spriteKey: string): CharacterSpriteDef | null {
  return NPC_SPRITES[spriteKey] ?? null
}

export function listNpcSpriteDefs(): CharacterSpriteDef[] {
  return Object.values(NPC_SPRITES)
}

export function resolveNpcSpriteKey(npc: NpcRow): string | null {
  const fromConfig = (npc.config as { spriteKey?: string }).spriteKey
  if (fromConfig) return fromConfig
  const archetype = npcArchetypeFromNpcType(npc.npc_type)
  return archetype ?? null
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
