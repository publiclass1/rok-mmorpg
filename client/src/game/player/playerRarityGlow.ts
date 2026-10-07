import Phaser from 'phaser'
import type { EquipSlot } from '../character/characterState'
import { highestEquippedRarity, rarityColor, rarityTier } from '../items/itemRarity'

export type RarityGlowHost = {
  container: Phaser.GameObjects.Container
  bodyRig: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  rarityGlow?: Phaser.GameObjects.Ellipse
  rarityGlowTween?: Phaser.Tweens.Tween
}

function cssColorToPhaser(hex: string): number {
  const s = hex.replace('#', '')
  return parseInt(s, 16)
}

function glowIntensity(tier: number): { strokeAlpha: number; fillAlpha: number; scale: number } {
  const base = 0.35 + tier * 0.04
  return {
    strokeAlpha: Math.min(0.95, base + 0.25),
    fillAlpha: Math.min(0.35, base * 0.35),
    scale: 1 + tier * 0.03,
  }
}

export function syncPlayerRarityGlow(
  display: RarityGlowHost,
  equipment: Record<EquipSlot, string | null>,
) {
  const scene = display.container.scene ?? display.body.scene
  if (!scene) return
  const rarity = highestEquippedRarity(equipment)

  if (!rarity) {
    if (display.rarityGlowTween) {
      display.rarityGlowTween.stop()
      display.rarityGlowTween = undefined
    }
    if (display.rarityGlow) {
      display.rarityGlow.setVisible(false)
    }
    return
  }

  const color = cssColorToPhaser(rarityColor(rarity))
  const tier = rarityTier(rarity)
  const { strokeAlpha, fillAlpha, scale } = glowIntensity(tier)

  if (!display.rarityGlow) {
    const glow = scene.add.ellipse(0, -14, 26, 20, color, fillAlpha)
    glow.setStrokeStyle(2, color, strokeAlpha)
    display.bodyRig.addAt(glow, 0)
    display.rarityGlow = glow
  }

  const glow = display.rarityGlow
  glow.setPosition(0, -14)
  glow.setFillStyle(color, fillAlpha)
  glow.setStrokeStyle(2, color, strokeAlpha)
  glow.setScale(scale)
  glow.setVisible(true)

  if (display.rarityGlowTween) {
    display.rarityGlowTween.stop()
  }

  const pulseMin = Math.max(0.15, fillAlpha * 0.65)
  const pulseMax = Math.min(0.5, fillAlpha * 1.35)
  display.rarityGlowTween = scene.tweens.add({
    targets: glow,
    alpha: { from: pulseMin, to: pulseMax },
    duration: 900 + tier * 80,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}
