import Phaser from 'phaser'

export type Facing = 'up' | 'down' | 'left' | 'right'

export type MoveWaypoint = { x: number; y: number }

export type MoveTarget = {
  x: number
  y: number
  active: boolean
  waypoints: MoveWaypoint[]
  waypointIndex: number
}

export function createMoveTarget(): MoveTarget {
  return { x: 0, y: 0, active: false, waypoints: [], waypointIndex: 0 }
}

export function setMoveTarget(target: MoveTarget, x: number, y: number, waypoints?: MoveWaypoint[]) {
  if (waypoints && waypoints.length > 0) {
    target.waypoints = waypoints
    target.waypointIndex = 0
    target.x = waypoints[0].x
    target.y = waypoints[0].y
  } else {
    target.waypoints = []
    target.waypointIndex = 0
    target.x = x
    target.y = y
  }
  target.active = true
}

export function clearMoveTarget(target: MoveTarget) {
  target.active = false
  target.waypoints = []
  target.waypointIndex = 0
}

function advanceWaypoint(target: MoveTarget): boolean {
  if (target.waypoints.length === 0) return false
  if (target.waypointIndex >= target.waypoints.length - 1) return false
  target.waypointIndex += 1
  const next = target.waypoints[target.waypointIndex]
  target.x = next.x
  target.y = next.y
  return true
}

export function updateClickMove(
  body: Phaser.Physics.Arcade.Body,
  posX: number,
  posY: number,
  target: MoveTarget,
  speed: number,
  threshold = 6,
): { moving: boolean; facing: Facing | null } {
  if (!target.active) {
    body.setVelocity(0, 0)
    return { moving: false, facing: null }
  }

  const dx = target.x - posX
  const dy = target.y - posY
  const dist = Math.hypot(dx, dy)
  if (dist <= threshold) {
    if (advanceWaypoint(target)) {
      const ndx = target.x - posX
      const ndy = target.y - posY
      const ndist = Math.hypot(ndx, ndy)
      if (ndist <= threshold) {
        body.setVelocity(0, 0)
        clearMoveTarget(target)
        return { moving: false, facing: null }
      }
      const vx = (ndx / ndist) * speed
      const vy = (ndy / ndist) * speed
      body.setVelocity(vx, vy)
      return { moving: true, facing: facingFromDelta(ndx, ndy) }
    }
    body.setVelocity(0, 0)
    clearMoveTarget(target)
    return { moving: false, facing: null }
  }

  const vx = (dx / dist) * speed
  const vy = (dy / dist) * speed
  body.setVelocity(vx, vy)
  return { moving: true, facing: facingFromDelta(dx, dy) }
}

function facingFromDelta(dx: number, dy: number): Facing {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  }
  return dy > 0 ? 'down' : 'up'
}
