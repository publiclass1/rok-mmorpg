import { clearAuthToken, loadStoredToken } from './authStore'

function apiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return ''
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBase()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init.headers)
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json')
  }
  const token = loadStoredToken()
  if (token) headers.set('authorization', `Bearer ${token}`)

  const res = await fetch(url, { ...init, headers })
  const text = await res.text()
  let body: { error?: string } | T = {}
  if (text) {
    try {
      body = JSON.parse(text) as { error?: string } | T
    } catch {
      body = { error: text } as { error?: string }
    }
  }

  if (res.status === 401) clearAuthToken()

  if (!res.ok) {
    const errMsg =
      typeof body === 'object' && body && 'error' in body && body.error
        ? String(body.error)
        : `Request failed (${res.status})`
    throw new ApiError(errMsg, res.status)
  }

  return body as T
}
