import { GID_GRASS_A, GID_GRASS_B, GID_PATH, GID_WALL } from '../../lib/tmj'

export function gidFillColor(gid: number): string {
  switch (gid) {
    case GID_WALL:
      return '#6b7280'
    case GID_GRASS_A:
      return '#2d8a3e'
    case GID_GRASS_B:
      return '#267a35'
    case GID_PATH:
      return '#9a7b4f'
    default:
      return '#1a5c28'
  }
}

export function collisionFillColor(blocked: boolean): string {
  return blocked ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 197, 94, 0.12)'
}
