import type { CSSProperties } from 'react'

type Props = {
  hp: number
  hpMax: number
}

export function LowHpVignette({ hp, hpMax }: Props) {
  if (hpMax <= 0 || hp <= 0 || hp / hpMax > 0.1) return null

  const ratio = hp / hpMax
  const critical = ratio <= 0.05
  const intensity = critical ? 0.92 : 0.72

  return (
    <div
      className={`low-hp-vignette${critical ? ' low-hp-vignette--critical' : ''}`}
      style={{ '--low-hp-intensity': intensity } as CSSProperties}
      aria-hidden
    />
  )
}
