import type { PlayerBuffPayload } from '../events'

export const PECO_RIDE_STATUS_ID = 'peco_ride'

export function isHudStatusPayload(statusId: string): boolean {
  return statusId === PECO_RIDE_STATUS_ID || statusId.startsWith('rental_')
}

export type PlayerStatusBuff = {
  statusId: string
  name: string
  iconSkillId: string
  skillLevel: number
  startedAt: number
  expiresAt: number
}

export function buffDurationMs(buff: Pick<PlayerStatusBuff, 'startedAt' | 'expiresAt'>): number {
  return Math.max(1, buff.expiresAt - buff.startedAt)
}

export function applySelfBuff(
  buffs: PlayerStatusBuff[],
  params: {
    statusId: string
    name: string
    iconSkillId: string
    skillLevel: number
    now: number
    durationMs?: number
    expiresAt?: number
  },
): PlayerStatusBuff[] {
  const startedAt = params.now
  const expiresAt =
    params.expiresAt ?? params.now + (params.durationMs ?? 0)
  const next: PlayerStatusBuff = {
    statusId: params.statusId,
    name: params.name,
    iconSkillId: params.iconSkillId,
    skillLevel: params.skillLevel,
    startedAt,
    expiresAt,
  }
  const without = buffs.filter((b) => b.statusId !== params.statusId)
  return [...without, next]
}

export function pruneExpired(buffs: PlayerStatusBuff[], now: number): PlayerStatusBuff[] {
  return buffs.filter((b) => !Number.isFinite(b.expiresAt) || b.expiresAt > now)
}

export function removeStatus(buffs: PlayerStatusBuff[], statusId: string): PlayerStatusBuff[] {
  return buffs.filter((b) => b.statusId !== statusId)
}

export function hasStatus(buffs: PlayerStatusBuff[], statusId: string): boolean {
  return buffs.some((b) => b.statusId === statusId)
}

export function buffsEqual(a: PlayerStatusBuff[], b: PlayerStatusBuff[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i]
    const right = b[i]
    if (
      left.statusId !== right.statusId ||
      left.expiresAt !== right.expiresAt ||
      left.startedAt !== right.startedAt ||
      left.skillLevel !== right.skillLevel
    ) {
      return false
    }
  }
  return true
}

export function toPlayerBuffPayloads(buffs: PlayerStatusBuff[]): PlayerBuffPayload[] {
  return buffs.map((b) => ({
    statusId: b.statusId,
    name: b.name,
    iconSkillId: b.iconSkillId,
    skillLevel: b.skillLevel,
    expiresAt: b.expiresAt,
    durationMs: buffDurationMs(b),
    displayKind: isHudStatusPayload(b.statusId) ? 'status' : 'buff',
  }))
}
