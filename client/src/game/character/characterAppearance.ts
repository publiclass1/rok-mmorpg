import type { CharacterRow } from '../../types/database'

export type CharacterGender = 'male' | 'female'

export type CharacterAppearance = {
  gender: CharacterGender
  bodyColor: number
  hairColor: number
  eyeColor: number
  clothesColor: number
}

export const APPEARANCE_COLOR_COUNT = 9

export const BODY_COLOR_PALETTE = [
  0xfce4c4,
  0xf5d0a8,
  0xfcd34d,
  0xe8b88a,
  0xd4a574,
  0xc68642,
  0x8d5524,
  0x6b4423,
  0xffdbac,
] as const

export const HAIR_COLOR_PALETTE = [
  0x1a1a1a,
  0x422006,
  0x4a3728,
  0x8b4513,
  0xd4a017,
  0xc0c0c0,
  0xdc2626,
  0x2563eb,
  0x16a34a,
] as const

export const EYE_COLOR_PALETTE = [
  0x111827,
  0x1e3a5f,
  0x2563eb,
  0x15803d,
  0x7c3aed,
  0x6b7280,
  0x92400e,
  0xbe123c,
  0x0891b2,
] as const

export const CLOTHES_COLOR_PALETTE = [
  0x1d4ed8,
  0xdc2626,
  0x16a34a,
  0x9333ea,
  0xea580c,
  0xf3f4f6,
  0x374151,
  0xfbbf24,
  0xec4899,
] as const

export const DEFAULT_CHARACTER_APPEARANCE: CharacterAppearance = {
  gender: 'male',
  bodyColor: 2,
  hairColor: 1,
  eyeColor: 0,
  clothesColor: 0,
}

function clampIndex(index: number): number {
  if (!Number.isFinite(index)) return 0
  return Math.min(APPEARANCE_COLOR_COUNT - 1, Math.max(0, Math.floor(index)))
}

export function paletteColor(palette: readonly number[], index: number): number {
  return palette[clampIndex(index)]
}

function darken(hex: number, factor: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor)
  const g = Math.floor(((hex >> 8) & 0xff) * factor)
  const b = Math.floor((hex & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

export type ResolvedAppearanceColors = {
  skin: number
  hair: number
  eyes: number
  shirt: number
  pants: number
  shoes: number
}

export function resolveAppearanceColors(appearance: CharacterAppearance): ResolvedAppearanceColors {
  const shirt = paletteColor(CLOTHES_COLOR_PALETTE, appearance.clothesColor)
  return {
    skin: paletteColor(BODY_COLOR_PALETTE, appearance.bodyColor),
    hair: paletteColor(HAIR_COLOR_PALETTE, appearance.hairColor),
    eyes: paletteColor(EYE_COLOR_PALETTE, appearance.eyeColor),
    shirt,
    pants: darken(shirt, 0.55),
    shoes: 0x111827,
  }
}

export function appearanceFromCharacterRow(row: CharacterRow): CharacterAppearance {
  return {
    gender: row.gender === 'female' ? 'female' : 'male',
    bodyColor: clampIndex(row.body_color ?? DEFAULT_CHARACTER_APPEARANCE.bodyColor),
    hairColor: clampIndex(row.hair_color ?? DEFAULT_CHARACTER_APPEARANCE.hairColor),
    eyeColor: clampIndex(row.eye_color ?? DEFAULT_CHARACTER_APPEARANCE.eyeColor),
    clothesColor: clampIndex(row.clothes_color ?? DEFAULT_CHARACTER_APPEARANCE.clothesColor),
  }
}

export function appearanceKey(appearance: CharacterAppearance): string {
  return `${appearance.gender}|${appearance.bodyColor}|${appearance.hairColor}|${appearance.eyeColor}|${appearance.clothesColor}`
}

export function appearanceToRowFields(appearance: CharacterAppearance): {
  gender: CharacterGender
  body_color: number
  hair_color: number
  eye_color: number
  clothes_color: number
} {
  return {
    gender: appearance.gender,
    body_color: clampIndex(appearance.bodyColor),
    hair_color: clampIndex(appearance.hairColor),
    eye_color: clampIndex(appearance.eyeColor),
    clothes_color: clampIndex(appearance.clothesColor),
  }
}

export function colorToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}
