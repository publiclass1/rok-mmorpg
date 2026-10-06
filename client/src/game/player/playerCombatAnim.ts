import Phaser from 'phaser'
import { playPlayerAttackSlash } from '../combat/combatFx'
import type { Facing } from '../movement/clickToMove'
import {
  playPlayerAnim,
  setPlayerAttackPhase,
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
    bash,
    hitFlash: false,
  }
  setPlayerAttackPhase(display, 0)

  scene.time.delayedCall(WINDUP_MS, () => {
    if (display.pose.anim !== 'attack') return
    setPlayerAttackPhase(display, 1)
    playPlayerAttackSlash(scene, display, facing, { variant: options.variant })
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
