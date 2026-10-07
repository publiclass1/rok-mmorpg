import type { MapPresenceChannel } from './mapChannel'

let active: MapPresenceChannel | null = null

export function registerActiveMapPresence(channel: MapPresenceChannel) {
  active = channel
}

export function clearActiveMapPresence(channel: MapPresenceChannel) {
  if (active === channel) active = null
}

/** Await leave on the active map channel (call before destroying the Phaser game on warp). */
export async function flushActiveMapPresenceLeave(): Promise<void> {
  const channel = active
  if (!channel) return
  active = null
  await channel.leave()
}
