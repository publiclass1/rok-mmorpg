import { AsyncLocalStorage } from 'node:async_hooks'

export const requestStore = new AsyncLocalStorage<Request>()

export function getRequest(): Request {
  const req = requestStore.getStore()
  if (!req) throw new Error('No active HTTP request context')
  return req
}
