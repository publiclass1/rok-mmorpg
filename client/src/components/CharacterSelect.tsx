import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  appearanceFromCharacterRow,
  appearanceToRowFields,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { createDefaultEquipment } from '../game/character/characterState'
import { JOB_NAMES } from '../game/character/skillsConfig'
import { mapDisplayName } from '../game/world/mapDisplayName'
import {
  loadCharactersForSelect,
  type CharacterSelectEntry,
} from '../lib/characterProgress'
import { supabase } from '../lib/supabase'
import type { CharacterRow } from '../types/database'
import { CharacterDesigner } from './CharacterDesigner'
import { CharacterEquipReadOnly } from './CharacterEquipReadOnly'
import { CharacterSelectExpBars } from './CharacterSelectExpBars'

type Props = {
  onSelect: (character: CharacterRow) => void
  onLogout: () => void
}

function entryForSlot(entries: CharacterSelectEntry[], slot: number): CharacterSelectEntry | null {
  return entries.find((e) => e.character.slot === slot) ?? null
}

function defaultSelectedSlot(entries: CharacterSelectEntry[]): number {
  const occupied = entries.map((e) => e.character.slot).sort((a, b) => a - b)
  if (occupied.length > 0) return occupied[0]
  return 1
}

export function CharacterSelect({ onSelect, onLogout }: Props) {
  const [entries, setEntries] = useState<CharacterSelectEntry[]>([])
  const [selectedSlot, setSelectedSlot] = useState(1)
  const [name, setName] = useState('')
  const [draftAppearance, setDraftAppearance] = useState<CharacterAppearance>(DEFAULT_CHARACTER_APPEARANCE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadCharacters() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      setEntries([])
      return
    }

    const { entries: loaded, error: loadError } = await loadCharactersForSelect(user.id)
    setLoading(false)
    if (loadError) {
      setError(loadError)
      return
    }
    setEntries(loaded)
    setSelectedSlot(defaultSelectedSlot(loaded))
  }

  useEffect(() => {
    void loadCharacters()
  }, [])

  const selectedEntry = useMemo(
    () => entryForSlot(entries, selectedSlot),
    [entries, selectedSlot],
  )

  const canCreate = entries.length < 3 && !entryForSlot(entries, selectedSlot)

  async function createCharacter(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('Name must be at least 3 characters')
      return
    }
    if (entries.length >= 3) {
      setError('Maximum of 3 characters per account')
      return
    }
    if (entryForSlot(entries, selectedSlot)) {
      setError('This slot is already in use')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase
      .from('characters')
      .insert({
        name: trimmed,
        slot: selectedSlot,
        user_id: user.id,
        ...appearanceToRowFields(draftAppearance),
      })
      .select('*')
      .single()

    if (err) {
      if (err.code === '23505' && err.message.includes('characters_name_unique')) {
        setError(
          'That name is already taken (names are unique across all players). Pick another or check your list below.',
        )
        void loadCharacters()
        return
      }
      setError(err.message)
      return
    }
    setName('')
    setDraftAppearance(DEFAULT_CHARACTER_APPEARANCE)
    await loadCharacters()
    setSelectedSlot(data.slot)
  }

  async function deleteCharacter(id: string, charName: string) {
    if (!window.confirm(`Delete character "${charName}"? This cannot be undone.`)) {
      return
    }
    setError(null)
    const { error: err } = await supabase.from('characters').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    await loadCharacters()
  }

  return (
    <div className="char-select-screen">
      <div className="char-select-tiles" aria-hidden />
      <div className="char-select-inner">
        <header className="char-select-header row spread">
          <h1 className="char-select-title">Character Selection</h1>
          <button
            type="button"
            className="secondary char-select-btn"
            onClick={() => void supabase.auth.signOut().then(onLogout)}
          >
            Log out
          </button>
        </header>

        {loading ? (
          <p className="char-select-loading">Loading characters…</p>
        ) : (
          <>
            <div className="char-select-detail char-select-frame">
              {selectedEntry ? (
                <>
                  <div className="char-select-meta">
                    <div>
                      <h2 className="char-select-name">{selectedEntry.character.name}</h2>
                      <p className="char-select-sub muted">
                        {JOB_NAMES[selectedEntry.jobId] ?? selectedEntry.jobId}
                        {' · '}
                        {mapDisplayName(selectedEntry.character.map_id)}
                      </p>
                    </div>
                    <p className="char-select-zeny">
                      <span className="muted">Zeny</span>{' '}
                      <strong>{selectedEntry.character.zeny.toLocaleString()}</strong>
                    </p>
                  </div>
                  <CharacterEquipReadOnly
                    equipment={selectedEntry.equipment}
                    appearance={appearanceFromCharacterRow(selectedEntry.character)}
                    compact
                    centerClassName="char-select-preview-bg"
                  />
                  <CharacterSelectExpBars progress={selectedEntry.progress} />
                </>
              ) : (
                <>
                  <div className="char-select-meta char-select-meta--create">
                    <div>
                      <h2 className="char-select-name">New character — slot {selectedSlot}</h2>
                      <p className="char-select-sub muted">Customize colors, then name your character below.</p>
                    </div>
                  </div>
                  <CharacterEquipReadOnly
                    equipment={createDefaultEquipment()}
                    appearance={draftAppearance}
                    compact
                    centerClassName="char-select-preview-bg"
                  />
                  <CharacterDesigner value={draftAppearance} onChange={setDraftAppearance} />
                </>
              )}
            </div>

            <div className="char-select-slots" role="tablist" aria-label="Character slots">
              {([1, 2, 3] as const).map((slot) => {
                const entry = entryForSlot(entries, slot)
                const selected = selectedSlot === slot
                const jobLabel = entry
                  ? JOB_NAMES[entry.jobId] ?? entry.jobId
                  : 'Empty'
                const lvHint = entry
                  ? `Base ${entry.progress.baseLevel} / Job ${entry.progress.jobLevel}`
                  : '—'

                return (
                  <button
                    key={slot}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`char-select-slot-tab char-select-frame${selected ? ' char-select-slot-tab--active' : ''}${!entry ? ' char-select-slot-tab--empty' : ''}`}
                    onClick={() => {
                      setSelectedSlot(slot)
                      if (!entry) setDraftAppearance(DEFAULT_CHARACTER_APPEARANCE)
                    }}
                  >
                    <span className="char-select-slot-num">Slot {slot}</span>
                    <span className="char-select-slot-name">{entry?.character.name ?? 'Empty'}</span>
                    <span className="char-select-slot-hint muted small">
                      {jobLabel} · {lvHint}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="char-select-actions char-select-frame">
              {selectedEntry ? (
                <div className="row spread char-select-action-row">
                  <button type="button" className="char-select-btn char-select-btn--primary" onClick={() => onSelect(selectedEntry.character)}>
                    Connect
                  </button>
                  <button
                    type="button"
                    className="danger char-select-btn"
                    onClick={() => void deleteCharacter(selectedEntry.character.id, selectedEntry.character.name)}
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <form onSubmit={createCharacter} className="stack compact char-select-create">
                  <h2 className="char-select-create-title">Name your character ({entries.length}/3)</h2>
                  <label>
                    Name (globally unique)
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={24}
                      disabled={!canCreate}
                      className="char-select-input"
                    />
                  </label>
                  <button type="submit" className="char-select-btn char-select-btn--primary" disabled={!canCreate}>
                    Create in slot {selectedSlot}
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {error && <p className="error char-select-error">{error}</p>}
      </div>
    </div>
  )
}
