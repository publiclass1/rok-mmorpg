export function parseLayerColor(value: string): number {
  const trimmed = value.trim()
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return Number.parseInt(trimmed.slice(2), 16)
  }
  if (trimmed.startsWith('#')) {
    return Number.parseInt(trimmed.slice(1), 16)
  }
  return Number.parseInt(trimmed, 16)
}
