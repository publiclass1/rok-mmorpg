import { motion } from 'motion/react'

export function expFillRatio(exp: number, toNext: number): number {
  if (toNext <= 0) return 1
  return Math.min(1, Math.max(0, exp / toNext))
}

export function isNearLevelUp(exp: number, toNext: number): boolean {
  return toNext > 0 && exp / toNext >= 0.85
}

export function expNumLabel(exp: number, toNext: number): string {
  if (toNext <= 0) return 'MAX'
  return `${exp}/${toNext}`
}

type Props = {
  label: string
  level: number
  exp: number
  toNext: number
  fillClass: string
  animated?: boolean
}

export function ExpBarRow({ label, level, exp, toNext, fillClass, animated = true }: Props) {
  const ratio = expFillRatio(exp, toNext)
  const near = isNearLevelUp(exp, toNext)
  const tooltip =
    toNext <= 0 ? `${label} Lv ${level} — max level` : `${label} Lv ${level} — ${exp} / ${toNext} EXP`

  const fillStyle = { width: `${ratio * 100}%` }

  return (
    <div
      className={`vital-row exp-hud-row${near ? ' exp-hud-row--near-level' : ''}`}
      title={tooltip}
    >
      <span className="vital-label">{label}</span>
      <div className="vital-track">
        {animated ? (
          <motion.div
            className={`vital-fill ${fillClass}`}
            initial={false}
            animate={fillStyle}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          />
        ) : (
          <div className={`vital-fill ${fillClass}`} style={fillStyle} />
        )}
      </div>
      <span className="vital-num">
        Lv {level} {expNumLabel(exp, toNext)}
      </span>
    </div>
  )
}
