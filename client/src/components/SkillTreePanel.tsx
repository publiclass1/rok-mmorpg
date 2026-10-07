import { useMemo, useState } from 'react'
import { SkillDetailTooltip } from './SkillDetailTooltip'
import { SkillTreeNode } from './SkillTreeNode'
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
  skillTreeNodeCenter,
} from '../game/character/skillTreeLayout'
import type { SkillDefinition } from '../game/character/skillsConfig'
import { SKILLS } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  skills: SkillDefinition[]
  sheet: CharacterSheetPayload
  tabJobId: string
}

export function SkillTreePanel({ skills, sheet, tabJobId }: Props) {
  const layout = useMemo(() => computeSkillTreeLayout(skills), [skills])
  const { width, height } = useMemo(() => skillTreeContentSize(layout), [layout])
  const showLearnButton = tabJobId === sheet.jobId
  const learnableIds = useMemo(
    () => learnableSkillIdsForTab(skills, sheet, tabJobId),
    [skills, sheet, tabJobId],
  )
  const pathIds = useMemo(() => pathSkillIdsForGuidance(learnableIds), [learnableIds])

  const [hoverAnchor, setHoverAnchor] = useState<{
    skillId: string
    rect: DOMRect
  } | null>(null)

  function handleHover(skillId: string, el: HTMLElement | null) {
    if (!el) {
      setHoverAnchor(null)
      return
    }
    const viewport = el.closest('.skill-tree-viewport')
    if (!viewport) return
    const vpRect = viewport.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    setHoverAnchor({
      skillId,
      rect: new DOMRect(rect.left - vpRect.left, rect.top - vpRect.top, rect.width, rect.height),
    })
  }

  const hoverSkill = hoverAnchor ? SKILLS[hoverAnchor.skillId] : null
  const hoverDetail =
    hoverSkill != null ? skillRequirementDetail(hoverSkill, sheet, tabJobId) : null

  if (layout.mode === 'grid') {
    return (
      <div className="skill-tree-viewport skill-tree-viewport--grid">
        <div className="skills-grid skills-grid--tab">
          {skills
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((skill) => {
              const level = sheet.skills[skill.id] ?? 0
              return (
                <SkillTreeNode
                  key={skill.id}
                  skill={skill}
                  sheet={sheet}
                  showLearnButton={showLearnButton}
                  learnable={learnableIds.has(skill.id)}
                  onPath={pathIds.has(skill.id)}
                  maxed={level >= skill.maxLevel}
                  onHover={(el) => handleHover(skill.id, el)}
                />
              )
            })}
        </div>
        {hoverSkill && hoverDetail && hoverAnchor && (
          <SkillDetailTooltip
            skillName={hoverSkill.name}
            detail={hoverDetail}
            style={tooltipStyle(hoverAnchor.rect, width)}
          />
        )}
      </div>
    )
  }

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
              pathIds.has(edge.from) &&
              pathIds.has(edge.to) &&
              tabJobId === sheet.jobId
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.bottom - 8}
                x2={to.x}
                y2={to.top + 8}
                className={onPath ? 'skill-tree-edge skill-tree-edge--on-path' : 'skill-tree-edge'}
              />
            )
          })}
        </svg>
        {skills.map((skill) => {
          const pos = layout.positions[skill.id]
          if (!pos) return null
          const level = sheet.skills[skill.id] ?? 0
          const left =
            SKILL_TREE_PAD + pos.col * (SKILL_TREE_CELL_W + SKILL_TREE_COL_GAP)
          const top =
            SKILL_TREE_PAD + pos.row * (SKILL_TREE_CELL_H + SKILL_TREE_ROW_GAP)
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
        <SkillDetailTooltip
          skillName={hoverSkill.name}
          detail={hoverDetail}
          style={tooltipStyle(hoverAnchor.rect, width)}
        />
      )}
    </div>
  )
}

function tooltipStyle(anchor: DOMRect, viewportWidth: number): React.CSSProperties {
  const tooltipW = 240
  let left = anchor.left + anchor.width + 8
  if (left + tooltipW > viewportWidth - 8) {
    left = Math.max(8, anchor.left - tooltipW - 8)
  }
  let top = anchor.top
  return { left, top, maxWidth: tooltipW }
}
