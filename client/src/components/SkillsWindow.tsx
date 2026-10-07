import { useState } from 'react'
import { hasAllocatedSkillPoints } from '../game/character/characterState'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import {
  JOB_NAMES,
  skillsForJob,
  SKILL_WINDOW_GENERAL_TAB_ID,
  skillWindowTabEntries,
} from '../game/character/skillsConfig'
import { SKILL_RESET_ZENY_COST } from '../game/character/statFormulas'
import { emitGameEvent, type CharacterSheetPayload } from '../game/events'
import { spendCharacterZeny } from '../lib/zeny'
import type { CharacterRow } from '../types/database'
import { GeneralSkillsPanel } from './GeneralSkillsPanel'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalResetButton } from './motion/ModalResetButton'
import { ModalScrollBody } from './motion/ModalScrollBody'
import { SkillTreePanel } from './SkillTreePanel'

type Props = {
  character: CharacterRow
  sheet: CharacterSheetPayload
  onClose: () => void
  onCharacterUpdated: (row: CharacterRow) => void
}

export function SkillsWindow({ character, sheet, onClose, onCharacterUpdated }: Props) {
  const jobName = JOB_NAMES[sheet.jobId] ?? sheet.jobId
  const tabs = skillWindowTabEntries(sheet.jobId)
  const defaultTab =
    tabs.find((t) => t.id === sheet.jobId)?.id ??
    tabs.find((t) => t.id !== SKILL_WINDOW_GENERAL_TAB_ID)?.id ??
    SKILL_WINDOW_GENERAL_TAB_ID
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [busy, setBusy] = useState(false)

  const isGeneralTab = activeTab === SKILL_WINDOW_GENERAL_TAB_ID
  const tabSkills = isGeneralTab ? [] : skillsForJob(activeTab)
  const canReset = hasAllocatedSkillPoints(sheet.skills)
  const resetTitle = `Reset skills (${SKILL_RESET_ZENY_COST.toLocaleString()} zeny)`

  async function resetSkills() {
    if (busy) return
    if (!canReset) return
    if (character.zeny < SKILL_RESET_ZENY_COST) {
      emitGameEvent('status', `Need ${SKILL_RESET_ZENY_COST.toLocaleString()} zeny to reset skills.`)
      return
    }
    setBusy(true)
    try {
      const resetOk = dispatchCharacterAction({ type: 'resetSkills' })
      if (!resetOk) return

      const nextZeny = await spendCharacterZeny(character.id, -SKILL_RESET_ZENY_COST)
      if (nextZeny == null) {
        emitGameEvent('status', 'Payment failed.')
        return
      }
      onCharacterUpdated({ ...character, zeny: nextZeny })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal skills-modal">
      <ModalHeader
        title="Skills"
        onClose={onClose}
        trailing={
          <ModalResetButton
            onClick={() => void resetSkills()}
            disabled={busy || !canReset || character.zeny < SKILL_RESET_ZENY_COST}
            label={resetTitle}
          />
        }
      />
      <div className="skills-modal-chrome">
        <p className="muted small skills-modal-meta">
          {jobName} · Job Lv {sheet.jobLevel} · SP {sheet.skillPointsUnspent} · drag icons to the bar
          below · Reset: {SKILL_RESET_ZENY_COST.toLocaleString()}z
        </p>
        <p className="muted small skills-modal-legend">
          Bright border = can add a point · Lines = suggested prerequisite path
        </p>
        <div className="skills-window-tabs" role="tablist" aria-label="Skill categories">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`skills-window-tab${activeTab === tab.id ? ' skills-window-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ModalScrollBody
        className={`skills-modal-scroll${isGeneralTab ? ' skills-modal-scroll--general' : ''}`}
      >
        <div className="skills-window-tab-panel" role="tabpanel">
          {isGeneralTab ? (
            <GeneralSkillsPanel sheet={sheet} />
          ) : (
            <SkillTreePanel skills={tabSkills} sheet={sheet} tabJobId={activeTab} />
          )}
        </div>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
