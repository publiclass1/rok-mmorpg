import { useRef, useState } from 'react'
import { SkillIcon } from './SkillIcon'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { readSkillBarDrag } from '../game/character/skillBarDrag'
import { canPlaceSkillOnBar, SKILLS, skillUsableByJob } from '../game/character/skillsConfig'
import { skillTooltipTitle } from '../game/character/skillIconUrl'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

export function SkillBar({ sheet }: Props) {
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const suppressClickRef = useRef(false)

  function handleDrop(slot: number, e: React.DragEvent) {
    e.preventDefault()
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload) return

    if (payload.source === 'list') {
      if (!canPlaceSkillOnBar(payload.skillId, sheet.jobId, sheet.skills)) return
      dispatchCharacterAction({ type: 'assignSkillBar', slot, skillId: payload.skillId })
      return
    }

    if (payload.source === 'bar' && payload.slot !== slot) {
      dispatchCharacterAction({ type: 'moveSkillBar', from: payload.slot, to: slot })
    }
  }

  return (
    <div className="skill-bar" role="toolbar" aria-label="Skill bar">
      {sheet.skillBar.map((skillId, index) => {
        const skill = skillId ? SKILLS[skillId] : null
        const level = skillId ? sheet.skills[skillId] ?? 0 : 0
        const allowed =
          !skillId ||
          (skillId === 'basic_attack' && level >= 1) ||
          (skill != null && skillUsableByJob(skillId, sheet.jobId) && level >= 1)
        const inactive = skillId != null && !allowed
        const canDrag = skillId != null && !inactive
        const isDropTarget = dropTarget === index
        const slotTitle = skill
          ? inactive
            ? `${skill.name} — not available`
            : `${skillTooltipTitle(skillId!, level)} · drag to move`
          : 'Drop skill icon here'

        return (
          <button
            key={index}
            type="button"
            className={`skill-slot${inactive ? ' skill-slot--inactive' : ''}${isDropTarget ? ' skill-slot--drop-target' : ''}`}
            title={slotTitle}
            disabled={inactive}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDropTarget(index)
            }}
            onDragLeave={() => {
              setDropTarget((current) => (current === index ? null : current))
            }}
            onDrop={(e) => handleDrop(index, e)}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              if (inactive) return
              emitGameEvent('useSkillSlot', { slot: index })
            }}
          >
            <span className="skill-key">{index + 1}</span>
            {skillId && !inactive ? (
              <SkillIcon
                skillId={skillId}
                level={level}
                size="sm"
                draggable={canDrag}
                drag={canDrag ? { source: 'bar', skillId, slot: index } : undefined}
                onDragStarted={() => {
                  suppressClickRef.current = false
                }}
                onDragMoved={() => {
                  suppressClickRef.current = true
                }}
                onDragEnded={() => {
                  setDropTarget(null)
                }}
              />
            ) : (
              <span className="skill-slot-empty" aria-hidden>
                ·
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
