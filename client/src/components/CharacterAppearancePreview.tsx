import {
  colorToCss,
  resolveAppearanceColors,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { resolveJobAvatarKey } from '../game/player/playerJobAvatar'

type Props = {
  appearance: CharacterAppearance
  jobId?: string
  className?: string
  size?: 'sm' | 'lg'
}

export function CharacterAppearancePreview({ appearance, jobId, className, size = 'sm' }: Props) {
  const colors = resolveAppearanceColors(appearance)
  const female = appearance.gender === 'female'
  const bodyW = female ? 14 : 16
  const hairW = female ? 13 : 12
  const avatarKey = jobId ? resolveJobAvatarKey(jobId) : 'novice'
  const jobClass = jobId ? ` character-appearance-preview--job-${avatarKey}` : ''

  return (
    <div
      className={`character-appearance-preview character-appearance-preview--${size}${jobClass}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <div
        className="character-appearance-preview__hair"
        style={{
          width: hairW,
          backgroundColor: colorToCss(colors.hair),
        }}
      />
      <div
        className="character-appearance-preview__head"
        style={{ backgroundColor: colorToCss(colors.skin) }}
      />
      <div className="character-appearance-preview__eyes">
        <span style={{ backgroundColor: colorToCss(colors.eyes) }} />
        <span style={{ backgroundColor: colorToCss(colors.eyes) }} />
      </div>
      <div
        className="character-appearance-preview__body"
        style={{
          width: bodyW,
          backgroundColor: colorToCss(colors.shirt),
        }}
      />
      <div
        className="character-appearance-preview__legs"
        style={{ backgroundColor: colorToCss(colors.pants) }}
      />
      <div className="character-appearance-preview__feet" style={{ backgroundColor: colorToCss(colors.shoes) }} />
      <div className="character-appearance-preview__job-accent" aria-hidden />
    </div>
  )
}
