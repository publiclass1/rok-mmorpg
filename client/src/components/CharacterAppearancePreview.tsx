import {
  colorToCss,
  resolveAppearanceColors,
  type CharacterAppearance,
} from '../game/character/characterAppearance'

type Props = {
  appearance: CharacterAppearance
  className?: string
  size?: 'sm' | 'lg'
}

export function CharacterAppearancePreview({ appearance, className, size = 'sm' }: Props) {
  const colors = resolveAppearanceColors(appearance)
  const female = appearance.gender === 'female'
  const bodyW = female ? 14 : 16
  const hairW = female ? 13 : 12

  return (
    <div
      className={`character-appearance-preview character-appearance-preview--${size}${className ? ` ${className}` : ''}`}
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
    </div>
  )
}
