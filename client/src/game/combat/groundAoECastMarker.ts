import Phaser from 'phaser'
import type { RoSkillMagicElement } from '../../content/ro/types'
import type { SkillDefinition } from '../character/skillsConfig'
import { SKILLS, isPlayerGroundMagicSkill } from '../character/skillsConfig'
import { setDepthByFeet } from '../world/depthSort'

export const GROUND_AOE_DEPTH_EPSILON = -0.14
/** Visible ground impact fade (marker pulse + fallback burst). */
export const GROUND_AOE_IMPACT_DURATION_MS = 3000
/** Damage ticks while the ground AoE is active (matches impact duration). */
export const GROUND_AOE_DAMAGE_TICK_MS = 300

export function groundAoEDamageTickCount(): number {
  return Math.max(1, Math.round(GROUND_AOE_IMPACT_DURATION_MS / GROUND_AOE_DAMAGE_TICK_MS))
}
const DEFAULT_STUB_AOE_RADIUS = 48
const ELLIPSE_HEIGHT_RATIO = 0.7

export type GroundAoEElementStyle = {
  fill: number
  stroke: number
  accent: number
}

export function groundAoERadiusPx(def: SkillDefinition, _skillId?: string): number {
  const r = def.magic?.aoeRadius ?? def.physical?.aoeRadius
  if (r != null && r > 0) return r
  return DEFAULT_STUB_AOE_RADIUS
}

const ELEMENT_GROUND_STYLES: Record<RoSkillMagicElement, GroundAoEElementStyle> = {
  fire: { fill: 0xef4444, stroke: 0xf97316, accent: 0xfbbf24 },
  water: { fill: 0x0ea5e9, stroke: 0x38bdf8, accent: 0x7dd3fc },
  wind: { fill: 0xeab308, stroke: 0xfde047, accent: 0xfef08a },
  earth: { fill: 0xa8a29e, stroke: 0x78716c, accent: 0xd6d3d1 },
  ghost: { fill: 0xa78bfa, stroke: 0x8b5cf6, accent: 0xc4b5fd },
  neutral: { fill: 0x94a3b8, stroke: 0x64748b, accent: 0xcbd5e1 },
}

export function groundAoEElementStyle(skillId: string): GroundAoEElementStyle {
  const element = SKILLS[skillId]?.magic?.element
  if (element) return ELEMENT_GROUND_STYLES[element]
  if (skillId === 'safety_wall' || skillId === 'ice_wall') return ELEMENT_GROUND_STYLES.neutral
  if (skillId === 'quagmire') return ELEMENT_GROUND_STYLES.earth
  return ELEMENT_GROUND_STYLES.ghost
}

export function usesGroundAoECastMarker(skillId: string): boolean {
  return isPlayerGroundMagicSkill(skillId)
}

/** One-shot ground burst when an AoE lands (after cast preview is dismissed). */
export function playGroundAoEImpactBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skillId: string,
  radiusPx: number,
) {
  const style = groundAoEElementStyle(skillId)
  const w = radiusPx * 2
  const h = radiusPx * 2 * ELLIPSE_HEIGHT_RATIO
  const ellipse = scene.add.ellipse(x, y, w, h, style.fill, 0.55)
  ellipse.setStrokeStyle(3, style.accent, 1)
  setDepthByFeet(ellipse, y, GROUND_AOE_DEPTH_EPSILON)
  scene.tweens.add({
    targets: ellipse,
    scaleX: 1.35,
    scaleY: 1.35,
    alpha: 0,
    duration: GROUND_AOE_IMPACT_DURATION_MS,
    ease: 'Sine.easeIn',
    onComplete: () => ellipse.destroy(),
  })
}

function groundAoEGroundRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radiusPx: number,
  color: number,
  duration = GROUND_AOE_IMPACT_DURATION_MS,
) {
  const w = radiusPx * 2
  const h = radiusPx * 2 * ELLIPSE_HEIGHT_RATIO
  const ring = scene.add.ellipse(x, y, w * 0.65, h * 0.65, color, 0.2)
  ring.setStrokeStyle(2, color, 0.85)
  setDepthByFeet(ring, y, GROUND_AOE_DEPTH_EPSILON + 0.01)
  scene.tweens.add({
    targets: ring,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 0,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  })
}

