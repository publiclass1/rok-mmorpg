import Phaser from 'phaser'
import { isMaxBaseLevel } from '../../content/ro/expTables'

/** Outermost — deep blue glow. */
const HALO_COLOR = 0x2563eb
/** Middle ring — bright sky blue. */
const OUTER_COLOR = 0x38bdf8
/** Core — white hot center. */
const INNER_COLOR = 0xffffff

const PULSE_DELAY_MIN_MS = 350
const PULSE_DELAY_MAX_MS = 1100

const RIPPLE_DELAY_MIN_MS = 450
const RIPPLE_DELAY_MAX_MS = 1200
const RIPPLE_FIRST_SPAWN_MS = 120

export type MaxLevelFootAuraHost = {
  container: Phaser.GameObjects.Container
  /** When set, ripples insert directly under the character rig. */
  riderLayer?: Phaser.GameObjects.Container
  pose: { anim: string }
  maxLevelAuraBaseLevel?: number
  maxLevelAuraHalo?: Phaser.GameObjects.Ellipse
  maxLevelAuraOuter?: Phaser.GameObjects.Ellipse
  maxLevelAuraInner?: Phaser.GameObjects.Ellipse
  maxLevelAuraPulseTimer?: Phaser.Time.TimerEvent
  maxLevelAuraPulseTween?: Phaser.Tweens.Tween
  maxLevelAuraAmbientTween?: Phaser.Tweens.Tween
  maxLevelAuraRippleTimer?: Phaser.Time.TimerEvent
}

function auraEllipses(host: MaxLevelFootAuraHost): Phaser.GameObjects.Ellipse[] {
  const list: Phaser.GameObjects.Ellipse[] = []
  if (host.maxLevelAuraHalo) list.push(host.maxLevelAuraHalo)
  if (host.maxLevelAuraOuter) list.push(host.maxLevelAuraOuter)
  if (host.maxLevelAuraInner) list.push(host.maxLevelAuraInner)
  return list
}

function stopAuraAnimation(host: MaxLevelFootAuraHost) {
  host.maxLevelAuraPulseTimer?.remove(false)
  host.maxLevelAuraPulseTimer = undefined
  host.maxLevelAuraPulseTween?.stop()
  host.maxLevelAuraPulseTween = undefined
  host.maxLevelAuraAmbientTween?.stop()
  host.maxLevelAuraAmbientTween = undefined
  host.maxLevelAuraRippleTimer?.remove(false)
  host.maxLevelAuraRippleTimer = undefined
}

function isAuraActiveAndVisible(host: MaxLevelFootAuraHost): boolean {
  const layers = auraEllipses(host)
  return layers.length > 0 && layers[0].visible && host.pose.anim !== 'dead'
}

function rippleInsertIndex(host: MaxLevelFootAuraHost): number {
  if (host.riderLayer) {
    const idx = host.container.getIndex(host.riderLayer)
    if (idx >= 0) return idx
  }
  return Math.max(0, host.container.length - 1)
}

function spawnMaxLevelFootRipple(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  if (!isAuraActiveAndVisible(host)) return

  const startAlpha = Phaser.Math.FloatBetween(0.55, 0.75)
  const endScale = Phaser.Math.FloatBetween(1.5, 1.9)
  const ripple = scene.add.ellipse(0, 2, 42, 16, OUTER_COLOR, 0.28)
  ripple.setStrokeStyle(3, INNER_COLOR, 0.85)
  ripple.setScale(0.5)
  ripple.setAlpha(startAlpha)
  host.container.addAt(ripple, rippleInsertIndex(host))

  scene.tweens.add({
    targets: ripple,
    scaleX: endScale,
    scaleY: endScale,
    alpha: 0,
    duration: Phaser.Math.Between(400, 580),
    ease: 'Sine.easeOut',
    onComplete: () => ripple.destroy(),
  })
}

function randomRippleDelayMs(): number {
  return Phaser.Math.Between(RIPPLE_DELAY_MIN_MS, RIPPLE_DELAY_MAX_MS)
}

function scheduleNextRipple(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  host.maxLevelAuraRippleTimer?.remove(false)
  host.maxLevelAuraRippleTimer = undefined

  host.maxLevelAuraRippleTimer = scene.time.delayedCall(randomRippleDelayMs(), () => {
    host.maxLevelAuraRippleTimer = undefined

    if (isAuraActiveAndVisible(host)) {
      spawnMaxLevelFootRipple(scene, host)
      if (Math.random() < 0.3) {
        scene.time.delayedCall(Phaser.Math.Between(80, 120), () => {
          spawnMaxLevelFootRipple(scene, host)
        })
      }
    }

    scheduleNextRipple(scene, host)
  })
}

function startRippleScheduler(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  if (host.maxLevelAuraRippleTimer) return
  scene.time.delayedCall(RIPPLE_FIRST_SPAWN_MS, () => {
    if (isAuraActiveAndVisible(host)) {
      spawnMaxLevelFootRipple(scene, host)
    }
  })
  scheduleNextRipple(scene, host)
}

function hideAuraGfx(host: MaxLevelFootAuraHost) {
  stopAuraAnimation(host)
  for (const g of auraEllipses(host)) {
    g.setVisible(false)
  }
}

function randomPulseDelayMs(): number {
  return Phaser.Math.Between(PULSE_DELAY_MIN_MS, PULSE_DELAY_MAX_MS)
}

