import { SKILL_BAR_ROW_COUNT } from './skillBars'

const STORAGE_KEY = 'skill-bar-rows-visible'

export const SKILL_BAR_ROW_LABELS = ['1–9', 'Q–O', 'A–L', 'Z–.'] as const

export function defaultSkillBarRowsVisible(): boolean[] {
  return Array.from({ length: SKILL_BAR_ROW_COUNT }, () => true)
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
