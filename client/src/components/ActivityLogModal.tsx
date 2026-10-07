import type { ActivityLogEntry } from '../game/events'
import { ActivityLog } from './ActivityLog'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  entries: ActivityLogEntry[]
  onClose: () => void
}

export function ActivityLogModal({ entries, onClose }: Props) {
  return (
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="panel modal activity-log-modal">
      <ModalHeader title="Activity log" onClose={onClose} className="activity-log-modal__header" />
      <ModalScrollBody>
        <ActivityLog entries={entries} maxEntries={100} showTitle={false} className="activity-log-modal__body" />
      </ModalScrollBody>
    </AnimatedModal>
  )
}
