import { motion } from 'motion/react'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

function expFillRatio(exp: number, toNext: number): number {
  if (toNext <= 0) return 1
  return Math.min(1, Math.max(0, exp / toNext))
}

function isNearLevelUp(exp: number, toNext: number): boolean {
  return toNext > 0 && exp / toNext >= 0.85
}

function expNumLabel(exp: number, toNext: number): string {
  if (toNext <= 0) return 'MAX'
  return `${exp}/${toNext}`
}

type ExpRowProps = {
  label: string
  level: number
  exp: number
  toNext: number
  fillClass: string
}

function ExpRow({ label, level, exp, toNext, fillClass }: ExpRowProps) {
  const ratio = expFillRatio(exp, toNext)
  const near = isNearLevelUp(exp, toNext)
  const tooltip = toNext <= 0 ? `${label} Lv ${level} — max level` : `${label} Lv ${level} — ${exp} / ${toNext} EXP`

  return (
    <div
      className={`vital-row exp-hud-row${near ? ' exp-hud-row--near-level' : ''}`}
      title={tooltip}
    >
      <span className="vital-label">{label}</span>
      <div className="vital-track">
        <motion.div
          className={`vital-fill ${fillClass}`}
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        />
      </div>
      <span className="vital-num">
        Lv {level} {expNumLabel(exp, toNext)}
      </span>
    </div>
  )
}

export function ExperienceHud({ sheet }: Props) {
  return (
    <div className="exp-hud" aria-label="Experience">
      <div className="exp-hud__half exp-hud__half--base">
        <ExpRow
          label="Base"
          level={sheet.baseLevel}
          exp={sheet.baseExp}
          toNext={sheet.baseExpToNext}
          fillClass="vital-fill--base-exp"
        />
      </div>
      <div className="exp-hud__half exp-hud__half--job">
        <ExpRow
          label="Job"
          level={sheet.jobLevel}
          exp={sheet.jobExp}
          toNext={sheet.jobExpToNext}
          fillClass="vital-fill--job-exp"
        />
      </div>
    </div>
  )
}
