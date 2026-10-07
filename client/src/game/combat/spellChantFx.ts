import Phaser from 'phaser'
import {
  positionPlayerSpellChant,
  styleSpellChantLabel,
} from '../world/worldNameLabel'
import { spellChantVisibleLength } from './spellChants'

export class PlayerSpellChantGfx {
  private readonly scene: Phaser.Scene
  readonly text: Phaser.GameObjects.Text
  private typewriterTimer: Phaser.Time.TimerEvent | null = null
  private hideTimer: Phaser.Time.TimerEvent | null = null
  private active = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.text = scene.add.text(0, 0, '')
    styleSpellChantLabel(this.text)
    this.text.setVisible(false)
  }

  get isActive(): boolean {
    return this.active
  }

  play(fullPhrase: string, durationMs: number, feetX: number, feetY: number) {
    this.cancel()
    if (!fullPhrase || durationMs <= 0) return

    this.active = true
    positionPlayerSpellChant(this.text, feetX, feetY)
    this.text.setText('')
    this.text.setVisible(true)
    this.text.setAlpha(0.92)

    const len = fullPhrase.length
    const stepMs = Math.max(16, durationMs / len)
    let index = 0

    const tick = () => {
      index += 1
      const visible = fullPhrase.slice(0, index)
      this.text.setText(visible)
      if (index >= len) {
        this.typewriterTimer = null
      }
    }

    tick()
    if (len > 1) {
      this.typewriterTimer = this.scene.time.addEvent({
        delay: stepMs,
        repeat: len - 2,
        callback: tick,
      })
    }
    this.hideTimer = this.scene.time.delayedCall(durationMs, () => this.cancel())
  }

  setPosition(feetX: number, feetY: number) {
    if (!this.active) return
    positionPlayerSpellChant(this.text, feetX, feetY)
  }

  cancel() {
    this.typewriterTimer?.remove()
    this.typewriterTimer = null
    this.hideTimer?.remove()
    this.hideTimer = null
    this.active = false
    this.text.setVisible(false)
    this.text.setText('')
  }

  destroy() {
    this.cancel()
    this.text.destroy()
  }
}

/** @internal exported for tests */
export function chantTextAtProgress(fullPhrase: string, progress01: number): string {
  const n = spellChantVisibleLength(fullPhrase, progress01)
  return fullPhrase.slice(0, n)
}
