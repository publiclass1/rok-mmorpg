import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

const BLOCKED_TEST_DOMAINS = ['example.com', 'example.org', 'example.net', 'test.com', 'test']

function friendlyAuthError(message: string, email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  if (
    message.toLowerCase().includes('invalid') &&
    domain &&
    BLOCKED_TEST_DOMAINS.includes(domain)
  ) {
    return `Supabase does not allow @${domain} addresses. Use a real domain for testing (e.g. your Gmail) or disable “Confirm email” and try another address.`
  }
  return message
}

type Props = {
  onAuthed: () => void
}

export function AuthScreen({ onAuthed }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (result.error) {
      setError(friendlyAuthError(result.error.message, email.trim()))
      return
    }

    if (mode === 'signup' && result.data.session) {
      onAuthed()
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setError(
        'Account created. Check your email to confirm, then log in. (Or turn off “Confirm email” in Supabase → Authentication → Email for local dev.)',
      )
      setMode('login')
      return
    }

    onAuthed()
  }

  return (
    <div className="panel auth-panel">
      <h1>Browser Ragnarok-like</h1>
      <p className="muted">Sign in to create up to 3 characters and enter the world.</p>
      <p className="muted small">
        Local dev: use a real email domain (not <code>@example.com</code>). Password at least 6 characters.
      </p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
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
    </div>
  )
}
