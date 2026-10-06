import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { CharacterRow } from '../types/database'

type Props = {
  onSelect: (character: CharacterRow) => void
  onLogout: () => void
}

export function CharacterSelect({ onSelect, onLogout }: Props) {
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadCharacters() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      setCharacters([])
      return
    }

    const { data, error: err } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('slot', { ascending: true })

    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setCharacters(data ?? [])
  }

  useEffect(() => {
    void loadCharacters()
  }, [])

  async function createCharacter(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('Name must be at least 3 characters')
      return
    }
    if (characters.length >= 3) {
      setError('Maximum of 3 characters per account')
      return
    }

    const usedSlots = new Set(characters.map((c) => c.slot))
    const slot = ([1, 2, 3] as const).find((s) => !usedSlots.has(s)) ?? 1

    const { data, error: err } = await supabase
      .from('characters')
      .insert({ name: trimmed, slot, user_id: (await supabase.auth.getUser()).data.user!.id })
      .select('*')
      .single()

    if (err) {
      if (err.code === '23505' && err.message.includes('characters_name_unique')) {
        setError('That name is already taken (names are unique across all players). Pick another or check your list below.')
        void loadCharacters()
        return
      }
      setError(err.message)
      return
    }
    setName('')
    setCharacters((prev) => [...prev, data].sort((a, b) => a.slot - b.slot))
  }

  async function deleteCharacter(id: string) {
    setError(null)
    const { error: err } = await supabase.from('characters').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    setCharacters((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="panel">
      <header className="row spread">
        <h1>Select character</h1>
        <button type="button" className="secondary" onClick={() => void supabase.auth.signOut().then(onLogout)}>
          Log out
        </button>
      </header>

      {loading ? (
        <p>Loading characters…</p>
      ) : (
        <ul className="char-list">
          {characters.map((c) => (
            <li key={c.id} className="char-row">
              <div>
                <strong>{c.name}</strong>
                <span className="muted">
                  Slot {c.slot} · {c.map_id} · {c.zeny} zeny
                </span>
              </div>
              <div className="row">
                <button type="button" onClick={() => onSelect(c)}>
                  Enter world
                </button>
                <button type="button" className="danger" onClick={() => void deleteCharacter(c.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={createCharacter} className="stack compact">
        <h2>Create character ({characters.length}/3)</h2>
        <label>
          Name (globally unique)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} disabled={characters.length >= 3} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={characters.length >= 3}>
          Create
        </button>
      </form>
    </div>
  )
}
