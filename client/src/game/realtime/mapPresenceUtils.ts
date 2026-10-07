export const PRESENCE_STALE_MS = 2000

export function parsePresenceLeaveCharacterId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const id = (payload as { characterId?: unknown }).characterId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

/** Returns true if any entry was removed. */
export function pruneStaleRemoteEntries(
  remotes: Map<string, { at: number }>,
  now: number,
  staleMs: number = PRESENCE_STALE_MS,
): boolean {
  let changed = false
  for (const [id, entry] of remotes) {
    if (now - entry.at > staleMs) {
      remotes.delete(id)
      changed = true
    }
  }
  return changed
}
