import Phaser from 'phaser'
import type { MobDefinition } from './mobConfig'
import type { MobInstance, MobState } from './mobTypes'

export type MobAiCallbacks = {
  onMobHitPlayer: (mob: MobInstance) => void
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay)
}

function pickRoamTarget(mob: MobInstance, def: MobDefinition) {
  const angle = Math.random() * Math.PI * 2
  const r = Math.random() * def.roamRadius
  mob.roamTargetX = mob.spawnX + Math.cos(angle) * r
  mob.roamTargetY = mob.spawnY + Math.sin(angle) * r
  mob.lastWanderAt = performance.now()
}

function moveToward(
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  tx: number,
  ty: number,
  speed: number,
) {
  const dx = tx - sprite.x
  const dy = ty - sprite.y
  const len = Math.hypot(dx, dy)
  if (len < 4) {
    sprite.setVelocity(0, 0)
    return
  }
  sprite.setVelocity((dx / len) * speed, (dy / len) * speed)
}

export function updateMob(
  mob: MobInstance,
  def: MobDefinition,
  playerX: number,
  playerY: number,
  playerAlive: boolean,
  now: number,
  callbacks: MobAiCallbacks,
) {
  if (!mob.alive) return

  const dPlayer = dist(mob.sprite.x, mob.sprite.y, playerX, playerY)
  const deaggroRange = def.aggroRange * 1.25

  let state: MobState = mob.state

  if (!playerAlive) {
    state = 'wander'
  } else if (dPlayer <= def.attackRange) {
    state = 'attack'
  } else if (dPlayer <= def.aggroRange) {
    state = 'chase'
  } else if (state !== 'wander' && dPlayer > deaggroRange) {
    state = 'wander'
    mob.roamTargetX = mob.spawnX
    mob.roamTargetY = mob.spawnY
  } else if (state === 'wander' && dPlayer > def.aggroRange) {
    state = 'wander'
  }

  mob.state = state

  if (state === 'attack') {
    mob.sprite.setVelocity(0, 0)
    if (now - mob.lastAttackAt >= def.attackCooldownMs) {
      mob.lastAttackAt = now
      callbacks.onMobHitPlayer(mob)
    }
    return
  }

  if (state === 'chase') {
    moveToward(mob.sprite, playerX, playerY, def.moveSpeed)
    return
  }

  // wander
  const dTarget = dist(mob.sprite.x, mob.sprite.y, mob.roamTargetX, mob.roamTargetY)
  if (dTarget < 8 || now - mob.lastWanderAt > def.wanderPauseMs) {
    if (dTarget < 8) {
      mob.sprite.setVelocity(0, 0)
    }
    if (now - mob.lastWanderAt >= def.wanderPauseMs) {
      pickRoamTarget(mob, def)
    }
  }
  moveToward(mob.sprite, mob.roamTargetX, mob.roamTargetY, def.moveSpeed * 0.65)
}

export function initMobAiFields(mob: MobInstance, def: MobDefinition) {
  mob.state = 'wander'
  mob.lastAttackAt = 0
  mob.lastWanderAt = 0
  mob.roamTargetX = mob.spawnX
  mob.roamTargetY = mob.spawnY
  pickRoamTarget(mob, def)
}
