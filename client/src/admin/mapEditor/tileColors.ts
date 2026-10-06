import { GID_GRASS_A, GID_GRASS_B, GID_PATH, GID_WALL } from '../../lib/tmj'

export function gidFillColor(gid: number): string {
  switch (gid) {
    case GID_WALL:
      return '#4b5563'
    case GID_GRASS_A:
      return '#22c55e'
    case GID_GRASS_B:
      return '#16a34a'
    case GID_PATH:
      return '#a8845c'
    default:
      return '#0f172a'
  }
}

export function collisionFillColor(blocked: boolean): string {
  return blocked ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 197, 94, 0.12)'
}
