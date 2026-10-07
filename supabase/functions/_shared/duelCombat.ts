export type DuelSnapshot = {
  baseLevel: number
  jobId: string
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
  equipment: Record<string, string | null>
}

function calcHit(attackerLevel: number, dex: number, luk: number): number {
  return attackerLevel + dex + Math.floor(luk / 3)
}

function calcFlee(defenderLevel: number, agi: number, luk: number): number {
  return defenderLevel + agi + Math.floor(luk / 5)
}

function rollHitSuccess(attackerHit: number, defenderFlee: number, rng: () => number): boolean {
  const chance = Math.min(95, Math.max(5, 80 + attackerHit - defenderFlee))
  return rng() * 100 < chance
}

function calcStatusAtk(level: number, str: number, dex: number, luk: number): number {
  return Math.floor(level / 4 + str + Math.floor(dex / 5) + Math.floor(luk / 3))
}

function softDef(vit: number): number {
  return Math.floor(vit / 2)
}

function damageAfterDef(atk: number, def: number, vit: number): number {
  const hard = vit
  const soft = softDef(vit)
  const damage = atk - def - hard
  if (damage <= 0) return 1
  return Math.max(1, damage - soft)
}

export function calcDuelStrike(
  attacker: DuelSnapshot,
  defender: DuelSnapshot,
  rng: () => number,
  skillId?: string,
  skillLevel?: number,
): { damage: number; hit: boolean; critical: boolean } {
  const hitStat = calcHit(attacker.baseLevel, attacker.dex, attacker.luk)
  const flee = calcFlee(defender.baseLevel, defender.agi, defender.luk)
  const critRoll = rng() * 100 < Math.max(0, Math.floor(attacker.luk / 3))
  let hit = critRoll
  if (!hit) hit = rollHitSuccess(hitStat, flee, rng)
  if (!hit) return { damage: 0, hit: false, critical: false }

  const atk = calcStatusAtk(attacker.baseLevel, attacker.str, attacker.dex, attacker.luk) + 10
  const def = critRoll ? 0 : softDef(defender.vit)
  let damage = damageAfterDef(atk, def, defender.vit)
  if (critRoll) damage = Math.floor(damage * 1.4)
  if (skillId && skillLevel != null) {
    if (skillId === 'bash') {
      damage = Math.max(1, Math.floor(damage * (1 + skillLevel * 0.15)) + skillLevel * 3)
    }
  }
  return { damage: Math.max(1, damage), hit: true, critical: critRoll }
}

export function derivedMaxHp(jobId: string, baseLevel: number, vit: number): number {
  const noviceBase = 40 + baseLevel * 5
  const base = jobId === 'novice' ? noviceBase : noviceBase + 20
  return base + vit * 5
}
