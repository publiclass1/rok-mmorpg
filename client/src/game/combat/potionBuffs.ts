import type { RoConsumableBuff } from '../../content/ro/types'
import { getConsumableEffect, getItemDisplayName } from '../character/itemCatalog'
import type { PlayerStatusBuff } from '../character/statusEffects'
import {
  type CombatAffixKind,
  type EquippedCombatAffixTotals,
  emptyCombatAffixTotals,
} from '../items/rollGearAffixes'

export const POTION_BUFF_DURATION_MS = 300_000

const BUFF_AFFIX_KINDS: CombatAffixKind[] = ['aspd', 'atk', 'matk', 'def', 'mdef']

function affixFromRoBuff(buff: RoConsumableBuff): Partial<EquippedCombatAffixTotals> {
  const out: Partial<EquippedCombatAffixTotals> = {}
  for (const kind of BUFF_AFFIX_KINDS) {
    const v = buff[kind]
    if (v != null && v > 0) out[kind] = v
  }
  return out
}

export function consumablePotionAffixBonus(itemId: string): Partial<EquippedCombatAffixTotals> | null {
  const effect = getConsumableEffect(itemId)
  const buff = effect?.buff
  if (!buff) return null
  const partial = affixFromRoBuff(buff)
  return Object.keys(partial).length > 0 ? partial : null
}

export function isBuffPotionItem(itemId: string): boolean {
  return consumablePotionAffixBonus(itemId) != null
}

export function applyPotionBuff(
  buffs: PlayerStatusBuff[],
  itemId: string,
  now: number,
): { ok: true; buffs: PlayerStatusBuff[] } | { ok: false; reason: string } {
  const affixBonus = consumablePotionAffixBonus(itemId)
  if (!affixBonus) return { ok: false, reason: 'Not a buff potion.' }
  const effect = getConsumableEffect(itemId)
  const durationMs = effect?.buff?.durationMs ?? POTION_BUFF_DURATION_MS
  const next: PlayerStatusBuff = {
    statusId: `potion_${itemId}_${now}`,
    name: getItemDisplayName(itemId),
    iconSkillId: itemId,
    iconItemId: itemId,
    skillLevel: 1,
    startedAt: now,
    expiresAt: now + durationMs,
    affixBonus,
  }
  return { ok: true, buffs: [...buffs, next] }
}

export function sumPotionBuffAffixes(buffs: PlayerStatusBuff[]): EquippedCombatAffixTotals {
  const totals = emptyCombatAffixTotals()
  for (const buff of buffs) {
    const bonus = buff.affixBonus
    if (!bonus) continue
    for (const kind of BUFF_AFFIX_KINDS) {
      const v = bonus[kind]
      if (v != null && v > 0) totals[kind] += v
    }
  }
  return totals
}

export function mergeCombatAffixTotals(
  gear: EquippedCombatAffixTotals,
  extra: EquippedCombatAffixTotals,
): EquippedCombatAffixTotals {
  const merged = emptyCombatAffixTotals()
  for (const kind of Object.keys(merged) as CombatAffixKind[]) {
    merged[kind] = gear[kind] + extra[kind]
  }
  return merged
}
