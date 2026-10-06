export const SKILL_BAR_DRAG_MIME = 'application/x-browser-ro-skill-bar'

export type SkillBarDragPayload =
  | { source: 'list'; skillId: string }
  | { source: 'bar'; skillId: string; slot: number }

export function writeSkillBarDrag(dataTransfer: DataTransfer, payload: SkillBarDragPayload) {
  dataTransfer.setData(SKILL_BAR_DRAG_MIME, JSON.stringify(payload))
  dataTransfer.effectAllowed = 'move'
}

export function readSkillBarDrag(dataTransfer: DataTransfer): SkillBarDragPayload | null {
  const raw = dataTransfer.getData(SKILL_BAR_DRAG_MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SkillBarDragPayload
    if (parsed.source === 'list' && typeof parsed.skillId === 'string') return parsed
    if (
      parsed.source === 'bar' &&
      typeof parsed.skillId === 'string' &&
      typeof parsed.slot === 'number'
    ) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}
