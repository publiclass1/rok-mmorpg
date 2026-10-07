import Phaser from 'phaser'

const PAD_X = 10
const PAD_Y = 6
const MAX_WRAP = 176
const FILL = 0x0f172a
const FILL_ALPHA = 0.82
const BORDER = 0x6b7280
const FONT_SIZE = 13

/** Bubble anchor sits above the feet Y (container grows upward). */
export const PLAYER_CHAT_BUBBLE_OFFSET_ABOVE = 76

function textResolution(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(2, Math.max(1, window.devicePixelRatio || 1))
}

function styleChatBubbleLabel(label: Phaser.GameObjects.Text) {
  label.setFontSize(FONT_SIZE)
  label.setFontFamily('Arial, Helvetica, sans-serif')
  label.setColor('#f9fafb')
  label.setStroke('#0f172a', 4)
  label.setResolution(textResolution())
  label.setPadding(1, 2, 1, 2)
}

export type PlayerChatBubble = {
  container: Phaser.GameObjects.Container
  show: (text: string, durationMs: number) => void
  hide: () => void
  setWorldPosition: (x: number, y: number) => void
  isShowing: () => boolean
  destroy: () => void
}

export function chatBubbleDurationMs(text: string): number {
  const len = text.trim().length
  return Math.min(8000, Math.max(2800, 2200 + len * 45))
}

export function createPlayerChatBubble(scene: Phaser.Scene): PlayerChatBubble {
  const container = scene.add.container(0, 0)
  const bg = scene.add.graphics()
  const label = scene.add.text(0, 0, '', {
    fontSize: `${FONT_SIZE}px`,
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#f9fafb',
    wordWrap: { width: MAX_WRAP },
    align: 'center',
  })
  label.setOrigin(0.5, 1)
  styleChatBubbleLabel(label)
  container.add([bg, label])
  container.setVisible(false)

  let hideTween: Phaser.Tweens.Tween | null = null
  let showing = false

  function drawBg() {
    bg.clear()
    const w = Math.ceil(label.width + PAD_X * 2)
    const h = Math.ceil(label.height + PAD_Y * 2)
    const left = Math.round(-w / 2)
    const top = Math.round(-h)
    bg.fillStyle(FILL, FILL_ALPHA)
    bg.fillRoundedRect(left, top, w, h, 8)
    bg.lineStyle(1, BORDER, 1)
    bg.strokeRoundedRect(left + 0.5, top + 0.5, w - 1, h - 1, 8)
    label.setPosition(0, -PAD_Y)
  }

  function hide() {
    hideTween?.stop()
    hideTween = null
    showing = false
    container.setVisible(false)
    label.setAlpha(1)
    bg.setAlpha(1)
  }

  function show(text: string, durationMs: number) {
    hide()
    const trimmed = text.trim().slice(0, 120)
    if (!trimmed) return
    label.setText(trimmed)
    styleChatBubbleLabel(label)
    drawBg()
    showing = true
    container.setVisible(true)
    label.setAlpha(1)
    bg.setAlpha(1)

    hideTween = scene.tweens.add({
      targets: [label, bg],
      alpha: 0,
      delay: Math.max(600, durationMs - 320),
      duration: 320,
      ease: 'Sine.easeIn',
      onComplete: () => hide(),
    })
  }

  return {
    container,
    show,
    hide,
    setWorldPosition(x, y) {
      container.setPosition(Math.round(x), Math.round(y))
    },
    isShowing: () => showing,
    destroy() {
      hide()
      container.destroy(true)
    },
  }
}

export function positionPlayerChatBubbleAtFeet(bubble: PlayerChatBubble, feetX: number, feetY: number) {
  bubble.setWorldPosition(feetX, feetY - PLAYER_CHAT_BUBBLE_OFFSET_ABOVE)
}
