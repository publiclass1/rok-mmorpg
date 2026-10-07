import { useState } from 'react'
import { sessionFromSheetPayload } from '../game/character/characterSheet'
import { hasAllocatedSkillPoints } from '../game/character/characterState'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { getCharacterSession, setCharacterSession } from '../game/character/characterSessionBridge'
import { isSkillBarDragEvent, readSkillBarDrag } from '../game/character/skillBarDrag'
import { JOB_NAMES, skillsForJob, skillWindowTabs } from '../game/character/skillsConfig'
import { SKILL_RESET_ZENY_COST } from '../game/character/statFormulas'
import { emitGameEvent, type CharacterSheetPayload } from '../game/events'
import { supabase } from '../lib/supabase'
import type { CharacterRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalResetButton } from './motion/ModalResetButton'
import { SkillTreePanel } from './SkillTreePanel'

type Props = {
  character: CharacterRow
  sheet: CharacterSheetPayload
  onClose: () => void
  onCharacterUpdated: (row: CharacterRow) => void
}

export function SkillsWindow({ character, sheet, onClose, onCharacterUpdated }: Props) {
  const jobName = JOB_NAMES[sheet.jobId] ?? sheet.jobId
  const tabs = skillWindowTabs(sheet.jobId)
  const defaultTab = tabs.includes(sheet.jobId) ? sheet.jobId : tabs[tabs.length - 1]!
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [unassignHover, setUnassignHover] = useState(false)
  const [busy, setBusy] = useState(false)

  const tabSkills = skillsForJob(activeTab)
  const showTabBar = tabs.length > 1
  const canReset = hasAllocatedSkillPoints(sheet.skills)
  const resetTitle = `Reset skills (${SKILL_RESET_ZENY_COST.toLocaleString()} zeny)`

  function handleUnassignDrop(e: React.DragEvent) {
    e.preventDefault()
    setUnassignHover(false)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload || payload.source !== 'bar') return
    dispatchCharacterAction({ type: 'assignSkillBar', slot: payload.slot, skillId: null })
  }

  async function resetSkills() {
    if (busy) return
    if (!canReset) return
    if (character.zeny < SKILL_RESET_ZENY_COST) {
      emitGameEvent('status', `Need ${SKILL_RESET_ZENY_COST.toLocaleString()} zeny to reset skills.`)
      return
    }
    setBusy(true)
    try {
      setCharacterSession(sessionFromSheetPayload(sheet, getCharacterSession()))
      const resetOk = dispatchCharacterAction({ type: 'resetSkills' })
      if (!resetOk) return

      const { data, error } = await supabase
        .from('characters')
        .update({ zeny: character.zeny - SKILL_RESET_ZENY_COST })
        .eq('id', character.id)
        .select('*')
        .single()
      if (error || !data) {
        emitGameEvent('status', error?.message ?? 'Payment failed.')
        return
      }
      onCharacterUpdated(data as CharacterRow)
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
      <p className="muted small skills-modal-meta">
        {jobName} · Job Lv {sheet.jobLevel} · SP {sheet.skillPointsUnspent} · drag icons to
        the bar below · Reset: {SKILL_RESET_ZENY_COST.toLocaleString()}z
      </p>
      <p className="muted small skills-modal-legend">
        Bright border = can add a point · Lines = suggested prerequisite path
      </p>

      {showTabBar && (
        <div className="skills-window-tabs" role="tablist" aria-label="Job skills">
          {tabs.map((tabId) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={activeTab === tabId}
              className={`skills-window-tab${activeTab === tabId ? ' skills-window-tab--active' : ''}`}
              onClick={() => setActiveTab(tabId)}
            >
              {JOB_NAMES[tabId] ?? tabId}
            </button>
          ))}
        </div>
      )}

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

      <div className="skills-window-tab-panel" role="tabpanel">
        <SkillTreePanel skills={tabSkills} sheet={sheet} tabJobId={activeTab} />
      </div>
    </AnimatedModal>
  )
}
