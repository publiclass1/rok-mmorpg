import type { ActivityLogEntry } from '../game/events'
import { ItemHoverTooltip } from './ItemHoverTooltip'
import { ItemIcon } from './ItemIcon'

type Props = {
  entries: ActivityLogEntry[]
  maxEntries?: number
  showTitle?: boolean
  className?: string
}

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ActivityLog({ entries, maxEntries = 50, showTitle = true, className }: Props) {
  const visible = entries.slice(-maxEntries).reverse()
  const rootClass = className ? `activity-log ${className}` : 'activity-log'

  return (
    <div className={rootClass}>
      {showTitle && <h3>Activity</h3>}
      {visible.length === 0 ? (
        <p className="muted small">No activity yet.</p>
      ) : (
        <ul className="activity-log-list">
          {visible.map((entry) => (
            <li key={entry.id} className={`activity-log-item kind-${entry.kind}`}>
              <span className="activity-log-time">{formatTime(entry.at)}</span>
              {entry.itemId && (
                <ItemHoverTooltip itemId={entry.itemId}>
                  <span className="activity-log-item-icon">
                    <ItemIcon itemId={entry.itemId} size={20} alt="" />
                  </span>
                </ItemHoverTooltip>
              )}
              <span className="activity-log-msg">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
