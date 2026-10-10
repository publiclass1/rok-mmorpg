import { useMemo } from 'react'
import { SkillGridCell } from './SkillGridCell'
import { computeSkillGridLayout } from '../game/character/skillGridLayout'
import { learnableSkillIdsForTab } from '../game/character/skillRequirements'
import type { SkillDefinition } from '../game/character/skillsConfig'
import { JOB_NAMES } from '../game/character/skillsConfig'
import {
  isSkillSpendingTab,
  maxSkillPointsForJobTab,
  skillPointsSpentInJob,
} from '../game/character/skillPointBudget'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  skills: SkillDefinition[]
  sheet: CharacterSheetPayload
  tabJobId: string
}

export function SkillTreePanel({ skills, sheet, tabJobId }: Props) {
  const grid = useMemo(() => computeSkillGridLayout(skills), [skills])
  const showLearnButton = isSkillSpendingTab(sheet.jobId, tabJobId)
  const learnableIds = useMemo(
    () => learnableSkillIdsForTab(skills, sheet, tabJobId),
    [skills, sheet, tabJobId],
  )

  const spent = skillPointsSpentInJob(sheet.skills, tabJobId)
  const maxPoints = maxSkillPointsForJobTab(tabJobId)
  const jobLabel = JOB_NAMES[tabJobId] ?? tabJobId

  return (
    <div className="skill-job-panel">
      <h3 className="skill-job-panel-title">
        {jobLabel} ({spent}/{maxPoints})
      </h3>
      <div className="skill-grid-viewport">
        <div
          className="skill-grid"
          style={{
            gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${grid.rows}, minmax(4.5rem, auto))`,
          }}
        >
          {grid.cells.flatMap((row, rowIndex) =>
            row.map((skill, colIndex) => {
              const key = `${rowIndex}-${colIndex}`
              if (!skill) {
                return <div key={key} className="skill-grid-cell skill-grid-cell--empty" />
              }
              const level = sheet.skills[skill.id] ?? 0
              return (
                <div key={key} className="skill-grid-cell">
                  <SkillGridCell
                    skill={skill}
                    sheet={sheet}
                    tabJobId={tabJobId}
                    showLearnButton={showLearnButton}
                    learnable={learnableIds.has(skill.id)}
                    maxed={level >= skill.maxLevel}
                  />
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
