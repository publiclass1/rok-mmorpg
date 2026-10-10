const TOKEN_KEY = 'rok_auth_token'

let token: string | null = null

export function loadStoredToken(): string | null {
  if (token) return token
  try {
    token = localStorage.getItem(TOKEN_KEY)
  } catch {
    token = null
  }
  return token
}

export function setAuthToken(next: string | null): void {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function clearAuthToken(): void {
  setAuthToken(null)
}