function startAmbientGlow(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  if (host.maxLevelAuraAmbientTween) return
  const targets = auraEllipses(host)
  if (targets.length === 0) return
  host.maxLevelAuraAmbientTween = scene.tweens.add({
    targets,
    alpha: { from: 0.85, to: 1 },
    duration: Phaser.Math.Between(900, 1400),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

function scheduleNextPulse(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  host.maxLevelAuraPulseTimer?.remove(false)
  host.maxLevelAuraPulseTimer = undefined
  host.maxLevelAuraPulseTween?.stop()
  host.maxLevelAuraPulseTween = undefined

  host.maxLevelAuraPulseTimer = scene.time.delayedCall(randomPulseDelayMs(), () => {
    host.maxLevelAuraPulseTimer = undefined
    const layers = auraEllipses(host)
    if (layers.length === 0 || !layers[0].visible || host.pose.anim === 'dead') {
      scheduleNextPulse(scene, host)
      return
    }

    const spike = 1 + Phaser.Math.FloatBetween(0.1, 0.28)
    const baseAlpha = layers[0].alpha

    host.maxLevelAuraPulseTween = scene.tweens.add({
      targets: layers,
      scaleX: spike,
      scaleY: spike,
      alpha: Math.min(1, baseAlpha + Phaser.Math.FloatBetween(0.2, 0.45)),
      duration: Phaser.Math.Between(140, 260),
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        host.maxLevelAuraPulseTween = undefined
        for (const g of layers) {
          g.setScale(1)
        }
        scheduleNextPulse(scene, host)
      },
    })
  })
}

function applyAuraPalette(host: MaxLevelFootAuraHost) {
  const halo = host.maxLevelAuraHalo
  const outer = host.maxLevelAuraOuter
  const inner = host.maxLevelAuraInner
  if (halo) {
    halo.setFillStyle(HALO_COLOR, 0.22)
    halo.setStrokeStyle(3, HALO_COLOR, 0.55)
  }
  if (outer) {
    outer.setFillStyle(OUTER_COLOR, 0.38)
    outer.setStrokeStyle(2, OUTER_COLOR, 0.82)
  }
  if (inner) {
    inner.setFillStyle(INNER_COLOR, 0.58)
    inner.setStrokeStyle(2, 0xe0f2fe, 0.95)
  }
}

function ensureAuraGraphics(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  if (!host.maxLevelAuraHalo) {
    const halo = scene.add.ellipse(0, 2, 52, 20, HALO_COLOR, 0.22)
    halo.setStrokeStyle(3, HALO_COLOR, 0.55)
    host.container.addAt(halo, 0)
    host.maxLevelAuraHalo = halo
  }
  if (!host.maxLevelAuraOuter) {
    const outer = scene.add.ellipse(0, 2, 40, 16, OUTER_COLOR, 0.38)
    outer.setStrokeStyle(2, OUTER_COLOR, 0.82)
    host.container.addAt(outer, 1)
    host.maxLevelAuraOuter = outer
  }
  if (!host.maxLevelAuraInner) {
    const inner = scene.add.ellipse(0, 2, 26, 11, INNER_COLOR, 0.58)
    inner.setStrokeStyle(2, 0xe0f2fe, 0.95)
    host.container.addAt(inner, 2)
    host.maxLevelAuraInner = inner
  }
  applyAuraPalette(host)
}

function showAura(scene: Phaser.Scene, host: MaxLevelFootAuraHost) {
  ensureAuraGraphics(scene, host)
  const halo = host.maxLevelAuraHalo!
  const outer = host.maxLevelAuraOuter!
  const inner = host.maxLevelAuraInner!

  for (const g of [halo, outer, inner]) {
    g.setPosition(0, 2)
    g.setScale(1)
  }
  halo.setAlpha(0.42)
  outer.setAlpha(0.48)
  inner.setAlpha(0.62)

  const visible = host.pose.anim !== 'dead'
  halo.setVisible(visible)
  outer.setVisible(visible)
  inner.setVisible(visible)

  if (visible) {
    startAmbientGlow(scene, host)
    if (!host.maxLevelAuraPulseTimer && !host.maxLevelAuraPulseTween) {
      scheduleNextPulse(scene, host)
    }
    startRippleScheduler(scene, host)
  }
}

/** Glowing foot circle for characters at max base level. */
export function syncPlayerMaxLevelFootAura(display: MaxLevelFootAuraHost, baseLevel: number) {
  const scene = display.container.scene
  if (!scene?.textures) return

  display.maxLevelAuraBaseLevel = baseLevel

  if (!isMaxBaseLevel(baseLevel)) {
    hideAuraGfx(display)
    return
  }

  showAura(scene, display)
}

/** Refresh visibility when pose changes (e.g. hide while dead). */
export function refreshMaxLevelFootAuraPose(display: MaxLevelFootAuraHost) {
  const level = display.maxLevelAuraBaseLevel
  if (level == null || !isMaxBaseLevel(level)) return
  const scene = display.container.scene
  if (!scene?.textures) return

  const layers = auraEllipses(display)
  if (layers.length === 0) return

  const visible = display.pose.anim !== 'dead'
  for (const g of layers) {
    g.setVisible(visible)
  }

  if (visible) {
    startAmbientGlow(scene, display)
    if (!display.maxLevelAuraPulseTimer && !display.maxLevelAuraPulseTween) {
      scheduleNextPulse(scene, display)
    }
    startRippleScheduler(scene, display)
  } else {
    stopAuraAnimation(display)
  }
}
