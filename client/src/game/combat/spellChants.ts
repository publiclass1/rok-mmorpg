import type { SkillDefinition } from '../character/skillsConfig'

export const DEFAULT_SPELL_CHANT = 'Γενέσθω δύναμις'

const ELEMENT_CHANTS: Record<string, string> = {
  fire: 'πῦρ ἀνάπτω',
  water: 'κρύος καταβάλλω',
  wind: 'ἄνεμος πνέω',
  earth: 'γῆ σείω',
  ghost: 'ψυχὴ πλήττω',
  neutral: 'δύναμις γενέσθω',
  poison: 'ἰὸς ῥέω',
  holy: 'φῶς λάμπω',
  dark: 'σκότος καλύπτω',
}

/** Per-skill incantation (Greek). */
export const SPELL_CHANTS: Record<string, string> = {
  fire_bolt: 'πῦρ ἐκπορεύου',
  cold_bolt: 'κρύος πέμπω',
  lightning_bolt: 'κεραυνὸς πίπτω',
  napalm_beat: 'πνεῦμα πλήττω',
  soul_strike: 'ψυχὴ ἐξέρχου',
  fire_ball: 'σφαῖρα πυρὸς',
  frost_diver: 'πάγος καταδύω',
  stone_curse: 'λίθος γίνου',
  energy_coat: 'δύναμις περιβάλλω',
  safety_wall: 'τεῖχος ἵστημι',
  sight: 'ὁρῶ τὸ κρυφόν',
  meteor_storm: 'ἀστέρες πίπτουσι',
  jupitel_thunder: 'κεραυνὸς κυκλῶ',
  lord_of_vermilion: 'οὐρανὸς φλέγω',
  water_ball: 'ὕδωρ κυκλῶ',
  ice_wall: 'πάγος ἵστημι',
  frost_nova: 'κρύος ἐκρήγνυται',
  storm_gust: 'χιὼν καταφέρω',
  earth_spike: 'γῆ ἀνίστημι',
  heavens_drive: 'γῆ σαλεύω',
  quagmire: 'βόρβορος γίνου',
  sense: 'αἴσθησιν δίδωμι',
  dispell: 'λύω τὰς δυνάμεις',
  magic_rod: 'ῥάβδος φωτίζω',
}

export function resolveSpellChant(skillId: string, def: SkillDefinition): string {
  const direct = SPELL_CHANTS[skillId]
  if (direct) return direct
  const element = def.magic?.element
  if (element && ELEMENT_CHANTS[element]) return ELEMENT_CHANTS[element]
  return DEFAULT_SPELL_CHANT
}

export function spellChantVisibleLength(fullText: string, progress01: number): number {
  const p = Math.max(0, Math.min(1, progress01))
  if (fullText.length === 0) return 0
  return Math.min(fullText.length, Math.ceil(fullText.length * p))
}

export function shouldShowSpellChant(strikeDelayMs: number): boolean {
  return strikeDelayMs >= 80
}

/** Short Greek tokens for random cast incantations. */
export const RANDOM_CHANT_WORDS = [
  'πῦρ',
  'ὕδωρ',
  'ἄνεμος',
  'γῆ',
  'φῶς',
  'σκότος',
  'δύναμις',
  'ψυχή',
  'κρύος',
  'κεραυνός',
  'ἀστήρ',
  'πνεῦμα',
  'μῦθος',
  'λόγος',
  'φωνή',
  'αἰών',
  'χάος',
  'νόος',
  'θεός',
  'μάγος',
  'ῥέω',
  'πέμπω',
  'γίνου',
  'ἄνοιξις',
  'κλείω',
  'σφαῖρα',
  'κύκλος',
  'ἱερόν',
]

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function clampWordCount(strikeDelayMs: number): number {
  const n = Math.round(strikeDelayMs / 350)
  return Math.max(2, Math.min(6, n))
}

/** Deterministic random Greek phrase for one cast (typewriter duration = strike delay). */
export function buildRandomCastChant(strikeDelayMs: number, seed = 1): string {
  const count = clampWordCount(strikeDelayMs)
  const rand = mulberry32(seed)
  const pool = RANDOM_CHANT_WORDS
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length)
    words.push(pool[idx]!)
  }
  return words.join(' ')
}
