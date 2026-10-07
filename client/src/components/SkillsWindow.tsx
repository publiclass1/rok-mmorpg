import { useState } from 'react'
import { SkillIcon } from './SkillIcon'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { isSkillBarDragEvent, readSkillBarDrag } from '../game/character/skillBarDrag'
import { canLearnSkill, JOB_NAMES, SKILLS, barAssignableSkills, skillsForJob } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

function skillDetailTitle(skillId: string): string {
  const skill = SKILLS[skillId]
  if (!skill) return skillId
  const parts = [skill.description, `Requires Job Lv ${skill.requiredJobLevel}`]
  if (skill.prerequisites.length > 0) {
    parts.push(
      skill.prerequisites
        .map((p) => `${SKILLS[p.skillId]?.name ?? p.skillId} Lv ${p.level}`)
        .join(', '),
    )
  }
  return parts.join(' · ')
}

export function SkillsWindow({ sheet, onClose }: Props) {
  const jobName = JOB_NAMES[sheet.jobId] ?? sheet.jobId
  const jobSkills = skillsForJob(sheet.jobId)
  const jobIds = new Set(jobSkills.map((s) => s.id))
  const extraBarSkills = barAssignableSkills(sheet).filter((s) => !jobIds.has(s.id))
  const skills = [...extraBarSkills, ...jobSkills]
  const [unassignHover, setUnassignHover] = useState(false)

  function handleUnassignDrop(e: React.DragEvent) {
    e.preventDefault()
    setUnassignHover(false)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload || payload.source !== 'bar') return
    dispatchCharacterAction({ type: 'assignSkillBar', slot: payload.slot, skillId: null })
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal skills-modal">
        <div className="row spread modal-drag-handle">
          <h2 style={{ margin: 0 }}>Skills</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted small skills-modal-meta">
          {jobName} · Job Lv {sheet.jobLevel} · SP {sheet.skillPointsUnspent} · drag icons to the bar below
        </p>

        <div
          className={`skill-unassign-zone skill-unassign-zone--compact${unassignHover ? ' skill-unassign-zone--active' : ''}`}
          onDragOver={(e) => {
            if (!isSkillBarDragEvent(e.dataTransfer)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setUnassignHover(true)
          }}
          onDragLeave={() => setUnassignHover(false)}
          onDrop={handleUnassignDrop}
        >
          Drop bar skill here to remove
        </div>

        <div className="skills-grid">
          {skills.map((skill) => {
            const level = sheet.skills[skill.id] ?? 0
            const can = jobIds.has(skill.id)
              ? canLearnSkill(
                  skill,
                  sheet.jobId,
                  sheet.jobLevel,
                  level,
                  sheet.skillPointsUnspent,
                  sheet.skills,
                )
              : false
            const learned = level >= 1
            const iconDraggable = skill.type === 'active' && learned
            return (
              <div key={skill.id} className="skill-cell">
                <SkillIcon
                  skillId={skill.id}
                  level={learned ? level : undefined}
                  dimmed={!learned || skill.type === 'passive'}
                  draggable={iconDraggable}
                  drag={iconDraggable ? { source: 'list', skillId: skill.id } : undefined}
                  title={skillDetailTitle(skill.id)}
                />
                <div className="skill-cell-info">
                  <span className="skill-cell-name">{skill.name}</span>
                  <span className="muted small">
                    Lv {level}/{skill.maxLevel}
                    {skill.type === 'passive' ? ' · passive' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="skill-cell-btn"
                  disabled={!can}
                  hidden={!jobIds.has(skill.id)}
                  onClick={() => dispatchCharacterAction({ type: 'learnSkill', skillId: skill.id })}
                >
                  {level === 0 ? '+' : '↑'}
                </button>
              </div>
            )
          })}
        </div>
    </AnimatedModal>
  )
}
