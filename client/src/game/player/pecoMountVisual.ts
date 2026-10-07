import Phaser from 'phaser'
import type { CharacterPose } from '../character/characterPose'
import type { Facing } from '../movement/clickToMove'
import type { PlayerDisplay } from './playerSprites'

/** Peco feet sit on the player container origin (ground feet). */
export const PECO_MOUNT_LOCAL_Y = 0

const BODY = 0x65a30d
const BODY_LIGHT = 0x84cc16
const BODY_DARK = 0x4d7c0f
const SCALE = 0x78716c
const TALON = 0xea580c
const BEAK = 0xfacc15
const EYE = 0x1c1917
const SADDLE = 0x57534e

export type PecoMountGfx = Phaser.GameObjects.Graphics

export function createPecoMount(scene: Phaser.Scene): PecoMountGfx {
  const gfx = scene.add.graphics()
  gfx.setVisible(false)
  return gfx
}

export function attachPecoMountToDisplay(display: PlayerDisplay, pecoGfx: PecoMountGfx) {
  const container = display.container
  if (pecoGfx.parentContainer === container) return
  container.addAt(pecoGfx, 0)
  pecoGfx.setPosition(0, PECO_MOUNT_LOCAL_Y)
}

function drawScalyLeg(g: Phaser.GameObjects.Graphics, x: number, footY: number) {
  g.fillStyle(SCALE, 1)
  g.fillRoundedRect(x - 3, footY - 10, 6, 10, 2)
  g.fillStyle(TALON, 1)
  g.fillTriangle(x - 4, footY, x, footY + 3, x + 4, footY)
}

function drawPecoFront(g: Phaser.GameObjects.Graphics, walkStep: 0 | 1, walking: boolean) {
  const liftL = walking && walkStep === 0 ? -3 : 0
  const liftR = walking && walkStep === 1 ? -3 : 0

  g.fillStyle(BODY_DARK, 1)
  g.fillEllipse(0, -14, 18, 20)
  g.fillStyle(BODY, 1)
  g.fillEllipse(0, -15, 14, 16)

  g.fillStyle(SADDLE, 1)
  g.fillRoundedRect(-8, -24, 16, 5, 2)

  g.fillStyle(BODY_LIGHT, 1)
  g.fillCircle(0, -30, 8)
  g.fillStyle(EYE, 1)
  g.fillCircle(-2, -31, 1.5)
  g.fillCircle(2, -31, 1.5)
  g.fillStyle(BEAK, 1)
  g.fillTriangle(-3, -27, 3, -27, 0, -23)

  drawScalyLeg(g, -7, liftL)
  drawScalyLeg(g, 7, liftR)
}

function drawPecoBack(g: Phaser.GameObjects.Graphics, walkStep: 0 | 1, walking: boolean) {
  const liftL = walking && walkStep === 1 ? -3 : 0
  const liftR = walking && walkStep === 0 ? -3 : 0

  g.fillStyle(BODY_DARK, 1)
  g.fillEllipse(0, -14, 18, 20)
  g.fillStyle(BODY, 1)
  g.fillEllipse(0, -15, 14, 16)

  g.fillStyle(SADDLE, 1)
  g.fillRoundedRect(-8, -24, 16, 5, 2)

  g.fillStyle(BODY_LIGHT, 1)
  g.fillEllipse(0, -30, 9, 7)
  g.fillStyle(TALON, 1)
  g.fillTriangle(-4, -26, 0, -22, 4, -26)

  drawScalyLeg(g, -7, liftL)
  drawScalyLeg(g, 7, liftR)
}

function drawPecoSide(
  g: Phaser.GameObjects.Graphics,
  facing: 'left' | 'right',
  walkStep: 0 | 1,
  walking: boolean,
) {
  const dir = facing === 'right' ? 1 : -1
  const backLift = walking && walkStep === 0 ? -3 : 0
  const frontLift = walking && walkStep === 1 ? -3 : 0

  g.fillStyle(BODY_DARK, 1)
  g.fillEllipse(-2 * dir, -15, 12, 20)
  g.fillStyle(BODY, 1)
  g.fillEllipse(-1 * dir, -16, 10, 17)

  g.fillStyle(TALON, 1)
  g.fillTriangle(-14 * dir, -10, -18 * dir, -6, -12 * dir, -8)

  g.fillStyle(BODY_LIGHT, 1)
  const neckX = dir > 0 ? 1 : -6
  g.fillRect(neckX, -24, 5, 6)
  g.fillCircle(9 * dir, -28, 7)

  g.fillStyle(EYE, 1)
  g.fillCircle(7 * dir, -29, 1.5)
  g.fillStyle(BEAK, 1)
  g.fillTriangle(12 * dir, -28, 16 * dir, -27, 13 * dir, -25)

  const saddleX = dir > 0 ? -7 : -3
  g.fillStyle(SADDLE, 1)
  g.fillRoundedRect(saddleX, -26, 10, 4, 1)

  drawScalyLeg(g, -5 * dir, backLift)
  drawScalyLeg(g, 3 * dir, frontLift)
}

export function drawPecoMount(
  g: Phaser.GameObjects.Graphics,
  facing: Facing,
  walkStep: 0 | 1,
  anim: CharacterPose['anim'],
) {
  g.clear()
  const walking = anim === 'walk'

  if (facing === 'down') {
    drawPecoFront(g, walkStep, walking)
  } else if (facing === 'up') {
    drawPecoBack(g, walkStep, walking)
  } else {
    drawPecoSide(g, facing, walkStep, walking)
  }
}

export function syncPecoMountGfx(
  pecoGfx: PecoMountGfx,
  visible: boolean,
  facing: Facing,
  anim: CharacterPose['anim'],
  walkFrame: 0 | 1,
) {
  pecoGfx.setVisible(visible)
  if (!visible) return
  const walkStep = anim === 'walk' ? walkFrame : 0
  drawPecoMount(pecoGfx, facing, walkStep, anim)
}
