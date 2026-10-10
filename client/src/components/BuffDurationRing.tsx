import { ItemIcon } from './ItemIcon'
import { SkillIcon } from './SkillIcon'

type Props = {
  progress: number
  iconSkillId: string
  iconItemId?: string
  skillLevel: number
}

const SIZE = 36
const STROKE = 3
const R = (SIZE - STROKE) / 2
const C = SIZE / 2
const CIRC = 2 * Math.PI * R

export function BuffDurationRing({ progress, iconSkillId, iconItemId, skillLevel }: Props) {
  const clamped = Math.min(1, Math.max(0, progress))
  const dashOffset = CIRC * (1 - clamped)

  return (
    <div className="buff-slot">
      <div className="buff-slot-icon">
        {iconItemId ? (
          <ItemIcon itemId={iconItemId} size={28} className="buff-slot-item-icon" alt="" />
        ) : (
          <SkillIcon skillId={iconSkillId} level={skillLevel} size="sm" />
        )}
        <svg
          className="buff-duration-ring"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden
        >
          <circle
            className="buff-duration-ring-track"
            cx={C}
            cy={C}
            r={R}
            fill="none"
            strokeWidth={STROKE}
          />
          <circle
            className="buff-duration-ring-progress"
            cx={C}
            cy={C}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${C} ${C})`}
          />
        </svg>
      </div>
    </div>
  )
}
