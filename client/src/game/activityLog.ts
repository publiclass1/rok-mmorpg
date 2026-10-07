import { emitGameEvent, type ActivityLogKind } from './events'

let seq = 0

export function logActivity(kind: ActivityLogKind, message: string, itemId?: string) {
  emitGameEvent('activityLog', {
    id: `${Date.now()}-${seq++}`,
    at: Date.now(),
    kind,
    message,
    ...(itemId ? { itemId } : {}),
  })
}
