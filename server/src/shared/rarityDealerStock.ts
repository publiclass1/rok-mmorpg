const RARITY_ARMOR_DEALER_IDS = new Set([
  'padded_vest',
  'scout_mail',
  'knight_plate',
  'violet_cuirass',
  'dragon_scale_mail',
  'skyweave_robe',
  'relic_guardplate',
])

export function isRarityDealerBaseItem(itemId: string): boolean {
  if (RARITY_ARMOR_DEALER_IDS.has(itemId)) return true
  return itemId.startsWith('rarity_cos_')
}
