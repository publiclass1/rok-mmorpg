import type { RolledItem } from './rolledItem'

let registry: Record<string, RolledItem> = {}

export function setRolledItemRegistry(rolledItems: Record<string, RolledItem>) {
  registry = rolledItems
}

export function getRolledItem(itemId: string): RolledItem | null {
  return registry[itemId] ?? null
}

export function registerRolledItem(rolled: RolledItem) {
  registry = { ...registry, [rolled.id]: rolled }
}
