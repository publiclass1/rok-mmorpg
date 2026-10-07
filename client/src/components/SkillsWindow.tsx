import { useState } from 'react'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { isSkillBarDragEvent, readSkillBarDrag } from '../game/character/skillBarDrag'
import { JOB_NAMES, skillsForJob, skillWindowTabs } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'
import { SkillTreePanel } from './SkillTreePanel'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

export function SkillsWindow({ sheet, onClose }: Props) {
  const jobName = JOB_NAMES[sheet.jobId] ?? sheet.jobId
  const tabs = skillWindowTabs(sheet.jobId)
  const defaultTab = tabs.includes(sheet.jobId) ? sheet.jobId : tabs[tabs.length - 1]!
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [unassignHover, setUnassignHover] = useState(false)

  const tabSkills = skillsForJob(activeTab)
  const showTabBar = tabs.length > 1

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
        {jobName} · Job Lv {sheet.jobLevel} · SP {sheet.skillPointsUnspent} · drag icons to
        the bar below
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
