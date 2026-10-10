import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/auth.js'

export type AuthedRequest = Request & { userId?: string }

export function authedUserId(req: Request): string {
  return (req as AuthedRequest).userId as string
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }
  const verified = verifyAccessToken(header.slice(7).trim())
  if (!verified) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  ;(req as AuthedRequest).userId = verified.userId
  next()
}
