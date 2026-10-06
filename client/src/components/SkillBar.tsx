import { SKILLS } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

export function SkillBar({ sheet }: Props) {
  return (
    <div className="skill-bar" role="toolbar" aria-label="Skill bar">
      {sheet.skillBar.map((skillId, index) => {
        const skill = skillId ? SKILLS[skillId] : null
        const level = skillId ? sheet.skills[skillId] ?? 0 : 0
        return (
          <button
            key={index}
            type="button"
            className="skill-slot"
            title={skill ? `${skill.name} (Lv ${level})` : 'Empty'}
            onClick={() => emitGameEvent('useSkillSlot', { slot: index })}
          >
            <span className="skill-key">{index + 1}</span>
            <span className="skill-label">{skill ? skill.name.slice(0, 6) : '—'}</span>
          </button>
        )
      })}
    </div>
  )
}
