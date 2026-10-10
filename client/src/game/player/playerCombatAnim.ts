import Phaser from 'phaser'
import { playPlayerAttackSlash } from '../combat/combatFx'
import { usesGroundAoECastMarker } from '../combat/groundAoECastMarker'
import {
  playBowArrowProjectile,
  playDoubleStrafeVolley,
  playMagicSkillProjectileVolley,
  playRangedAttackRecoil,
  playStaffMagicProjectile,
  rangedProjectileOrigin,
} from '../combat/rangedProjectileFx'
import type { AttackStyle } from '../character/characterSpriteRegistry'
import type { Facing } from '../movement/clickToMove'
import { stopIdleRigTween } from './playerIdleMotion'
import {
  playPlayerAnim,
  setPlayerAttackPhase,
  setPlayerDeadFrame,
  setPlayerToIdle,
  type PlayerDisplay,
} from './playerSprites'

export type AttackVariant = 'basic' | 'bash'

const WINDUP_MS = 55
const STRIKE_MS = 100
const END_MS = 380
/** Room after strike for projectile travel (matches `projectileTravelMs` cap). */
const POST_STRIKE_PROJECTILE_MS = 400

export function startPlayerAttackAnim(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  facing: Facing,
  options: {
    variant: AttackVariant
    attackStyle: AttackStyle
    /** Delay before strike phase (cast time for magic skills). */
    strikeDelayMs?: number
    getAimTarget?: () => { x: number; y: number } | null
    /** When set, fires element-specific projectiles instead of the default staff orb. */
    magicSkillId?: string
    /** Physical ranged skill id for custom projectiles (e.g. double_strafe). */
    projectileSkillId?: string
    magicHitCount?: number
    onMagicHit?: (hitIndex: number) => void
    onMagicVolleyComplete?: () => void
    rangedHitCount?: number
    onRangedHit?: (hitIndex: number) => void
    onStrike?: () => void
    onComplete?: () => void
  },
) {
  const bash = options.variant === 'bash'
  display.pose = {
    ...display.pose,
    facing,
    anim: 'attack',
    walkFrame: 0,
    attackPhase: 0,
    attackStyle: options.attackStyle,
    bash,
    hitFlash: false,
  }
  setPlayerAttackPhase(display, 0)

  const strikeDelay = options.strikeDelayMs ?? WINDUP_MS
  const hitCount = options.magicHitCount ?? 1
  const rangedHits = options.rangedHitCount ?? 1
  const boltStagger =
    options.magicSkillId?.endsWith('_bolt') && hitCount > 1 ? (hitCount - 1) * 90 : 0
  const bowStagger =
    options.attackStyle === 'bow' && rangedHits > 1 ? (rangedHits - 1) * 90 : 0
  const animEndMs = Math.max(END_MS, strikeDelay + POST_STRIKE_PROJECTILE_MS + boltStagger + bowStagger)
  const strikePhaseMs = strikeDelay + Math.max(0, STRIKE_MS - WINDUP_MS)

  scene.time.delayedCall(strikeDelay, () => {
    if (display.pose.anim !== 'attack') return
    setPlayerAttackPhase(display, 1)

    const ranged = options.attackStyle === 'bow' || options.attackStyle === 'cast'
    const aim = ranged ? options.getAimTarget?.() ?? null : null

    if (ranged && aim) {
      const container = display.container
      const depth = container.depth + 1.25
      const skipTravelProjectile =
        options.magicSkillId != null && usesGroundAoECastMarker(options.magicSkillId)
      if (!skipTravelProjectile) {
        playRangedAttackRecoil(scene, display.bodyRig, facing)
      }
      if (options.magicSkillId) {
        const hitCount = options.magicHitCount ?? 1
        playMagicSkillProjectileVolley(
          scene,
          options.magicSkillId,
          facing,
          container.x,
          container.y,
          aim.x,
          aim.y,
          depth,
          hitCount,
          (hitIndex) => options.onMagicHit?.(hitIndex),
          () => {
            options.onMagicVolleyComplete?.()
            options.onStrike?.()
          },
        )
      } else if (
        options.projectileSkillId === 'double_strafe' &&
        options.attackStyle === 'bow' &&
        rangedHits > 1
      ) {
        const origin = rangedProjectileOrigin(container.x, container.y, facing)
        playDoubleStrafeVolley(
          scene,
          origin.x,
          origin.y,
          aim.x,
          aim.y,
          depth,
          (hitIndex) => options.onRangedHit?.(hitIndex),
          () => options.onStrike?.(),
        )
      } else if (options.attackStyle === 'bow' && rangedHits > 1) {
        const origin = rangedProjectileOrigin(container.x, container.y, facing)
        let completed = 0
        for (let i = 0; i < rangedHits; i++) {
          scene.time.delayedCall(i * 90, () => {
            if (display.pose.anim !== 'attack') return
            playBowArrowProjectile(scene, origin.x, origin.y, aim.x, aim.y, depth, () => {
              options.onRangedHit?.(i)
              completed += 1
              if (completed >= rangedHits) options.onStrike?.()
            })
          })
        }
      } else {
        const origin = rangedProjectileOrigin(container.x, container.y, facing)
        const onArrive = () => options.onStrike?.()
        if (options.attackStyle === 'bow') {
          playBowArrowProjectile(scene, origin.x, origin.y, aim.x, aim.y, depth, onArrive)
        } else {
          playStaffMagicProjectile(scene, origin.x, origin.y, aim.x, aim.y, depth, onArrive)
        }
      }
      return
    }

    playPlayerAttackSlash(scene, display, facing, {
      variant: options.variant,
      attackStyle: options.attackStyle,
    })
    options.onStrike?.()
  })

  scene.time.delayedCall(strikePhaseMs, () => {
    if (display.pose.anim !== 'attack') return
    setPlayerAttackPhase(display, 2)
  })

  scene.time.delayedCall(animEndMs, () => {
    if (display.pose.anim === 'attack') {
      setPlayerToIdle(display, facing)
    }
    options.onComplete?.()
  })
}

