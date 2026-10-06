/** Maps a public username to Supabase Auth email (no real inbox; confirm email should be off). */

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

function authEmailDomain(): string {
  const fromEnv = import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim()
  if (fromEnv) return fromEnv

  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (url) {
    try {
      const ref = new URL(url).hostname.split('.')[0]
      if (ref) return `${ref}.account.local`
    } catch {
      /* fall through */
    }
  }

  return 'account.local'
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username: 3–20 characters, letters, numbers, and underscore only.'
  }
  return null
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${authEmailDomain()}`
}

export function friendlyAuthError(message: string, username: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'That username is already taken.'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Wrong username or password.'
  }
  if (lower.includes('email rate limit')) {
    return 'Too many signup attempts. Wait a bit, or turn off “Confirm email” in Supabase → Authentication → Email.'
  }
  if (lower.includes('invalid') && validateUsername(normalizeUsername(username)) === null) {
    return message
  }
  return message
}
