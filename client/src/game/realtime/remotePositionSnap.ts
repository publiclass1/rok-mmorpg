export const REMOTE_SNAP_DISTANCE_PX = 96
export const REMOTE_POSITION_EPSILON_PX = 1

export function shouldSnapRemotePosition(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  snapDistance = REMOTE_SNAP_DISTANCE_PX,
): boolean {
  return Math.hypot(toX - fromX, toY - fromY) > snapDistance
}
