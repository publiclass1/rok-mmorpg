import { GID_GRASS_A, GID_GRASS_B, GID_PATH, GID_WALL } from '../../lib/tmj'

export function gidFillColor(gid: number): string {
  switch (gid) {
    case GID_WALL:
      return '#6b7280'
    case GID_GRASS_A:
      return '#3d9e4f'
    case GID_GRASS_B:
      return '#38a052'
    case GID_PATH:
      return '#a88458'
    default:
      return '#2d7a42'
  }
}

export function collisionFillColor(blocked: boolean): string {
  return blocked ? 'rgba(239, 68, 68, 0.45)' : 'rgba(34, 197, 94, 0.12)'
}
