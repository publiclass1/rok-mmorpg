export function shouldStandFromAutoSit(mp: number, mpMax: number): boolean {
  if (mpMax <= 0) return true
  return mp >= mpMax
}
