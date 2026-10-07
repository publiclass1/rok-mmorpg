export const SKILL_BAR_DRAG_MIME = 'application/x-browser-ro-skill-bar'

export type SkillBarDragPayload =
  | { source: 'list'; skillId: string }
  | { source: 'bar'; skillId: string; slot: number }

function parseSkillBarDragJson(raw: string): SkillBarDragPayload | null {
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

/** True when a drag in progress may be a skill-bar assignment (for dragover gating). */
export function isSkillBarDragEvent(dataTransfer: DataTransfer): boolean {
  const types = dataTransfer.types
  return types.includes(SKILL_BAR_DRAG_MIME) || types.includes('text/plain')
}

export function writeSkillBarDrag(dataTransfer: DataTransfer, payload: SkillBarDragPayload) {
  const json = JSON.stringify(payload)
  dataTransfer.setData(SKILL_BAR_DRAG_MIME, json)
  dataTransfer.setData('text/plain', json)
  dataTransfer.effectAllowed = 'move'
}

export function readSkillBarDrag(dataTransfer: DataTransfer): SkillBarDragPayload | null {
  const custom = dataTransfer.getData(SKILL_BAR_DRAG_MIME)
  if (custom) {
    const parsed = parseSkillBarDragJson(custom)
    if (parsed) return parsed
  }
  const plain = dataTransfer.getData('text/plain')
  if (plain) return parseSkillBarDragJson(plain)
  return null
}
