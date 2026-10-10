import { SKILL_BAR_ROW_COUNT } from './skillBars'

const STORAGE_KEY = 'skill-bar-rows-visible'

export const SKILL_BAR_ROW_LABELS = ['1–9', 'Q–O', 'A–L', 'Z–.'] as const

export function defaultSkillBarRowsVisible(): boolean[] {
  return Array.from({ length: SKILL_BAR_ROW_COUNT }, (_, i) => i === 0)
}

export function visibleSkillBarRowCount(visible: boolean[]): number {
  return visible.filter(Boolean).length
}

export function nextHiddenSkillBarRowIndex(visible: boolean[]): number | null {
  const idx = visible.findIndex((v) => !v)
  return idx === -1 ? null : idx
}

export function revealNextSkillBarRow(visible: boolean[]): boolean[] {
  const idx = nextHiddenSkillBarRowIndex(visible)
  if (idx === null) return [...visible]
  const next = [...visible]
  next[idx] = true
  return next
}

export function skillBarRevealMenuLabel(visible: boolean[]): string | null {
  const idx = nextHiddenSkillBarRowIndex(visible)
  if (idx === null) return null
  return `Show bar ${SKILL_BAR_ROW_LABELS[idx]}`
}

export function readSkillBarRowsVisible(): boolean[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSkillBarRowsVisible()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length !== SKILL_BAR_ROW_COUNT) {
      return defaultSkillBarRowsVisible()
    }
    return parsed.map((v) => v !== false)
  } catch {
    return defaultSkillBarRowsVisible()
  }
}

export function writeSkillBarRowsVisible(visible: boolean[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible))
  } catch {
    /* ignore */
  }
}
