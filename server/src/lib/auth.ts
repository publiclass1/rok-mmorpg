import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username: 3–20 characters, letters, numbers, and underscore only.'
  }
  return null
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) throw new Error('JWT_SECRET is not set')
  return secret
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret(), { expiresIn: '30d' })
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, jwtSecret()) as { sub?: string }
    if (!payload.sub) return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}

export function bearerFromRequest(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7).trim()
}
