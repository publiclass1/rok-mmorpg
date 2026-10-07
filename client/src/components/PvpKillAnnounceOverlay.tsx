import { useEffect, useState } from 'react'
import type { PvpKillStreakKind } from '../game/world/pvpConfig'
import { PVP_KILL_STREAK_LABELS } from '../game/world/pvpConfig'

type Announce = {
  announceId: number
  streak: PvpKillStreakKind | null
  killerName: string
  victimName: string
}

type Props = {
  announce: Announce | null
}

export function PvpKillAnnounceOverlay({ announce }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!announce) {
      setVisible(false)
      return
    }
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), 4000)
    return () => window.clearTimeout(id)
  }, [announce?.announceId])

  if (!announce || !visible) return null

  const streakLabel = announce.streak ? PVP_KILL_STREAK_LABELS[announce.streak] : null

  return (
    <div className="pvp-kill-announce-overlay" aria-live="assertive">
      <div className="pvp-kill-announce-overlay__inner">
        {streakLabel ? (
          <p className="pvp-kill-announce-overlay__streak">{streakLabel}</p>
        ) : (
          <p className="pvp-kill-announce-overlay__streak pvp-kill-announce-overlay__streak--plain">Kill!</p>
        )}
        <p className="pvp-kill-announce-overlay__detail">
          <strong>{announce.killerName}</strong> defeated <strong>{announce.victimName}</strong>
        </p>
      </div>
    </div>
  )
}
