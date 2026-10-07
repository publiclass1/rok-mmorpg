import Phaser from 'phaser'
import { PLAYER_CAST_BAR_OFFSET_ABOVE } from '../world/worldNameLabel'

const BAR_WIDTH = 54
const BAR_HEIGHT = 7
const FILL_PAD = 1

/** Hide cast bar for very short casts (instant / minimal windup). */
export const MIN_CAST_BAR_MS = 120

export function shouldShowCastBar(effectiveCastMs: number): boolean {
  return effectiveCastMs >= MIN_CAST_BAR_MS
}

export function positionPlayerCastBar(
  container: Phaser.GameObjects.Container,
  feetX: number,
  feetY: number,
) {
  container.setPosition(feetX, feetY - PLAYER_CAST_BAR_OFFSET_ABOVE)
}

export class PlayerCastBarGfx {
  private readonly scene: Phaser.Scene
  readonly container: Phaser.GameObjects.Container
  private readonly fill: Phaser.GameObjects.Rectangle
  private activeTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const bg = scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x0a0a0a, 0.95)
    bg.setStrokeStyle(1, 0x334155, 1)

    const fillW = BAR_WIDTH - FILL_PAD * 2
    const fillH = BAR_HEIGHT - FILL_PAD * 2
    this.fill = scene.add.rectangle(
      -BAR_WIDTH / 2 + FILL_PAD,
      0,
      fillW,
      fillH,
      0x22c55e,
      1,
    )
    this.fill.setOrigin(0, 0.5)
    this.fill.scaleX = 0.001

    const highlight = scene.add.rectangle(
      -BAR_WIDTH / 2 + FILL_PAD,
      -1,
      fillW,
      2,
      0x86efac,
      0.35,
    )
    highlight.setOrigin(0, 0.5)
    highlight.scaleX = 0.001

    this.container = scene.add.container(0, 0, [bg, this.fill, highlight])
    this.container.setVisible(false)
    this.activeTween = null
  }

  get isActive(): boolean {
    return this.container.visible
  }

  play(durationMs: number, feetX: number, feetY: number) {
    this.cancel()
    positionPlayerCastBar(this.container, feetX, feetY)
    this.container.setVisible(true)
    this.fill.scaleX = 0.001
    const highlight = this.container.list[2] as Phaser.GameObjects.Rectangle
    highlight.scaleX = 0.001

    this.activeTween = this.scene.tweens.add({
      targets: [this.fill, highlight],
      scaleX: 1,
      duration: durationMs,
      ease: 'Linear',
      onComplete: () => {
        this.activeTween = null
        this.container.setVisible(false)
        this.fill.scaleX = 0.001
        highlight.scaleX = 0.001
      },
    })
  }

  cancel() {
    this.activeTween?.stop()
    this.activeTween = null
    this.container.setVisible(false)
    this.fill.scaleX = 0.001
    const highlight = this.container.list[2] as Phaser.GameObjects.Rectangle
    if (highlight) highlight.scaleX = 0.001
  }

  destroy() {
    this.cancel()
    this.container.destroy()
  }
}
