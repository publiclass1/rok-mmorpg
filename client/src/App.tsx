import { useEffect, useState } from 'react'
import { apiFetch } from './lib/http'
import { clearAuthToken, loadStoredToken } from './lib/authStore'
import { disconnectGameSocket } from './lib/socket'
import { AuthScreen } from './components/AuthScreen'
import { CharacterSelect } from './components/CharacterSelect'
import { GameView } from './components/GameView'
import { SplashScreen } from './components/SplashScreen'
import type { CharacterRow } from './types/database'
import './App.css'

type Screen = 'auth' | 'characters' | 'game'

type AuthUser = { id: string; username: string }

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [screen, setScreen] = useState<Screen>('auth')
  const [activeCharacter, setActiveCharacter] = useState<CharacterRow | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const token = loadStoredToken()
    if (!token) {
      setBooting(false)
      return
    }
    void apiFetch<{ user: AuthUser }>('/api/auth/me')
      .then(({ user: me }) => {
        setUser(me)
        setScreen('characters')
      })
      .catch(() => {
        clearAuthToken()
        setUser(null)
        setScreen('auth')
      })
      .finally(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <main className="app-root">
        <SplashScreen phase="boot" />
      </main>
    )
  }

  return (
    <main
      className={`app-root${screen === 'game' ? ' app-root--game' : ''}${screen === 'characters' ? ' app-root--char-select' : ''}${screen === 'auth' ? ' app-root--auth' : ''}`}
    >
      {screen === 'auth' && (
        <AuthScreen
          onAuthed={(next) => {
            setUser(next)
            setScreen('characters')
          }}
        />
      )}

      {screen === 'characters' && user && (
        <CharacterSelect
          onSelect={(c) => {
            setActiveCharacter(c)
            setScreen('game')
          }}
          onLogout={() => {
            clearAuthToken()
            disconnectGameSocket()
            setUser(null)
            setScreen('auth')
          }}
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
