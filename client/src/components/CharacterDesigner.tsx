import { useState } from 'react'
import {
  APPEARANCE_COLOR_COUNT,
  BODY_COLOR_PALETTE,
  CLOTHES_COLOR_PALETTE,
  DEFAULT_CHARACTER_APPEARANCE,
  EYE_COLOR_PALETTE,
  HAIR_COLOR_PALETTE,
  colorToCss,
  type CharacterAppearance,
  type CharacterGender,
} from '../game/character/characterAppearance'
type Props = {
  value: CharacterAppearance
  onChange: (next: CharacterAppearance) => void
}

type DesignerTab = 'style' | 'body' | 'hair' | 'eyes' | 'clothes'

const TABS: { id: DesignerTab; label: string }[] = [
  { id: 'style', label: 'Style' },
  { id: 'body', label: 'Body' },
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'clothes', label: 'Clothes' },
]

type SwatchGridProps = {
  label: string
  palette: readonly number[]
  selected: number
  onSelect: (index: number) => void
}

function ColorSwatchGrid({ label, palette, selected, onSelect }: SwatchGridProps) {
  return (
    <div className="char-designer-panel">
      <p className="char-designer-panel-hint muted small">{label} — pick a color</p>
      <div className="char-designer-swatches" role="radiogroup" aria-label={label}>
        {Array.from({ length: APPEARANCE_COLOR_COUNT }, (_, index) => {
          const hex = palette[index] ?? palette[0]
          const active = selected === index
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={active}
              title={`${label} ${index + 1}`}
              className={`char-designer-swatch${active ? ' char-designer-swatch--active' : ''}`}
              style={{ backgroundColor: colorToCss(hex) }}
              onClick={() => onSelect(index)}
            />
          )
        })}
      </div>
    </div>
  )
}

export function CharacterDesigner({ value, onChange }: Props) {
  const appearance = value ?? DEFAULT_CHARACTER_APPEARANCE
  const [tab, setTab] = useState<DesignerTab>('style')

  function setGender(gender: CharacterGender) {
    onChange({ ...appearance, gender })
  }

  return (
    <div className="char-designer">
      <div className="char-designer-controls">
        <div className="char-designer-tabs" role="tablist" aria-label="Customize">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`char-designer-tab${tab === t.id ? ' char-designer-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="char-designer-tab-panel" role="tabpanel">
            {tab === 'style' && (
              <div className="char-designer-gender" role="radiogroup" aria-label="Gender">
                <p className="char-designer-panel-hint muted small">Character gender</p>
                <div className="row char-designer-gender-row">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={appearance.gender === g}
                      className={`char-designer-gender-btn${appearance.gender === g ? ' char-designer-gender-btn--active' : ''}`}
                      onClick={() => setGender(g)}
                    >
                      {g === 'male' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === 'body' && (
              <ColorSwatchGrid
                label="Body"
                palette={BODY_COLOR_PALETTE}
                selected={appearance.bodyColor}
                onSelect={(bodyColor) => onChange({ ...appearance, bodyColor })}
              />
            )}
            {tab === 'hair' && (
              <ColorSwatchGrid
                label="Hair"
                palette={HAIR_COLOR_PALETTE}
                selected={appearance.hairColor}
                onSelect={(hairColor) => onChange({ ...appearance, hairColor })}
              />
            )}
            {tab === 'eyes' && (
              <ColorSwatchGrid
                label="Eyes"
                palette={EYE_COLOR_PALETTE}
                selected={appearance.eyeColor}
                onSelect={(eyeColor) => onChange({ ...appearance, eyeColor })}
              />
            )}
            {tab === 'clothes' && (
              <ColorSwatchGrid
                label="Clothes"
                palette={CLOTHES_COLOR_PALETTE}
                selected={appearance.clothesColor}
                onSelect={(clothesColor) => onChange({ ...appearance, clothesColor })}
              />
            )}
        </div>
      </div>
    </div>
  )
}
