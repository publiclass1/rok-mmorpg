export type ShopCart = Record<string, number>

export function cartEntries(cart: ShopCart): Array<{ itemId: string; quantity: number }> {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, quantity]) => ({ itemId, quantity }))
}

export function cartTotal(cart: ShopCart, priceByItemId: Record<string, number>): number {
  let total = 0
  for (const [itemId, qty] of Object.entries(cart)) {
    if (qty <= 0) continue
    total += qty * (priceByItemId[itemId] ?? 0)
  }
  return total
}

export function addToCart(cart: ShopCart, itemId: string, maxQty?: number): ShopCart {
  const current = cart[itemId] ?? 0
  const nextQty = current + 1
  if (maxQty !== undefined && nextQty > maxQty) return cart
  return { ...cart, [itemId]: nextQty }
}

export function removeFromCart(cart: ShopCart, itemId: string): ShopCart {
  const current = cart[itemId] ?? 0
  if (current <= 1) {
    const next = { ...cart }
    delete next[itemId]
    return next
  }
  return { ...cart, [itemId]: current - 1 }
}

export function clearCart(): ShopCart {
  return {}
}

export function pricesFromStock(stock: Array<{ itemId: string; price: number }>): Record<string, number> {
  return Object.fromEntries(stock.map((s) => [s.itemId, s.price]))
}
