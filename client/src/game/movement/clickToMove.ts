import Phaser from 'phaser'

export type Facing = 'up' | 'down' | 'left' | 'right'

export type MoveTarget = { x: number; y: number; active: boolean }

export function createMoveTarget(): MoveTarget {
  return { x: 0, y: 0, active: false }
}

export function setMoveTarget(target: MoveTarget, x: number, y: number) {
  target.x = x
  target.y = y
  target.active = true
}

export function clearMoveTarget(target: MoveTarget) {
  target.active = false
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
    body.setVelocity(0, 0)
    target.active = false
    return { moving: false, facing: null }
  }

  const vx = (dx / dist) * speed
  const vy = (dy / dist) * speed
  body.setVelocity(vx, vy)

  let facing: Facing = 'down'
  if (Math.abs(dx) > Math.abs(dy)) {
    facing = dx > 0 ? 'right' : 'left'
  } else {
    facing = dy > 0 ? 'down' : 'up'
  }
  return { moving: true, facing }
}
