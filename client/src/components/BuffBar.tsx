import { useEffect, useState } from 'react'
import type { PlayerBuffPayload } from '../game/events'
import { BuffDurationRing } from './BuffDurationRing'

type Props = {
  buffs: PlayerBuffPayload[]
}

function remainingProgress(buff: PlayerBuffPayload, now: number): number {
  const remaining = buff.expiresAt - now
  if (remaining <= 0) return 0
  return remaining / buff.durationMs
}

export function BuffBar({ buffs }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (buffs.length === 0) return
    let frame = 0
    const tick = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [buffs])

  if (buffs.length === 0) return null

  return (
    <div className="buff-bar" role="status" aria-label="Active buffs">
      {buffs.map((buff) => {
        const progress = remainingProgress(buff, now)
        const seconds = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000))
        const title = `${buff.name} Lv ${buff.skillLevel} — ${seconds}s remaining`
        return (
          <BuffDurationRing
            key={buff.statusId}
            progress={progress}
            iconSkillId={buff.iconSkillId}
            skillLevel={buff.skillLevel}
            title={title}
          />
        )
      })}
    </div>
  )
}
