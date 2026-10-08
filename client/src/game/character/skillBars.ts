export const SKILL_BAR_ROW_COUNT = 4
export const SKILL_BAR_SLOTS_PER_ROW = 9

export const SKILL_BAR_ROW_KEYS: readonly (readonly string[])[] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
]

const KEY_TO_BAR_SLOT = new Map<string, { bar: number; slot: number }>()
for (let bar = 0; bar < SKILL_BAR_ROW_COUNT; bar++) {
  const keys = SKILL_BAR_ROW_KEYS[bar]
  for (let slot = 0; slot < keys.length; slot++) {
    KEY_TO_BAR_SLOT.set(keys[slot], { bar, slot })
  }
}

export function skillBarSlotFromKey(key: string): { bar: number; slot: number } | null {
  if (key.length !== 1) return null
  const normalized = key === ',' || key === '.' ? key : key.toLowerCase()
  return KEY_TO_BAR_SLOT.get(normalized) ?? null
}

function emptyRow(): (string | null)[] {
  return Array.from({ length: SKILL_BAR_SLOTS_PER_ROW }, () => null)
}

function normalizeRow(raw: unknown): (string | null)[] {
  if (!Array.isArray(raw)) return emptyRow()
  const row = emptyRow()
  for (let i = 0; i < SKILL_BAR_SLOTS_PER_ROW; i++) {
    const v = raw[i]
    row[i] = typeof v === 'string' ? v : null
  }
  return row
}

export function createEmptySkillBars(): (string | null)[][] {
  const row0 = emptyRow()
  row0[0] = 'basic_attack'
  row0[1] = 'sit'
  return [row0, emptyRow(), emptyRow(), emptyRow()]
}

export function parseSkillBars(raw: unknown): (string | null)[][] {
  const fallback = createEmptySkillBars()
  if (!Array.isArray(raw)) return fallback.map((row) => [...row])

  if (raw.length === SKILL_BAR_SLOTS_PER_ROW && !Array.isArray(raw[0])) {
    return [normalizeRow(raw), emptyRow(), emptyRow(), emptyRow()]
  }

  if (raw.length === SKILL_BAR_ROW_COUNT * SKILL_BAR_SLOTS_PER_ROW && !Array.isArray(raw[0])) {
    const flat = raw.map((v) => (typeof v === 'string' ? v : null))
    const bars: (string | null)[][] = []
    for (let bar = 0; bar < SKILL_BAR_ROW_COUNT; bar++) {
      bars.push(flat.slice(bar * SKILL_BAR_SLOTS_PER_ROW, (bar + 1) * SKILL_BAR_SLOTS_PER_ROW))
    }
    return bars
  }

  if (raw.length === SKILL_BAR_ROW_COUNT && Array.isArray(raw[0])) {
    const bars: (string | null)[][] = []
    for (let bar = 0; bar < SKILL_BAR_ROW_COUNT; bar++) {
      bars.push(normalizeRow(raw[bar]))
    }
    return bars
  }

  return fallback.map((row) => [...row])
}

export function serializeSkillBars(bars: (string | null)[][]): (string | null)[][] {
  const parsed = parseSkillBars(bars)
  return parsed.map((row) => [...row])
}

export function isValidSkillBarPayload(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false
  if (raw.length === SKILL_BAR_SLOTS_PER_ROW && !Array.isArray(raw[0])) {
    return raw.every((v) => v === null || typeof v === 'string')
  }
  if (raw.length === SKILL_BAR_ROW_COUNT * SKILL_BAR_SLOTS_PER_ROW && !Array.isArray(raw[0])) {
    return raw.every((v) => v === null || typeof v === 'string')
  }
  if (raw.length !== SKILL_BAR_ROW_COUNT || !Array.isArray(raw[0])) return false
  return raw.every(
    (row) =>
      Array.isArray(row) &&
      row.length === SKILL_BAR_SLOTS_PER_ROW &&
      row.every((v) => v === null || typeof v === 'string'),
  )
}

export function skillBarsEqual(a: (string | null)[][], b: (string | null)[][]): boolean {
  const pa = parseSkillBars(a)
  const pb = parseSkillBars(b)
  for (let bar = 0; bar < SKILL_BAR_ROW_COUNT; bar++) {
    for (let slot = 0; slot < SKILL_BAR_SLOTS_PER_ROW; slot++) {
      if (pa[bar][slot] !== pb[bar][slot]) return false
    }
  }
  return true
}

export function isSkillBarIndexInRange(bar: number, slot: number): boolean {
  return bar >= 0 && bar < SKILL_BAR_ROW_COUNT && slot >= 0 && slot < SKILL_BAR_SLOTS_PER_ROW
}
