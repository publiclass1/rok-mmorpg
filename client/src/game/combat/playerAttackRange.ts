import type { WeaponClass } from '../../content/ro/types'
import type { EquipSlot } from '../character/characterState'
import { getItemWeaponClass } from '../character/itemCatalog'
import type { CharacterPose } from '../character/characterPose'

export const MAP_TILE_SIZE = 32

export const ATTACK_RANGE_CELLS_BY_CLASS: Record<WeaponClass, number> = {
  unarmed: 1,
  knife: 1,
  sword: 2,
  spear: 5,
  staff: 10,
  bow: 10,
}

export function usesTargetedAttack(weaponClass: WeaponClass): boolean {
  return weaponClass === 'spear' || weaponClass === 'staff' || weaponClass === 'bow'
}

export function getEquippedWeaponClass(equipment: Record<EquipSlot, string | null>): WeaponClass {
  const weaponId = equipment.weapon
  if (!weaponId) return 'unarmed'
  return getItemWeaponClass(weaponId) ?? 'unarmed'
}

export function getPlayerAttackRangeCells(equipment: Record<EquipSlot, string | null>): number {
  const weaponClass = getEquippedWeaponClass(equipment)
  return ATTACK_RANGE_CELLS_BY_CLASS[weaponClass]
}

export function getPlayerAttackRangePx(equipment: Record<EquipSlot, string | null>): number {
  return getPlayerAttackRangeCells(equipment) * MAP_TILE_SIZE
}

export type AttackTargetCandidate = {
  alive: boolean
  x: number
  y: number
}

export function isInFacingCone(
  facing: CharacterPose['facing'],
  dx: number,
  dy: number,
): boolean {
  const len = Math.hypot(dx, dy)
  if (len < 1) return true
  const nx = dx / len
  const ny = dy / len
  switch (facing) {
    case 'right':
      return nx > 0
    case 'left':
      return nx < 0
    case 'up':
      return ny < 0
    case 'down':
      return ny > 0
    default:
      return true
  }
}

export function distanceBetween(px: number, py: number, tx: number, ty: number): number {
  return Math.hypot(tx - px, ty - py)
}

export function findMobInAttackCone<T extends AttackTargetCandidate>(
  playerX: number,
  playerY: number,
  facing: CharacterPose['facing'],
  maxDist: number,
  mobs: T[],
): T | null {
  let best: T | null = null
  let bestDist = maxDist

  for (const mob of mobs) {
    if (!mob.alive) continue
    const dx = mob.x - playerX
    const dy = mob.y - playerY
    const dist = Math.hypot(dx, dy)
    if (dist > maxDist) continue
    if (!isInFacingCone(facing, dx, dy)) continue
    if (dist < bestDist) {
      bestDist = dist
      best = mob
    }
  }
  return best
}

function mobInRange<T extends AttackTargetCandidate>(
  mob: T | null | undefined,
  playerX: number,
  playerY: number,
  maxDist: number,
): T | null {
  if (!mob?.alive) return null
  if (distanceBetween(playerX, playerY, mob.x, mob.y) > maxDist) return null
  return mob
}

export function resolvePlayerAttackTarget<T extends AttackTargetCandidate>(ctx: {
  playerX: number
  playerY: number
  facing: CharacterPose['facing']
  rangePx: number
  weaponClass: WeaponClass
  mobs: T[]
  chaseMob: T | null | undefined
  selectedMob: T | null | undefined
}): T | null {
  const { playerX, playerY, facing, rangePx, weaponClass, mobs, chaseMob, selectedMob } = ctx

  if (usesTargetedAttack(weaponClass)) {
    const fromChase = mobInRange(chaseMob, playerX, playerY, rangePx)
    if (fromChase) return fromChase
    const fromSelected = mobInRange(selectedMob, playerX, playerY, rangePx)
    if (fromSelected) return fromSelected
    return null
  }

  return findMobInAttackCone(playerX, playerY, facing, rangePx, mobs)
}
