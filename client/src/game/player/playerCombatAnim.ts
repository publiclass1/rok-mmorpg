import Phaser from 'phaser'
import { playPlayerAttackSlash } from '../combat/combatFx'
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

export function startPlayerAttackAnim(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  facing: Facing,
  options: {
    variant: AttackVariant
    attackStyle: AttackStyle
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

  scene.time.delayedCall(WINDUP_MS, () => {
    if (display.pose.anim !== 'attack') return
    setPlayerAttackPhase(display, 1)
    playPlayerAttackSlash(scene, display, facing, {
      variant: options.variant,
      attackStyle: options.attackStyle,
    })
    options.onStrike?.()
  })

  scene.time.delayedCall(STRIKE_MS, () => {
    if (display.pose.anim !== 'attack') return
    setPlayerAttackPhase(display, 2)
  })

  scene.time.delayedCall(END_MS, () => {
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
