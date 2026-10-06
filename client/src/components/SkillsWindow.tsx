import { canLearnSkill, JOB_NAMES, skillsForJob } from '../game/character/skillsConfig'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

export function SkillsWindow({ sheet, onClose }: Props) {
  const jobName = JOB_NAMES[sheet.jobId] ?? sheet.jobId
  const skills = skillsForJob(sheet.jobId)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Skills — {jobName}</h2>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <p className="muted small">
          Job Lv {sheet.jobLevel} · Skill points: <strong>{sheet.skillPointsUnspent}</strong>
        </p>
        <ul className="item-list">
          {skills.map((skill) => {
            const level = sheet.skills[skill.id] ?? 0
            const can = canLearnSkill(skill, sheet.jobLevel, level, sheet.skillPointsUnspent)
            return (
              <li key={skill.id} className="skill-row">
                <div className="row spread">
                  <strong>{skill.name}</strong>
                  <span>Lv {level}/{skill.maxLevel}</span>
                </div>
                <p className="muted small">{skill.description}</p>
                <p className="muted small">Requires Job Lv {skill.requiredJobLevel}</p>
                <button
                  type="button"
                  disabled={!can}
                  onClick={() => dispatchCharacterAction({ type: 'learnSkill', skillId: skill.id })}
                >
                  {level === 0 ? 'Learn' : 'Level up'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
