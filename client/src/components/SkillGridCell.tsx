import { SkillIcon } from './SkillIcon'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { canLearnSkill } from '../game/character/skillsConfig'
import type { SkillDefinition } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  skill: SkillDefinition
  sheet: CharacterSheetPayload
  showLearnButton: boolean
  learnable: boolean
  maxed: boolean
  onHover: (el: HTMLElement | null) => void
}

export function SkillGridCell({
  skill,
  sheet,
  showLearnButton,
  learnable,
  maxed,
  onHover,
}: Props) {
  const level = sheet.skills[skill.id] ?? 0
  const learned = level >= 1
  const iconDraggable = skill.type === 'active' && learned
  const canLearn =
    showLearnButton &&
    canLearnSkill(
      skill,
      sheet.jobId,
      sheet.jobLevel,
      level,
      sheet.skillPointsUnspent,
      sheet.skills,
    )

  const classNames = [
    'skill-grid-node',
    learnable ? 'skill-grid-node--learnable' : '',
    maxed ? 'skill-grid-node--maxed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showLevelArrows = showLearnButton && skill.maxLevel > 1

  return (
    <div
      className={classNames}
      onMouseEnter={(e) => onHover(e.currentTarget)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="skill-grid-node-name" title={skill.name}>{skill.name}</span>
      <SkillIcon
        skillId={skill.id}
        level={learned ? level : undefined}
        size="sm"
        dimmed={!learned || skill.type === 'passive'}
        draggable={iconDraggable}
        drag={iconDraggable ? { source: 'list', skillId: skill.id } : undefined}
        title=""
      />
      <div className="skill-grid-node-level-row">
        {showLevelArrows ? (
          <button type="button" className="skill-grid-node-arrow" disabled aria-hidden>
            ‹
          </button>
        ) : null}
        <span className="skill-grid-node-level muted small">
          {skill.maxLevel <= 1 ? level : `${level} / ${skill.maxLevel}`}
        </span>
        {showLevelArrows ? (
          <button
            type="button"
            className="skill-grid-node-arrow skill-grid-node-arrow--inc"
            disabled={!canLearn}
            title={level === 0 ? 'Learn skill' : 'Increase level'}
            onClick={() => dispatchCharacterAction({ type: 'learnSkill', skillId: skill.id })}
          >
            ›
          </button>
        ) : showLearnButton && level < skill.maxLevel ? (
          <button
            type="button"
            className="skill-grid-node-arrow skill-grid-node-arrow--inc"
            disabled={!canLearn}
            onClick={() => dispatchCharacterAction({ type: 'learnSkill', skillId: skill.id })}
          >
            ›
          </button>
        ) : null}
      </div>
    </div>
  )
}
