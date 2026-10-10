import { useMemo, useState } from 'react'
import { SkillDetailTooltip } from './SkillDetailTooltip'
import { SkillTreeNode } from './SkillTreeNode'
import { FloatingTooltipPortal } from './tooltip/FloatingTooltipPortal'
import { floatingTooltipPosition } from './tooltip/floatingTooltipPosition'
import {
  learnableSkillIdsForTab,
  pathSkillIdsForGuidance,
  skillRequirementDetail,
} from '../game/character/skillRequirements'
import {
  computeSkillTreeLayout,
  SKILL_TREE_CELL_H,
  SKILL_TREE_CELL_W,
  SKILL_TREE_COL_GAP,
  SKILL_TREE_PAD,
  SKILL_TREE_ROW_GAP,
  skillTreeContentSize,
  skillTreeEdgePath,
  skillTreeNodeCenter,
} from '../game/character/skillTreeLayout'
import type { SkillDefinition } from '../game/character/skillsConfig'
import { SKILLS } from '../game/character/skillsConfig'
import { isSkillSpendingTab } from '../game/character/skillPointBudget'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  skills: SkillDefinition[]
  sheet: CharacterSheetPayload
  tabJobId: string
}

export function SkillTreePanel({ skills, sheet, tabJobId }: Props) {
  const layout = useMemo(() => computeSkillTreeLayout(skills), [skills])
  const { width, height } = useMemo(() => skillTreeContentSize(layout), [layout])
  const showLearnButton = isSkillSpendingTab(sheet.jobId, tabJobId)
  const learnableIds = useMemo(
    () => learnableSkillIdsForTab(skills, sheet, tabJobId),
    [skills, sheet, tabJobId],
  )
  const tabSkillIds = useMemo(() => new Set(skills.map((s) => s.id)), [skills])
  const pathIds = useMemo(
    () => pathSkillIdsForGuidance(learnableIds, tabSkillIds),
    [learnableIds, tabSkillIds],
  )

  const [hoverAnchor, setHoverAnchor] = useState<{
    skillId: string
    rect: DOMRect
  } | null>(null)

  function handleHover(skillId: string, el: HTMLElement | null) {
    if (!el) {
      setHoverAnchor(null)
      return
    }
    setHoverAnchor({
      skillId,
      rect: el.getBoundingClientRect(),
    })
  }

  const hoverSkill = hoverAnchor ? SKILLS[hoverAnchor.skillId] : null
  const hoverDetail =
    hoverSkill != null ? skillRequirementDetail(hoverSkill, sheet, tabJobId) : null

  return (
    <div className="skill-tree-viewport">
      <div className="skill-tree-canvas" style={{ width, height }}>
        <svg className="skill-tree-edges" width={width} height={height} aria-hidden>
          {layout.edges.map((edge) => {
            const fromPos = layout.positions[edge.from]
            const toPos = layout.positions[edge.to]
            if (!fromPos || !toPos) return null
            const from = skillTreeNodeCenter(fromPos)
            const to = skillTreeNodeCenter(toPos)
            const onPath =
              pathIds.has(edge.from) && pathIds.has(edge.to) && tabJobId === sheet.jobId
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={skillTreeEdgePath(from, to)}
                fill="none"
                className={onPath ? 'skill-tree-edge skill-tree-edge--on-path' : 'skill-tree-edge'}
              />
            )
          })}
        </svg>
        {skills.map((skill) => {
          const pos = layout.positions[skill.id]
          if (!pos) return null
          const level = sheet.skills[skill.id] ?? 0
          const left = SKILL_TREE_PAD + pos.col * (SKILL_TREE_CELL_W + SKILL_TREE_COL_GAP)
          const top = SKILL_TREE_PAD + pos.row * (SKILL_TREE_CELL_H + SKILL_TREE_ROW_GAP)
          return (
            <div
              key={skill.id}
              className="skill-tree-node-wrap"
              style={{
                left,
                top,
                width: SKILL_TREE_CELL_W,
                height: SKILL_TREE_CELL_H,
              }}
            >
              <SkillTreeNode
                skill={skill}
                sheet={sheet}
                showLearnButton={showLearnButton}
                learnable={learnableIds.has(skill.id)}
                onPath={pathIds.has(skill.id)}
                maxed={level >= skill.maxLevel}
                onHover={(el) => handleHover(skill.id, el)}
              />
            </div>
          )
        })}
      </div>
      {hoverSkill && hoverDetail && hoverAnchor && (
        <FloatingTooltipPortal style={floatingTooltipPosition(hoverAnchor.rect, 240)}>
          <SkillDetailTooltip skillName={hoverSkill.name} detail={hoverDetail} inline />
        </FloatingTooltipPortal>
      )}
    </div>
  )
}
