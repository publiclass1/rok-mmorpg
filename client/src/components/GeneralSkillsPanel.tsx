import { SkillHoverTooltip } from './SkillHoverTooltip'
import { SkillIcon } from './SkillIcon'
import { generalActionSkills } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

export function GeneralSkillsPanel({ sheet }: Props) {
  const skills = generalActionSkills()

  return (
    <div className="skills-general-grid" role="list">
      {skills.map((skill) => {
        const level = sheet.skills[skill.id] ?? 0
        const learned = level >= 1
        return (
          <SkillHoverTooltip
            key={skill.id}
            skillId={skill.id}
            sheet={sheet}
            tabJobId={sheet.jobId}
            variant="full"
          >
            <div className="skills-general-item" role="listitem">
              <SkillIcon
                skillId={skill.id}
                level={learned ? level : undefined}
                size="sm"
                draggable={learned && skill.type === 'active'}
                drag={learned && skill.type === 'active' ? { source: 'list', skillId: skill.id } : undefined}
                title=""
              />
              <span className="skills-general-name">{skill.name}</span>
            </div>
          </SkillHoverTooltip>
        )
      })}
    </div>
  )
}
