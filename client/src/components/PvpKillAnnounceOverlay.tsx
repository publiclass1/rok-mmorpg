import { useEffect, useState } from 'react'
import type { PvpKillStreakKind } from '../game/world/pvpConfig'
import { PVP_KILL_STREAK_LABELS } from '../game/world/pvpConfig'

type Announce = {
  streak: PvpKillStreakKind
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
    const id = window.setTimeout(() => setVisible(false), 3200)
    return () => window.clearTimeout(id)
  }, [announce?.streak, announce?.killerName, announce?.victimName])

  if (!announce || !visible) return null

  return (
    <div className="pvp-kill-announce-overlay" aria-live="polite">
      <div className="pvp-kill-announce-overlay__inner">
        <p className="pvp-kill-announce-overlay__streak">{PVP_KILL_STREAK_LABELS[announce.streak]}</p>
        <p className="pvp-kill-announce-overlay__detail">
          <strong>{announce.killerName}</strong> defeated <strong>{announce.victimName}</strong>
        </p>
      </div>
    </div>
  )
}
