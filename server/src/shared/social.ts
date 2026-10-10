// @ts-nocheck
export const SOCIAL_RANGE = 120
export const MAX_PARTY_SIZE = 12
export const GUILD_CREATE_ZENY = 5000

export async function assertSameMapAndRange(
  service: ReturnType<typeof import('./supabase.js').createServiceClient>,
  aId: string,
  bId: string,
) {
  const { data: chars, error } = await service
    .from('characters')
    .select('id, map_id, x, y')
    .in('id', [aId, bId])

  if (error || !chars || chars.length !== 2) {
    throw new Response(JSON.stringify({ error: 'Characters not found' }), { status: 404 })
  }

  const a = chars.find((c) => c.id === aId)!
  const b = chars.find((c) => c.id === bId)!

  if (a.map_id !== b.map_id) {
    throw new Response(JSON.stringify({ error: 'Must be on the same map' }), { status: 400 })
  }

  const dx = a.x - b.x
  const dy = a.y - b.y
  if (Math.sqrt(dx * dx + dy * dy) > SOCIAL_RANGE) {
    throw new Response(JSON.stringify({ error: 'Too far away' }), { status: 400 })
  }
}

export type SessionInvSlot = { itemId: string; quantity: number }

export function parseSessionInventory(raw: unknown): SessionInvSlot[] {
  if (!Array.isArray(raw)) return []
  const out: SessionInvSlot[] = []
  for (const row of raw) {
    if (row && typeof row === 'object' && typeof row.itemId === 'string' && typeof row.quantity === 'number') {
      if (row.quantity > 0) out.push({ itemId: row.itemId, quantity: row.quantity })
    }
  }
  return out
}

export function countItemInSession(slots: SessionInvSlot[], itemId: string): number {
  return slots.filter((s) => s.itemId === itemId).reduce((sum, s) => sum + s.quantity, 0)
}

export function removeFromSession(slots: SessionInvSlot[], itemId: string, qty: number): SessionInvSlot[] {
  let remaining = qty
  const next: SessionInvSlot[] = []
  for (const slot of slots) {
    if (slot.itemId !== itemId) {
      next.push(slot)
      continue
    }
    if (remaining <= 0) {
      next.push(slot)
      continue
    }
    if (slot.quantity <= remaining) {
      remaining -= slot.quantity
    } else {
      next.push({ itemId, quantity: slot.quantity - remaining })
      remaining = 0
    }
  }
  if (remaining > 0) throw new Error('Not enough items in session inventory')
  return next.filter((s) => s.quantity > 0)
}

export function addToSession(slots: SessionInvSlot[], itemId: string, qty: number): SessionInvSlot[] {
  const next = [...slots]
  const existing = next.find((s) => s.itemId === itemId)
  if (existing) {
    existing.quantity += qty
  } else {
    next.push({ itemId, quantity: qty })
  }
  return next
}
