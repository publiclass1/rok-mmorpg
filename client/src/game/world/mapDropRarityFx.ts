import Phaser from 'phaser'
import { getItemRarity, rarityColor, rarityTier } from '../items/itemRarity'

export type MapDropRarityFx = {
  container: Phaser.GameObjects.Container
  pulseTween?: Phaser.Tweens.Tween
}

function cssColorToPhaser(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

function glowIntensity(tier: number): { strokeAlpha: number; fillAlpha: number; scale: number } {
  const base = 0.35 + tier * 0.04
  return {
    strokeAlpha: Math.min(0.95, base + 0.25),
    fillAlpha: Math.min(0.35, base * 0.35),
    scale: 1 + tier * 0.03,
  }
}

export function createMapDropRarityFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  itemId: string,
  depth: number,
): MapDropRarityFx | null {
  const rarity = getItemRarity(itemId)
  if (!rarity) return null

  const color = cssColorToPhaser(rarityColor(rarity))
  const tier = rarityTier(rarity)
  const { strokeAlpha, fillAlpha, scale } = glowIntensity(tier)

  const container = scene.add.container(x, y)
  container.setDepth(depth)

  const beamH = 36 + tier * 14
  const beamW = 6 + tier * 2
  const beam = scene.add.graphics()
  beam.fillGradientStyle(color, color, color, color, 0.55, 0.55, 0, 0)
  beam.fillRect(-beamW / 2, -beamH, beamW, beamH)
  container.add(beam)

  const aura = scene.add.ellipse(0, 2, 22 + tier * 2, 10 + tier, color, fillAlpha)
  aura.setStrokeStyle(2, color, strokeAlpha)
  aura.setScale(scale)
  container.add(aura)

  const pulseMin = Math.max(0.15, fillAlpha * 0.65)
  const pulseMax = Math.min(0.5, fillAlpha * 1.35)
  const pulseTween = scene.tweens.add({
    targets: aura,
    alpha: { from: pulseMin, to: pulseMax },
    duration: 900 + tier * 80,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  return { container, pulseTween }
}

export function destroyMapDropRarityFx(fx: MapDropRarityFx | undefined) {
  if (!fx) return
  fx.pulseTween?.stop()
  fx.container.destroy(true)
}
