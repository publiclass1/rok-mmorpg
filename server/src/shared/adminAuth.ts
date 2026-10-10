// @ts-nocheck
import { corsHeaders } from './cors.js'

const encoder = new TextEncoder()

const jsonCors = { ...corsHeaders, 'Content-Type': 'application/json' }

function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

export function assertAdminPassword(provided: string): void {
  const expected = process.env.ADMIN_PANEL_PASSWORD ?? ''
  if (!expected) {
    throw new Response(
      JSON.stringify({
        error: 'Admin panel is not configured. Set ADMIN_PANEL_PASSWORD in server environment.',
      }),
      { status: 503, headers: jsonCors },
    )
  }
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw new Response(JSON.stringify({ error: 'Invalid admin password' }), {
      status: 401,
      headers: jsonCors,
    })
  }
}

export function adminPasswordFromRequest(req: Request, body?: { adminPassword?: string }): string {
  const fromHeader = req.headers.get('X-Admin-Password') ?? ''
  const fromBody = body?.adminPassword ?? ''
  return fromHeader || fromBody
}