function playGroundAoESkillExtras(
  scene: Phaser.Scene,
  x: number,
  y: number,
  skillId: string,
  radiusPx: number,
) {
  const style = groundAoEElementStyle(skillId)
  const depthEps = GROUND_AOE_DEPTH_EPSILON + 0.02

  switch (skillId) {
    case 'meteor_storm':
    case 'fire_ball': {
      const meteorHits = 7
      const meteorStagger = GROUND_AOE_IMPACT_DURATION_MS / meteorHits
      for (let i = 0; i < meteorHits; i++) {
        scene.time.delayedCall(i * meteorStagger, () => {
          const ox = (Math.random() - 0.5) * radiusPx * 0.7
          const dot = scene.add.circle(
            x + ox,
            y - radiusPx * 0.45,
            3 + (i % 2),
            style.accent,
            0.9,
          )
          setDepthByFeet(dot, y, depthEps)
          scene.tweens.add({
            targets: dot,
            y: y - 4,
            alpha: 0,
            duration: Math.min(900, GROUND_AOE_IMPACT_DURATION_MS - i * meteorStagger),
            onComplete: () => dot.destroy(),
          })
        })
      }
      break
    }
    case 'lord_of_vermilion': {
      const lovWaves = 3
      const lovWaveGap = GROUND_AOE_IMPACT_DURATION_MS / lovWaves
      for (let wave = 0; wave < lovWaves; wave++) {
        scene.time.delayedCall(wave * lovWaveGap, () => {
          for (let i = 0; i < 3; i++) {
            const ox = (i - 1) * (radiusPx * 0.35)
            const bolt = scene.add.graphics()
            setDepthByFeet(bolt, y, depthEps + i * 0.001)
            bolt.lineStyle(3, style.accent, 0.95)
            bolt.lineBetween(x + ox, y - radiusPx * 0.9, x + ox, y + 4)
            scene.tweens.add({
              targets: bolt,
              alpha: 0,
              duration: Math.min(1100, lovWaveGap * 0.9),
              onComplete: () => bolt.destroy(),
            })
          }
        })
      }
      groundAoEGroundRing(scene, x, y, radiusPx, style.stroke)
      break
    }
    case 'storm_gust':
    case 'frost_nova':
      groundAoEGroundRing(scene, x, y, radiusPx, style.accent)
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12
        const dist = radiusPx * (0.3 + (i % 4) * 0.1)
        const delay = (i / 12) * (GROUND_AOE_IMPACT_DURATION_MS * 0.65)
        scene.time.delayedCall(delay, () => {
          const speck = scene.add.circle(
            x + Math.cos(a) * dist,
            y + Math.sin(a) * dist * 0.7,
            2,
            0xe0f2fe,
            0.85,
          )
          setDepthByFeet(speck, y, depthEps)
          scene.tweens.add({
            targets: speck,
            alpha: 0,
            scale: 1.8,
            duration: GROUND_AOE_IMPACT_DURATION_MS - delay,
            onComplete: () => speck.destroy(),
          })
        })
      }
      break
    case 'heavens_drive':
      groundAoEGroundRing(scene, x, y, radiusPx, style.stroke)
      for (let i = 0; i < 5; i++) {
        scene.time.delayedCall(i * (GROUND_AOE_IMPACT_DURATION_MS / 6), () => {
          const ox = (i - 2) * (radiusPx * 0.22)
          const spike = scene.add.graphics()
          setDepthByFeet(spike, y, depthEps)
          spike.fillStyle(style.accent, 0.75)
          spike.fillTriangle(x + ox, y + 6, x + ox - 5, y + 14, x + ox + 5, y + 14)
          scene.tweens.add({
            targets: spike,
            alpha: 0,
            duration: GROUND_AOE_IMPACT_DURATION_MS * 0.55,
            onComplete: () => spike.destroy(),
          })
        })
      }
      break
    default:
      break
  }
}

/** Ground-target impact: marker pulse plus skill-specific landing tweens. */
export function playGroundAoEImpact(
  scene: Phaser.Scene,
  marker: GroundAoECastMarker,
  x: number,
  y: number,
  skillId: string,
  radiusPx: number,
) {
  playGroundAoESkillExtras(scene, x, y, skillId, radiusPx)
  if (marker.isLocked) {
    marker.releaseImpact()
  } else {
    playGroundAoEImpactBurst(scene, x, y, skillId, radiusPx)
  }
}

type MarkerMode = 'hidden' | 'preview' | 'locked'

export class GroundAoECastMarker {
  private readonly scene: Phaser.Scene
  readonly container: Phaser.GameObjects.Container
  private readonly baseEllipse: Phaser.GameObjects.Ellipse
  private readonly ringA: Phaser.GameObjects.Graphics
  private readonly ringB: Phaser.GameObjects.Graphics
  private mode: MarkerMode = 'hidden'
  private skillId = ''
  private radiusPx = DEFAULT_STUB_AOE_RADIUS
  private feetY = 0
  private spinTweenA: Phaser.Tweens.Tween | null = null
  private spinTweenB: Phaser.Tweens.Tween | null = null
  private pulseTween: Phaser.Tweens.Tween | null = null
  private releaseTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.baseEllipse = scene.add.ellipse(0, 0, 20, 14, 0xffffff, 0.22)
    this.baseEllipse.setStrokeStyle(2, 0xffffff, 0.75)

    this.ringA = scene.add.graphics()
    this.ringB = scene.add.graphics()