const FLINCH_MS = 130

export function playPlayerFlinch(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  facing: Facing,
  knockbackX: number,
  knockbackY: number,
) {
  const container = display.container
  const startX = container.x
  const startY = container.y
  const dist = Math.hypot(knockbackX, knockbackY)
  const nx = dist > 0.01 ? knockbackX / dist : 0
  const ny = dist > 0.01 ? knockbackY / dist : 1
  const bump = 5

  playPlayerAnim(display, 'flinch', facing)

  scene.tweens.add({
    targets: container,
    x: startX + nx * bump,
    y: startY + ny * bump,
    duration: 50,
    yoyo: true,
    onComplete: () => {
      container.setPosition(startX, startY)
      if (display.pose.anim === 'flinch') {
        setPlayerToIdle(display, facing)
      }
    },
  })

  scene.time.delayedCall(FLINCH_MS, () => {
    if (display.pose.anim === 'flinch') {
      setPlayerToIdle(display, facing)
    }
  })
}

export function clearPlayerDeathVisual(display: PlayerDisplay) {
  stopIdleRigTween(display, true)
  display.bodyRig.setAngle(0)
  display.riderLayer.setAngle(0)
  display.bodyRig.setPosition(0, 0)
}

export function playPlayerDeath(scene: Phaser.Scene, display: PlayerDisplay, facing: Facing) {
  const container = display.container
  const startY = container.y

  stopIdleRigTween(display, true)
  display.bodyRig.setAngle(0)
  display.bodyRig.setPosition(0, 0)

  playPlayerAnim(display, 'flinch', facing)

  scene.time.delayedCall(90, () => {
    if (display.pose.anim !== 'flinch' && display.pose.anim !== 'dead') return
    display.pose = { ...display.pose, anim: 'dead', deadFrame: 0 }
    setPlayerDeadFrame(display, 0)
  })

  scene.tweens.add({
    targets: container,
    y: startY + 10,
    duration: 220,
    ease: 'Quad.easeIn',
  })

  scene.time.delayedCall(220, () => {
    if (display.pose.anim !== 'dead' && display.pose.anim !== 'flinch') return
    playPlayerAnim(display, 'dead', facing)
    setPlayerDeadFrame(display, 1)
  })
}
