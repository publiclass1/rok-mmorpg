import type { ActivityLogEntry } from '../game/events'

type Props = {
  entries: ActivityLogEntry[]
}

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ActivityLog({ entries }: Props) {
  const visible = entries.slice(-50).reverse()

  return (
    <div className="activity-log">
      <h3>Activity</h3>
      {visible.length === 0 ? (
        <p className="muted small">No activity yet.</p>
      ) : (
        <ul className="activity-log-list">
          {visible.map((entry) => (
            <li key={entry.id} className={`activity-log-item kind-${entry.kind}`}>
              <span className="activity-log-time">{formatTime(entry.at)}</span>
              <span className="activity-log-msg">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