    this.container = scene.add.container(0, 0, [this.baseEllipse, this.ringA, this.ringB])
    this.container.setVisible(false)
  }

  get isActive(): boolean {
    return this.mode !== 'hidden'
  }

  get isLocked(): boolean {
    return this.mode === 'locked'
  }

  get activeFeetY(): number {
    return this.feetY
  }

  showPreview(skillId: string, def: SkillDefinition) {
    this.cancelTweens()
    this.skillId = skillId
    this.radiusPx = groundAoERadiusPx(def, skillId)
    this.applyStyle(false)
    this.resizeEllipse()
    this.drawArcRings()
    this.mode = 'preview'
    this.container.setVisible(true)
    this.container.setAlpha(0.85)
    this.startSpin()
  }

  setPreviewPosition(x: number, y: number, inRange: boolean) {
    if (this.mode !== 'preview') return
    this.container.setPosition(x, y)
    this.feetY = y
    setDepthByFeet(this.container, this.feetY, GROUND_AOE_DEPTH_EPSILON)
    this.applyStyle(!inRange)
  }

  lockCast(x: number, y: number) {
    if (this.mode === 'hidden') return
    this.mode = 'locked'
    this.container.setPosition(x, y)
    this.feetY = y
    setDepthByFeet(this.container, this.feetY, GROUND_AOE_DEPTH_EPSILON)
    this.container.setAlpha(1)
    this.applyStyle(false)
    if (!this.spinTweenA) this.startSpin()
  }

  releaseImpact(onDone?: () => void) {
    if (this.mode === 'hidden') {
      onDone?.()
      return
    }
    this.stopSpin()
    this.pulseTween?.stop()
    this.pulseTween = null

    const style = groundAoEElementStyle(this.skillId)
    this.baseEllipse.setFillStyle(style.fill, 0.55)
    this.baseEllipse.setStrokeStyle(3, style.accent, 1)

    this.releaseTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: GROUND_AOE_IMPACT_DURATION_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.releaseTween = null
        this.resetVisual()
        onDone?.()
      },
    })
  }

  cancel() {
    this.releaseTween?.stop()
    this.releaseTween = null
    this.stopSpin()
    this.pulseTween?.stop()
    this.pulseTween = null
    this.resetVisual()
  }

  destroy() {
    this.cancel()
    this.container.destroy()
  }

  syncDepth() {
    if (!this.isActive) return
    setDepthByFeet(this.container, this.feetY, GROUND_AOE_DEPTH_EPSILON)
  }

  private resetVisual() {
    this.mode = 'hidden'
    this.container.setVisible(false)
    this.container.setAlpha(1)
    this.container.setScale(1)
    this.ringA.clear()
    this.ringB.clear()
  }

  private resizeEllipse() {
    const w = this.radiusPx * 2
    const h = this.radiusPx * 2 * ELLIPSE_HEIGHT_RATIO
    this.baseEllipse.setSize(w, h)
  }

  private applyStyle(outOfRange: boolean) {
    const style = groundAoEElementStyle(this.skillId)
    if (outOfRange) {
      this.baseEllipse.setFillStyle(0x7f1d1d, 0.18)
      this.baseEllipse.setStrokeStyle(2, 0xef4444, 0.65)
    } else {
      this.baseEllipse.setFillStyle(style.fill, 0.22)
      this.baseEllipse.setStrokeStyle(2, style.stroke, 0.85)
    }
    this.drawArcRings(outOfRange ? 0xef4444 : style.accent)
  }

  private drawArcRings(accent = groundAoEElementStyle(this.skillId).accent) {
    const arcR = this.radiusPx * 0.92
    const span = Math.PI * 0.55

    this.ringA.clear()
    this.ringA.lineStyle(3, accent, 0.9)
    this.ringA.beginPath()
    this.ringA.arc(0, 0, arcR, -span, span, false)
    this.ringA.strokePath()

    this.ringB.clear()
    this.ringB.lineStyle(2, accent, 0.55)
    this.ringB.beginPath()
    this.ringB.arc(0, 0, arcR * 0.78, Math.PI - span, Math.PI + span, false)
    this.ringB.strokePath()
  }

  private startSpin() {
    this.stopSpin()
    this.spinTweenA = this.scene.tweens.add({
      targets: this.ringA,
      rotation: Math.PI * 2,
      duration: 1400,
      repeat: -1,
      ease: 'Linear',
    })
    this.spinTweenB = this.scene.tweens.add({
      targets: this.ringB,
      rotation: -Math.PI * 2,
      duration: 2200,
      repeat: -1,
      ease: 'Linear',
    })
    if (!this.pulseTween) {
      this.pulseTween = this.scene.tweens.add({
        targets: this.baseEllipse,
        alpha: { from: 0.85, to: 1 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  private stopSpin() {
    this.spinTweenA?.stop()
    this.spinTweenB?.stop()
    this.spinTweenA = null
    this.spinTweenB = null
    this.ringA.setRotation(0)
    this.ringB.setRotation(0)
  }

  private cancelTweens() {
    this.releaseTween?.stop()
    this.releaseTween = null
    this.stopSpin()
    this.pulseTween?.stop()
    this.pulseTween = null
  }
}
