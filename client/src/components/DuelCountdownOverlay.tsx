import { useEffect, useState } from 'react'
import type { DuelSyncPayload } from '../game/events'

type Props = {
  duel: DuelSyncPayload
}

export function DuelCountdownOverlay({ duel }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!duel.fightStartsAt) {
      setSecondsLeft(0)
      return
    }
    const tick = () => {
      const remaining = Math.ceil((duel.fightStartsAt! - Date.now()) / 1000)
      setSecondsLeft(Math.max(0, remaining))
    }
    tick()
    const id = window.setInterval(tick, 100)
    return () => window.clearInterval(id)
  }, [duel.fightStartsAt, duel.duelSessionId])

  if (!duel.fightStartsAt || secondsLeft <= 0) return null
  if (duel.state !== 'countdown' && duel.state !== 'active') return null

  return (
    <div className="duel-countdown-overlay" aria-live="polite" aria-label="Duel countdown">
      <div className="duel-countdown-overlay__inner">
        <p className="duel-countdown-overlay__label">Duel starts in</p>
        <p className="duel-countdown-overlay__value">{secondsLeft}</p>
      </div>
    </div>
  )
}
