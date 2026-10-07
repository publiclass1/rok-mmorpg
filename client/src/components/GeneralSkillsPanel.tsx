import { useState } from 'react'
import { SkillDetailTooltip } from './SkillDetailTooltip'
import { SkillIcon } from './SkillIcon'
import { FloatingTooltipPortal } from './tooltip/FloatingTooltipPortal'
import { floatingTooltipPosition } from './tooltip/floatingTooltipPosition'
import { skillRequirementDetail } from '../game/character/skillRequirements'
import { generalActionSkills, SKILLS } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

export function GeneralSkillsPanel({ sheet }: Props) {
  const skills = generalActionSkills()
  const [hoverAnchor, setHoverAnchor] = useState<{
    skillId: string
    rect: DOMRect
  } | null>(null)

  const hoverSkill = hoverAnchor ? SKILLS[hoverAnchor.skillId] : null
  const hoverDetail =
    hoverSkill != null ? skillRequirementDetail(hoverSkill, sheet, sheet.jobId) : null

  return (
    <div className="skills-general-grid" role="list">
      {skills.map((skill) => {
        const level = sheet.skills[skill.id] ?? 0
        const learned = level >= 1
        return (
          <div
            key={skill.id}
            className="skills-general-item"
            role="listitem"
            onMouseEnter={(e) =>
              setHoverAnchor({ skillId: skill.id, rect: e.currentTarget.getBoundingClientRect() })
            }
            onMouseLeave={() => setHoverAnchor(null)}
          >
            <SkillIcon
              skillId={skill.id}
              level={learned ? level : undefined}
              size="sm"
              draggable={learned && skill.type === 'active'}
              drag={learned && skill.type === 'active' ? { source: 'list', skillId: skill.id } : undefined}
            />
            <span className="skills-general-name">{skill.name}</span>
          </div>
        )
      })}
      {hoverSkill && hoverDetail && hoverAnchor && (
        <FloatingTooltipPortal style={floatingTooltipPosition(hoverAnchor.rect, 240)}>
          <SkillDetailTooltip skillName={hoverSkill.name} detail={hoverDetail} inline />
        </FloatingTooltipPortal>
      )}
    </div>
  )
}
