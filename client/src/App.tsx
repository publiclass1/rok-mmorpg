import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { AuthScreen } from './components/AuthScreen'
import { CharacterSelect } from './components/CharacterSelect'
import { GameView } from './components/GameView'
import type { CharacterRow } from './types/database'
import './App.css'

type Screen = 'auth' | 'characters' | 'game'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [screen, setScreen] = useState<Screen>('auth')
  const [activeCharacter, setActiveCharacter] = useState<CharacterRow | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setScreen(data.session ? 'characters' : 'auth')
      setBooting(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setScreen(next ? 'characters' : 'auth')
      if (!next) setActiveCharacter(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  if (booting) {
    return (
      <main className="app-root">
        <p>Loading…</p>
      </main>
    )
  }

  return (
    <main className="app-root">
      {screen === 'auth' && (
        <AuthScreen
          onAuthed={() => {
            setScreen('characters')
          }}
        />
      )}

      {screen === 'characters' && session && (
        <CharacterSelect
          onSelect={(c) => {
            setActiveCharacter(c)
            setScreen('game')
          }}
          onLogout={() => setScreen('auth')}
        />
      )}

      {screen === 'game' && activeCharacter && (
        <GameView
          character={activeCharacter}
          onCharacterUpdated={setActiveCharacter}
          onExit={() => setScreen('characters')}
        />
      )}
    </main>
  )
}

export default App
