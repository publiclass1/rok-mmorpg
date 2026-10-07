import { SkillIcon } from './SkillIcon'
import { generalActionSkills } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

export function SkillUtilityRow({ sheet }: Props) {
  const skills = generalActionSkills()

  return (
    <section className="skills-utility-section" aria-label="General skills">
      <h3 className="skills-utility-heading muted small">General</h3>
      <div className="skills-utility-row">
        {skills.map((skill) => {
          const level = sheet.skills[skill.id] ?? 0
          const learned = level >= 1
          return (
            <div key={skill.id} className="skills-utility-item">
              <SkillIcon
                skillId={skill.id}
                level={learned ? level : undefined}
                size="sm"
                draggable={learned && skill.type === 'active'}
                drag={learned && skill.type === 'active' ? { source: 'list', skillId: skill.id } : undefined}
              />
              <span className="skills-utility-name">{skill.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
