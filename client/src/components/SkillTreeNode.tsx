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
  onPath: boolean
  maxed: boolean
  onHover: (el: HTMLElement | null) => void
}

export function SkillTreeNode({
  skill,
  sheet,
  showLearnButton,
  learnable,
  onPath,
  maxed,
  onHover,
}: Props) {
  const level = sheet.skills[skill.id] ?? 0
  const learned = level >= 1
  const iconDraggable = skill.type === 'active' && learned
  const can =
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
    'skill-tree-node',
    learnable ? 'skill-tree-node--learnable' : '',
    onPath && !learnable ? 'skill-tree-node--on-path' : '',
    maxed ? 'skill-tree-node--maxed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classNames}
      onMouseEnter={(e) => onHover(e.currentTarget)}
      onMouseLeave={() => onHover(null)}
    >
      <SkillIcon
        skillId={skill.id}
        level={learned ? level : undefined}
        size="sm"
        dimmed={!learned || skill.type === 'passive'}
        draggable={iconDraggable}
        drag={iconDraggable ? { source: 'list', skillId: skill.id } : undefined}
        title=""
      />
      <span className="skill-tree-node-name" title={skill.name}>{skill.name}</span>
      <div className="skill-tree-node__main">
        <span className="skill-tree-node-level muted small">
          {level}/{skill.maxLevel}
        </span>
        {showLearnButton && (
          <button
            type="button"
            className="skill-tree-node-btn"
            disabled={!can}
            onClick={() => dispatchCharacterAction({ type: 'learnSkill', skillId: skill.id })}
          >
            {level === 0 ? '+' : '↑'}
          </button>
        )}
      </div>
    </div>
  )
}
