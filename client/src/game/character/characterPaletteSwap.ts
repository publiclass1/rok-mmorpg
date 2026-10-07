import Phaser from 'phaser'
import {
  appearanceKey,
  resolveAppearanceColors,
  type CharacterAppearance,
} from './characterAppearance'
import { addSpriteSheetFrames } from './characterSpriteAssets'
import { PALETTE_SOURCE } from './characterSpriteAssets'
import {
  playerTextureKey,
  resolvePlayerSpriteDef,
  type CharacterSpriteDef,
} from './characterSpriteRegistry'

const COLOR_TOLERANCE = 48

function hexToRgb(hex: number) {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff }
}

function colorDistance(a: number, b: number): number {
  const c = hexToRgb(a)
  const d = hexToRgb(b)
  return Math.abs(c.r - d.r) + Math.abs(c.g - d.g) + Math.abs(c.b - d.b)
}

function replaceColor(pixel: number, alpha: number, replacements: Array<{ from: number; to: number }>): number {
  if (alpha < 10) return pixel
  const rgb = pixel & 0xffffff
  for (const { from, to } of replacements) {
    if (colorDistance(rgb, from) <= COLOR_TOLERANCE) {
      return (alpha << 24) | to
    }
  }
  return pixel
}

function buildReplacements(appearance: CharacterAppearance) {
  const colors = resolveAppearanceColors(appearance)
  return [
    { from: PALETTE_SOURCE.skin, to: colors.skin },
    { from: PALETTE_SOURCE.hair, to: colors.hair },
    { from: PALETTE_SOURCE.shirt, to: colors.shirt },
    { from: PALETTE_SOURCE.pants, to: colors.pants },
    { from: PALETTE_SOURCE.shoes, to: colors.shoes },
    { from: PALETTE_SOURCE.eyes, to: colors.eyes },
  ]
}

export function ensurePlayerSwappedTexture(
  scene: Phaser.Scene,
  appearance: CharacterAppearance,
): { textureKey: string; def: CharacterSpriteDef } {
  const def = resolvePlayerSpriteDef(appearance)
  const key = playerTextureKey(def, appearanceKey(appearance))
  if (scene.textures.exists(key)) {
    return { textureKey: key, def }
  }

  const master = scene.textures.get(def.masterTextureKey)
  const source = master.getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const w = source.width
  const h = source.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { textureKey: def.masterTextureKey, def }
  }
  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, h)
  const replacements = buildReplacements(appearance)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    const pixel = (a << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    const next = replaceColor(pixel, a, replacements)
    data[i] = (next >> 16) & 0xff
    data[i + 1] = (next >> 8) & 0xff
    data[i + 2] = next & 0xff
  }
  ctx.putImageData(imageData, 0, 0)
  scene.textures.addCanvas(key, canvas)
  addSpriteSheetFrames(scene, key, def)
  return { textureKey: key, def }
}
