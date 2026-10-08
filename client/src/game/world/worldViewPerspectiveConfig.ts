export const WORLD_Y_SCALE_MIN = 0.55
export const WORLD_Y_SCALE_MAX = 1
export const WORLD_Y_SCALE_DEFAULT = 1

const STORAGE_KEY = 'worldView:yScale:v1'

export function clampWorldYScale(value: number): number {
  if (!Number.isFinite(value)) return WORLD_Y_SCALE_DEFAULT
  return Math.min(WORLD_Y_SCALE_MAX, Math.max(WORLD_Y_SCALE_MIN, value))
}

export function loadWorldYScale(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw === '') return WORLD_Y_SCALE_DEFAULT
    return clampWorldYScale(Number(raw))
  } catch {
    return WORLD_Y_SCALE_DEFAULT
  }
}

export function saveWorldYScale(value: number): number {
  const clamped = clampWorldYScale(value)
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped))
  } catch {
    /* ignore quota / private mode */
  }
  return clamped
}
