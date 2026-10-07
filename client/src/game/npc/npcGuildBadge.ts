import Phaser from 'phaser'
import type { NpcRow } from '../../types/database'

export const NPC_GUILD_ICON_IDS = [
  'kafra',
  'warp',
  'church',
  'job',
  'merchant',
  'healer',
  'dungeon',
] as const

export type NpcGuildIconId = (typeof NPC_GUILD_ICON_IDS)[number]

export type NpcGuildDisplay = {
  name: string
  iconId: NpcGuildIconId
}

type NpcTypeKey = NpcRow['npc_type']

const DEFAULT_GUILD: Record<NpcTypeKey, NpcGuildDisplay> = {
  storage: { name: 'Kafra', iconId: 'kafra' },
  teleport: { name: 'Warp Agency', iconId: 'warp' },
  save: { name: 'Prontera Church', iconId: 'church' },
  job_master: { name: 'Job Guild', iconId: 'job' },
  shop: { name: 'Merchant Guild', iconId: 'merchant' },
  healer: { name: 'Healer Order', iconId: 'healer' },
  dungeon: { name: 'Dungeon Bureau', iconId: 'dungeon' },
  rental: { name: 'Equipment Rental', iconId: 'merchant' },
}

const ICON_STYLE: Record<NpcGuildIconId, { fill: number; letters: string }> = {
  kafra: { fill: 0x1d4ed8, letters: 'K' },
  warp: { fill: 0x4c1d95, letters: 'W' },
  church: { fill: 0xe2e8f0, letters: 'P' },
  job: { fill: 0x78350f, letters: 'J' },
  merchant: { fill: 0xca8a04, letters: 'M' },
  healer: { fill: 0xf472b6, letters: 'H' },
  dungeon: { fill: 0x7c3aed, letters: 'D' },
}

export const GUILD_ICON_SIZE = 12
export const GUILD_BADGE_GAP = 3
export const GUILD_BADGE_OFFSET_Y = 8

function parseIconId(raw: unknown): NpcGuildIconId | null {
  if (typeof raw !== 'string') return null
  return NPC_GUILD_ICON_IDS.includes(raw as NpcGuildIconId) ? (raw as NpcGuildIconId) : null
}

function parseNpcType(raw: string): NpcTypeKey {
  if (raw in DEFAULT_GUILD) return raw as NpcTypeKey
  return 'shop'
}

export function guildIconCanvasStyle(iconId: NpcGuildIconId): { fill: string; letters: string } {
  const s = ICON_STYLE[iconId]
  return { fill: `#${s.fill.toString(16).padStart(6, '0')}`, letters: s.letters }
}

export function resolveNpcGuildFromParts(
  npcType: string,
  config: Record<string, unknown> | null | undefined,
): NpcGuildDisplay {
  const type = parseNpcType(npcType)
  const base = DEFAULT_GUILD[type]
  const guildName =
    typeof config?.guildName === 'string' && config.guildName.trim()
      ? config.guildName.trim()
      : base.name
  const overrideIcon = parseIconId(config?.guildIcon)
  return {
    name: guildName,
    iconId: overrideIcon ?? base.iconId,
  }
}

export function resolveNpcGuild(npc: NpcRow): NpcGuildDisplay {
  return resolveNpcGuildFromParts(npc.npc_type, npc.config as Record<string, unknown>)
}

export function npcGuildTextureKey(iconId: NpcGuildIconId): string {
  return `npc_guild_${iconId}`
}

let texturesEnsured = false

export function ensureNpcGuildTextures(scene: Phaser.Scene): void {
  if (texturesEnsured) return
  for (const id of NPC_GUILD_ICON_IDS) {
    const key = npcGuildTextureKey(id)
    if (scene.textures.exists(key)) continue
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    const style = ICON_STYLE[id]
    g.fillStyle(style.fill, 1)
    g.fillRoundedRect(0, 0, GUILD_ICON_SIZE, GUILD_ICON_SIZE, 2)
    g.lineStyle(1, 0x0f172a, 0.85)
    g.strokeRoundedRect(0, 0, GUILD_ICON_SIZE, GUILD_ICON_SIZE, 2)
    g.generateTexture(key, GUILD_ICON_SIZE, GUILD_ICON_SIZE)
    g.destroy()
  }
  texturesEnsured = true
}

export function parseNpcConfigJson(configJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(configJson) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function patchNpcConfigJson(
  configJson: string,
  patch: { guildName?: string; guildIcon?: string },
): string {
  const config = parseNpcConfigJson(configJson)
  if (patch.guildName !== undefined) {
    const trimmed = patch.guildName.trim()
    if (trimmed) config.guildName = trimmed
    else delete config.guildName
  }
  if (patch.guildIcon !== undefined) {
    const trimmed = patch.guildIcon.trim()
    if (trimmed && parseIconId(trimmed)) config.guildIcon = trimmed
    else delete config.guildIcon
  }
  return JSON.stringify(config)
}

export function layoutGuildBadgeX(
  centerX: number,
  guildName: string,
  measureTextWidth: (text: string) => number,
): { iconX: number; labelX: number; labelOriginX: number } {
  const textW = measureTextWidth(guildName)
  const total = GUILD_ICON_SIZE + GUILD_BADGE_GAP + textW
  const left = centerX - total / 2
  return {
    iconX: left + GUILD_ICON_SIZE / 2,
    labelX: left + GUILD_ICON_SIZE + GUILD_BADGE_GAP,
    labelOriginX: 0,
  }
}
