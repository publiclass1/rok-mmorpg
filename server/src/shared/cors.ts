export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-password',
}

export const jsonCorsHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

/** Attach CORS headers to an existing Response (e.g. auth errors thrown from shared helpers). */
export function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders)) {
    if (!headers.has(key)) headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
