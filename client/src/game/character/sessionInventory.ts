import { getItemDefinition } from './itemCatalog'

export type SessionInventorySlot = {
  itemId: string
  quantity: number
}

export function getStackMax(itemId: string): number {
  const def = getItemDefinition(itemId)
  return def?.stackMax ?? 1
}

export function canStackItem(itemId: string): boolean {
  return getStackMax(itemId) > 1
}

/** Merge stackable rows and split overflow past stackMax. */
export function normalizeSessionInventorySlots(slots: SessionInventorySlot[]): SessionInventorySlot[] {
  const merged = new Map<string, number>()
  const singles: SessionInventorySlot[] = []

  for (const slot of slots) {
    if (!slot.itemId || slot.quantity <= 0) continue
    if (!canStackItem(slot.itemId)) {
      for (let i = 0; i < slot.quantity; i++) {
        singles.push({ itemId: slot.itemId, quantity: 1 })
      }
      continue
    }
    merged.set(slot.itemId, (merged.get(slot.itemId) ?? 0) + slot.quantity)
  }

  const stacked: SessionInventorySlot[] = []
  for (const [itemId, total] of merged) {
    const max = getStackMax(itemId)
    let remaining = total
    while (remaining > 0) {
      const qty = Math.min(remaining, max)
      stacked.push({ itemId, quantity: qty })
      remaining -= qty
    }
  }

  return [...stacked, ...singles]
}

export function parseSessionInventory(raw: unknown): SessionInventorySlot[] {
  if (!Array.isArray(raw)) return []

  const slots: SessionInventorySlot[] = []
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.length > 0) {
      slots.push({ itemId: entry, quantity: 1 })
      continue
    }
    if (entry && typeof entry === 'object') {
      const obj = entry as { itemId?: unknown; quantity?: unknown }
      if (typeof obj.itemId === 'string' && obj.itemId.length > 0) {
        const qty = typeof obj.quantity === 'number' && obj.quantity > 0 ? Math.floor(obj.quantity) : 1
        slots.push({ itemId: obj.itemId, quantity: qty })
      }
    }
  }
  return normalizeSessionInventorySlots(slots)
}

export function addItemsToSessionInventory(
  slots: SessionInventorySlot[],
  itemIds: string[],
): SessionInventorySlot[] {
  let next = [...slots]
  for (const itemId of itemIds) {
    next = addOneItemToSessionInventory(next, itemId)
  }
  return next
}

function addOneItemToSessionInventory(slots: SessionInventorySlot[], itemId: string): SessionInventorySlot[] {
  const max = getStackMax(itemId)
  if (max <= 1) {
    return normalizeSessionInventorySlots([...slots, { itemId, quantity: 1 }])
  }

  const next = slots.map((s) => ({ ...s }))
  const idx = next.findIndex((s) => s.itemId === itemId && s.quantity < max)
  if (idx >= 0) {
    next[idx].quantity += 1
    return next
  }
  return normalizeSessionInventorySlots([...next, { itemId, quantity: 1 }])
}

export function removeFromSessionInventory(
  slots: SessionInventorySlot[],
  index: number,
  quantity = 1,
): SessionInventorySlot[] {
  if (index < 0 || index >= slots.length || quantity <= 0) return slots
  const next = slots.map((s) => ({ ...s }))
  const slot = next[index]
  if (slot.quantity <= quantity) {
    next.splice(index, 1)
  } else {
    slot.quantity -= quantity
  }
  return next
}

/** Remove quantity of itemId across stacked slots; returns null if not enough. */
export function removeItemFromSessionByItemId(
  slots: SessionInventorySlot[],
  itemId: string,
  quantity: number,
): SessionInventorySlot[] | null {
  if (quantity <= 0) return slots
  let remaining = quantity
  const next = slots.map((s) => ({ ...s }))
  for (let i = 0; i < next.length && remaining > 0; i++) {
    const slot = next[i]
    if (slot.itemId !== itemId) continue
    const take = Math.min(remaining, slot.quantity)
    slot.quantity -= take
    remaining -= take
    if (slot.quantity <= 0) {
      next.splice(i, 1)
      i -= 1
    }
  }
  if (remaining > 0) return null
  return normalizeSessionInventorySlots(next)
}
