import expTablesJson from '../../../../content/ro/expTables.json'
import type { RoExpTables } from './types'

let cached: RoExpTables | null = null

export function getExpTables(): RoExpTables {
  if (!cached) cached = expTablesJson as RoExpTables
  return cached
}

export function baseExpRequiredForLevel(level: number): number {
  const tables = getExpTables()
  const idx = Math.min(Math.max(level, 1), tables.baseLevelCap) - 1
  return tables.baseExpToNext[idx] ?? tables.baseExpToNext[tables.baseExpToNext.length - 1]
}

export function jobExpRequiredForLevel(level: number): number {
  const tables = getExpTables()
  const idx = Math.min(Math.max(level, 1), tables.jobExpToNext.length) - 1
  return tables.jobExpToNext[idx] ?? tables.jobExpToNext[tables.jobExpToNext.length - 1]
}

export function statPointsForReachingBaseLevel(level: number): number {
  const tables = getExpTables()
  if (level < 1 || level > tables.baseLevelCap) return 0
  return tables.statPointsOnBaseLevelUp[level - 1] ?? 0
}

export function jobBaseHp(jobId: string, baseLevel: number): number {
  const tables = getExpTables()
  const table = tables.jobBaseHp[jobId] ?? tables.jobBaseHp.novice
  const idx = Math.min(Math.max(baseLevel, 1), table.length) - 1
  return table[idx] ?? table[0]
}

export function jobBaseSp(jobId: string, baseLevel: number): number {
  const tables = getExpTables()
  const table = tables.jobBaseSp[jobId] ?? tables.jobBaseSp.novice
  const idx = Math.min(Math.max(baseLevel, 1), table.length) - 1
  return table[idx] ?? table[0]
}
