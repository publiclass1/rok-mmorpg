import Phaser from 'phaser'
import type { RoMobSkill } from '../../content/ro/types'
import { SKILLS } from '../character/skillsConfig'
import type { MobDefinition } from './mobConfig'
import type { MobInstance, MobState } from './mobTypes'

export type MobAiCallbacks = {
  onMobHitPlayer: (mob: MobInstance) => void
  onMobUseSkill: (mob: MobInstance, skillId: string, level: number) => void
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay)
}

function deaggroDistance(def: MobDefinition): number {
  return Math.max(def.aggroRange * 1.25, def.roamRadius * 2)
}

function spawnLeashDistance(def: MobDefinition): number {
  return def.roamRadius * 2.5
}

/** Exported for tests — whether mob exceeded spot leash / lure range. */
export function mobBrokeSpotLeash(mob: MobInstance, def: MobDefinition): boolean {
  if (mob.spotRect) {
    if (!mob.canLure) {
      const r = mob.spotRect
      const px = mob.sprite.x
      const py = mob.sprite.y
      return px < r.x || px > r.x + r.width || py < r.y || py > r.y + r.height
    }
    const dSpot = dist(mob.sprite.x, mob.sprite.y, mob.spotCenterX, mob.spotCenterY)
    return dSpot > mob.lureRadius
  }
  const dSpawn = dist(mob.sprite.x, mob.sprite.y, mob.spawnX, mob.spawnY)
  return dSpawn > spawnLeashDistance(def)
}

export function provokeMob(mob: MobInstance) {
  mob.provokedByPlayer = true
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

function pickMobSkill(
  mob: MobInstance,
  def: MobDefinition,
  dPlayer: number,
  now: number,
): RoMobSkill | null {
  const ready: RoMobSkill[] = []
  for (const entry of def.skills) {
    const skillDef = SKILLS[entry.skillId]
    if (!skillDef || skillDef.type !== 'active' || skillDef.target !== 'enemy') continue
    const range = skillDef.range > 0 ? skillDef.range : def.attackRange
    if (dPlayer > range) continue
    const until = mob.skillCooldownUntil[entry.skillId] ?? 0
    if (now < until) continue
    if (entry.chance != null && Math.random() > entry.chance) continue
    ready.push(entry)
  }
  if (ready.length === 0) return null
  return ready[Math.floor(Math.random() * ready.length)]
}

function clearProvoke(mob: MobInstance) {
  mob.provokedByPlayer = false
  mob.roamTargetX = mob.spawnX
  mob.roamTargetY = mob.spawnY
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
  const deaggroRange = deaggroDistance(def)
  const brokeLeash = mobBrokeSpotLeash(mob, def)
  const inCombatRange = mob.provokedByPlayer || dPlayer <= def.aggroRange

  let state: MobState = mob.state

  if (!playerAlive) {
    state = 'wander'
    mob.provokedByPlayer = false
  } else if (mob.provokedByPlayer && (dPlayer > deaggroRange || brokeLeash)) {
    state = 'wander'
    clearProvoke(mob)
  } else if (dPlayer <= def.attackRange) {
    state = 'attack'
  } else if (inCombatRange) {
    state = 'chase'
  } else if (state !== 'wander' && dPlayer > deaggroRange) {
    state = 'wander'
    mob.roamTargetX = mob.spawnX
    mob.roamTargetY = mob.spawnY
    mob.provokedByPlayer = false
  } else if (state === 'wander' && !inCombatRange) {
    state = 'wander'
  }

  mob.state = state

  if (state === 'attack') {
    mob.sprite.setVelocity(0, 0)
    if (now - mob.lastAttackAt >= def.attackCooldownMs) {
      mob.lastAttackAt = now
      const skill = pickMobSkill(mob, def, dPlayer, now)
      if (skill) {
        const cooldownMs = skill.cooldownMs ?? def.attackCooldownMs
        mob.skillCooldownUntil[skill.skillId] = now + cooldownMs
        callbacks.onMobUseSkill(mob, skill.skillId, skill.level)
      } else {
        callbacks.onMobHitPlayer(mob)
      }
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
  mob.provokedByPlayer = false
  mob.skillCooldownUntil = {}
  mob.roamTargetX = mob.spawnX
  mob.roamTargetY = mob.spawnY
  pickRoamTarget(mob, def)
}
