import { useState } from 'react'
import { writeSkillBarDrag } from '../game/character/skillBarDrag'
import {
  skillFallbackColor,
  skillIconAbbrev,
  skillIconUrl,
  skillTooltipTitle,
} from '../game/character/skillIconUrl'
import { SKILLS } from '../game/character/skillsConfig'

type DragConfig =
  | { source: 'list'; skillId: string }
  | { source: 'bar'; skillId: string; slot: number }

type Props = {
  skillId: string
  level?: number
  size?: 'sm' | 'md'
  dimmed?: boolean
  draggable?: boolean
  drag?: DragConfig
  className?: string
  title?: string
  onDragStarted?: () => void
  onDragMoved?: () => void
  onDragEnded?: () => void
}

export function SkillIcon({
  skillId,
  level,
  size = 'md',
  dimmed = false,
  draggable = false,
  drag,
  className = '',
  title,
  onDragStarted,
  onDragMoved,
  onDragEnded,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const def = SKILLS[skillId]
  const tooltip = title ?? skillTooltipTitle(skillId, level)
  const sizeClass = size === 'sm' ? 'skill-icon--sm' : 'skill-icon--md'
  const canDrag = draggable && drag != null

  function onDragStart(e: React.DragEvent) {
    if (!canDrag || !drag) {
      e.preventDefault()
      return
    }
    onDragStarted?.()
    writeSkillBarDrag(e.dataTransfer, drag)
  }

  function onDrag(e: React.DragEvent) {
    if (e.clientX !== 0 || e.clientY !== 0) onDragMoved?.()
  }

  if (!def) {
    return (
      <span className={`skill-icon ${sizeClass} ${className}`.trim()} title={skillId}>
        <span className="skill-icon-fallback" style={{ backgroundColor: '#374151' }}>
          ?
        </span>
      </span>
    )
  }

  return (
    <span
      className={`skill-icon ${sizeClass}${dimmed ? ' skill-icon--dim' : ''}${canDrag ? ' skill-icon--draggable' : ''} ${className}`.trim()}
      title={tooltip}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={() => onDragEnded?.()}
    >
      {!imgFailed ? (
        <img
          src={skillIconUrl(skillId)}
          alt=""
          className="skill-icon-img"
          draggable={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="skill-icon-fallback"
          style={{ backgroundColor: skillFallbackColor(skillId) }}
        >
          {skillIconAbbrev(skillId)}
        </span>
      )}
      {level != null && level > 0 && <span className="skill-icon-lv">{level}</span>}
    </span>
  )
}
