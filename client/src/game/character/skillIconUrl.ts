import { SKILLS } from './skillsConfig'

export function skillIconUrl(skillId: string): string {
  const def = SKILLS[skillId]
  const file = def?.iconFile ?? `${skillId}.svg`
  return `/skills/${file}`
}

export function skillIconAbbrev(skillId: string): string {
  const name = SKILLS[skillId]?.name ?? skillId
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/** Stable fallback tile color when SVG fails to load. */
export function skillFallbackColor(skillId: string): string {
  let hash = 0
  for (let i = 0; i < skillId.length; i++) {
    hash = skillId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 45% 35%)`
}

export function skillTooltipTitle(skillId: string, level?: number): string {
  const def = SKILLS[skillId]
  if (!def) return skillId
  const lv = level != null ? ` (Lv ${level})` : ''
  return `${def.name}${lv}`
}
