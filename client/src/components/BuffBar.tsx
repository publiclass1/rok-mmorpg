import { useEffect, useState } from 'react'
import type { PlayerBuffPayload } from '../game/events'
import type { CharacterSheetPayload } from '../game/events'
import { PECO_RIDE_STATUS_ID } from '../game/character/statusEffects'
import { SkillHoverTooltip } from './SkillHoverTooltip'
import { BuffDurationRing } from './BuffDurationRing'
import { BuffStatusIcon } from './BuffStatusIcon'

type Props = {
  buffs: PlayerBuffPayload[]
  sheet: CharacterSheetPayload
}

function remainingProgress(buff: PlayerBuffPayload, now: number): number {
  const remaining = buff.expiresAt - now
  if (remaining <= 0) return 0
  return remaining / buff.durationMs
}

function buffTitle(buff: PlayerBuffPayload, now: number): string {
  const seconds = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000))
  if (buff.iconItemId) {
    return `${buff.name} — ${seconds}s remaining`
  }
  return `${buff.name} Lv ${buff.skillLevel} — ${seconds}s remaining`
}

function statusTitle(buff: PlayerBuffPayload, now: number): string {
  if (buff.statusId === PECO_RIDE_STATUS_ID || buff.statusId === 'rental_peco_peco') {
    if (buff.statusId === 'rental_peco_peco' && Number.isFinite(buff.expiresAt)) {
      const remaining = buff.expiresAt - now
      if (remaining > 0) {
        const seconds = Math.max(0, Math.ceil(remaining / 1000))
        const mins = Math.floor(seconds / 60)
        const sec = seconds % 60
        return `Riding Peco Peco — ${mins}:${sec.toString().padStart(2, '0')} left`
      }
    }
    return 'Riding Peco Peco'
  }
  if (buff.statusId.startsWith('rental_') && Number.isFinite(buff.expiresAt)) {
    const remaining = buff.expiresAt - now
    if (remaining > 0) {
      const seconds = Math.max(0, Math.ceil(remaining / 1000))
      const mins = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${buff.name} active — ${mins}:${sec.toString().padStart(2, '0')} left`
    }
  }
  return `${buff.name} active`
}

function isStatusDisplay(buff: PlayerBuffPayload): boolean {
  return buff.displayKind === 'status'
}

export function BuffBar({ buffs, sheet }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const hasTimedBuff = buffs.some((b) => !isStatusDisplay(b))
  const hasRentalStatus = buffs.some((b) => isStatusDisplay(b) && b.statusId.startsWith('rental_'))

  useEffect(() => {
    if (buffs.length === 0) return
    if (!hasTimedBuff && !hasRentalStatus) return
    let frame = 0
    const tick = () => {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [buffs, hasTimedBuff, hasRentalStatus])

  if (buffs.length === 0) return null

  return (
    <div className="buff-bar" role="status" aria-label="Active buffs">
      {buffs.map((buff) => {
        const footer = isStatusDisplay(buff) ? statusTitle(buff, now) : buffTitle(buff, now)
        if (isStatusDisplay(buff)) {
          return (
            <SkillHoverTooltip
              key={buff.statusId}
              skillId={buff.iconSkillId}
              sheet={sheet}
              footerLines={[footer]}
            >
              <BuffStatusIcon iconSkillId={buff.iconSkillId} skillLevel={buff.skillLevel} />
            </SkillHoverTooltip>
          )
        }
        const progress = remainingProgress(buff, now)
        return (
          <SkillHoverTooltip
            key={buff.statusId}
            skillId={buff.iconSkillId}
            sheet={sheet}
            footerLines={[footer]}
          >
            <BuffDurationRing
              progress={progress}
              iconSkillId={buff.iconSkillId}
              iconItemId={buff.iconItemId}
              skillLevel={buff.skillLevel}
            />
          </SkillHoverTooltip>
        )
      })}
    </div>
  )
}
