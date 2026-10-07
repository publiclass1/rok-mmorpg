import type { ActivityLogEntry } from '../game/events'
import { ActivityLog } from './ActivityLog'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  entries: ActivityLogEntry[]
  onClose: () => void
}

export function ActivityLogModal({ entries, onClose }: Props) {
  return (
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="panel modal activity-log-modal">
      <div className="row spread modal-drag-handle activity-log-modal__header">
        <h2 style={{ margin: 0 }}>Activity log</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <ActivityLog entries={entries} maxEntries={100} showTitle={false} className="activity-log-modal__body" />
    </AnimatedModal>
  )
}
