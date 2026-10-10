import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { requestStore } from '../lib/requestContext.js'

export async function runEdgeHandler(
  expressReq: ExpressRequest,
  expressRes: ExpressResponse,
  handler: (req: globalThis.Request) => Promise<globalThis.Response>,
): Promise<void> {
  const url = `${expressReq.protocol}://${expressReq.get('host') ?? 'localhost'}${expressReq.originalUrl}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(expressReq.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) headers.set(key, value.join(', '))
    else headers.set(key, value)
  }

  const init: RequestInit = {
    method: expressReq.method,
    headers,
  }
  if (expressReq.method !== 'GET' && expressReq.method !== 'HEAD') {
    init.body = JSON.stringify(expressReq.body ?? {})
    headers.set('content-type', 'application/json')
  }

  const webReq = new Request(url, init)

  await requestStore.run(webReq, async () => {
    const webRes = await handler(webReq)
    expressRes.status(webRes.status)
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') return
      expressRes.setHeader(key, value)
    })
    const text = await webRes.text()
    expressRes.send(text)
  })
}
