import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { panelMotion } from './motion/motionPresets'
import { PreGameBackdrop } from './PreGameBackdrop'
import { apiFetch } from '../lib/http'
import { setAuthToken } from '../lib/authStore'
import {
  friendlyAuthError,
  normalizeUsername,
  validateUsername,
} from '../lib/accountAuth'

type Props = {
  onAuthed: (user: { id: string; username: string }) => void
}

export function AuthScreen({ onAuthed }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const normalized = normalizeUsername(username)
    const validationError = validateUsername(normalized)
    if (validationError) {
      setLoading(false)
      setError(validationError)
      return
    }

    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const result = await apiFetch<{ token: string; user: { id: string; username: string } }>(path, {
        method: 'POST',
        body: JSON.stringify({ username: normalized, password }),
      })
      setAuthToken(result.token)
      onAuthed(result.user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(friendlyAuthError(msg, normalized))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <PreGameBackdrop hero />
      <motion.div className="panel auth-panel auth-panel--glass" {...panelMotion}>
        <p className="auth-screen__brand">ROK-MMORPG</p>
        <h1 className="auth-screen__title">Sign in</h1>
        <p className="muted">Create up to 3 characters and enter the world.</p>
        <p className="muted small">Username and password only — no email. Password at least 6 characters.</p>
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={loading}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
        <p className="muted small">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button type="button" className="link-button" onClick={() => setMode('signup')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="link-button" onClick={() => setMode('login')}>
                Log in
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  )
}
