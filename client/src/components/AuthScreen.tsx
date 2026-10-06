import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { panelMotion } from './motion/motionPresets'
import { supabase } from '../lib/supabase'
import {
  friendlyAuthError,
  normalizeUsername,
  usernameToAuthEmail,
  validateUsername,
} from '../lib/accountAuth'

type Props = {
  onAuthed: () => void
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

    const email = usernameToAuthEmail(normalized)

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: normalized } },
          })

    setLoading(false)
    if (result.error) {
      setError(friendlyAuthError(result.error.message, normalized))
      return
    }

    if (mode === 'signup' && result.data.session) {
      onAuthed()
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setError(
        'Account created but not signed in. Turn off “Confirm email” in Supabase → Authentication → Email, then log in.',
      )
      setMode('login')
      return
    }

    onAuthed()
  }

  return (
    <motion.div className="panel auth-panel" {...panelMotion}>
      <h1>Browser Ragnarok-like</h1>
      <p className="muted">Sign in to create up to 3 characters and enter the world.</p>
      <p className="muted small">Username and password only — no email. Password at least 6 characters.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <button type="button" className="linkish" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
      </button>
    </motion.div>
  )
}
