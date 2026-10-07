import { useState, type ReactNode } from 'react'
import { clearAdminPassword, getAdminPassword, setAdminPassword } from './adminAuth'

type Props = {
  title: string
  children: ReactNode
}

export function AdminGate({ title, children }: Props) {
  const [unlocked, setUnlocked] = useState(() => Boolean(getAdminPassword()))
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) {
      setError('Enter the admin password.')
      return
    }
    setAdminPassword(trimmed)
    setError(null)
    setUnlocked(true)
  }

  function lock() {
    clearAdminPassword()
    setUnlocked(false)
    setDraft('')
  }

  if (!unlocked) {
    return (
      <main className="map-admin-root admin-gate">
        <div className="panel admin-gate-card">
          <h1>{title}</h1>
          <p className="muted small">Enter the admin password to continue.</p>
          <form className="stack compact" onSubmit={submit}>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            {error && <p className="small admin-gate-error">{error}</p>}
            <button type="submit">Unlock</button>
          </form>
          <a className="map-admin-link" href="/">Back to game</a>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="admin-gate-bar">
        <button type="button" className="secondary hud-btn" onClick={lock}>
          Lock admin
        </button>
      </div>
      {children}
    </>
  )
}
