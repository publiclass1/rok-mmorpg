import type Phaser from 'phaser'
import type { CharacterPose } from '../character/characterPose'
import { MAP_TILE_SIZE } from '../combat/playerAttackRange'
import type { Facing } from '../movement/clickToMove'
import {
  createFalconGraphicsContainer,
  drawFalconSideView,
  type FalconCompanionContainer,
} from './falconSilhouette'
import type { PlayerDisplay } from './playerSprites'

const BLITZ_COMPANION_STRIKE_STAGGER_MS = 100

export const FALCON_TILES_ABOVE_HEAD = 4
export const FALCON_HEAD_CLEARANCE_PX = 26

export const FALCON_HOVER_OFFSET_Y = -(
  FALCON_HEAD_CLEARANCE_PX + FALCON_TILES_ABOVE_HEAD * MAP_TILE_SIZE
)

export type FalconCompanionGfx = FalconCompanionContainer

export function createFalconCompanion(scene: Phaser.Scene): FalconCompanionGfx {
  return createFalconGraphicsContainer(scene)
}

export function attachFalconCompanionToDisplay(display: PlayerDisplay, falcon: FalconCompanionGfx) {
  const container = display.container
  if (falcon.parentContainer === container) return
  container.add(falcon)
  falcon.setPosition(0, FALCON_HOVER_OFFSET_Y)
}

/** 0–1 wing phase for perched / idle hover (exported for tests). */
export function falconCompanionWingPhase(timeMs: number, anim: CharacterPose['anim']): number {
  const flapHz = anim === 'walk' ? 0.014 : 0.02
  const raw = Math.abs(Math.sin(timeMs * flapHz))
  return raw ** 0.75
}

export function syncFalconCompanionGfx(
  falcon: FalconCompanionGfx,
  visible: boolean,
  facing: Facing,
  anim: CharacterPose['anim'],
  walkFrame: 0 | 1,
  timeMs: number,
) {
  falcon.setVisible(visible)
  if (!visible) return

  const bob = Math.sin(timeMs * 0.004) * 5
  const wingPhase = falconCompanionWingPhase(timeMs, anim)
  const downstrokeLift = Math.max(0, Math.sin(timeMs * (anim === 'walk' ? 0.014 : 0.02))) * 4
  const walkDrift = anim === 'walk' ? (walkFrame === 0 ? -2 : 2) : 0

  falcon.setPosition(walkDrift, FALCON_HOVER_OFFSET_Y + bob + downstrokeLift)
  drawFalconSideView(falcon.falconGfx, facing, wingPhase)
}

export type BlitzFalconCompanionRef = {
  companion: FalconCompanionGfx
  playerContainer: Phaser.GameObjects.Container
  facing: Facing
  onVolleyStart?: () => void
  onVolleyEnd?: () => void
}

function companionWorldPosition(companion: FalconCompanionGfx): { x: number; y: number } {
  const mat = companion.getWorldTransformMatrix()
  return { x: mat.tx, y: mat.ty }
}

function detachCompanionToWorld(
  scene: Phaser.Scene,
  companion: FalconCompanionGfx,
  playerContainer: Phaser.GameObjects.Container,
  depth: number,
): { x: number; y: number } {
  const { x, y } = companionWorldPosition(companion)
  if (companion.parentContainer === playerContainer) {
    playerContainer.remove(companion, false)
  }
  scene.add.existing(companion)
  companion.setPosition(x, y)
  companion.setDepth(depth + 0.05)
  return { x, y }
}

export function reattachFalconCompanionToPlayer(
  companion: FalconCompanionGfx,
  playerContainer: Phaser.GameObjects.Container,
  facing: Facing,
) {
  if (companion.parentContainer !== playerContainer) {
    companion.parentContainer?.remove(companion, false)
    playerContainer.add(companion)
  }
  companion.setPosition(0, FALCON_HOVER_OFFSET_Y)
  drawFalconSideView(companion.falconGfx, facing, 0.35)
  companion.setVisible(true)
}

function tweenCompanionBlitzSwoop(
  scene: Phaser.Scene,
  companion: FalconCompanionGfx,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  onArrive: () => void,
) {
  const dist = Math.hypot(toX - fromX, toY - fromY)
  const duration = Math.min(320, Math.max(100, dist * 2))
  const progress = { t: 0 }
  scene.tweens.add({
    targets: progress,
    t: 1,
    duration,
    ease: 'Sine.easeIn',
    onUpdate: () => {
      const t = progress.t
      const x = fromX + (toX - fromX) * t
      const arcLift = Math.sin(t * Math.PI) * 28
      const y = fromY + (toY - fromY) * t - arcLift
      companion.setPosition(x, y)
      const travelFacing = toX >= x ? 'right' : 'left'
      drawFalconSideView(companion.falconGfx, travelFacing, 0.55)
    },
    onComplete: onArrive,
  })
}

/** Animate the rented falcon (not a duplicate) for each Blitz Beat hit. */
export function playBlitzBeatCompanionVolley(
  scene: Phaser.Scene,
  ref: BlitzFalconCompanionRef,
  aimX: number,
  aimY: number,
  depth: number,
  hitCount: number,
  onHit: (hitIndex: number) => void,
  onVolleyComplete?: () => void,
) {
  const { companion, playerContainer, facing } = ref
  const count = Math.max(1, hitCount)
  let hitIndex = 0

  ref.onVolleyStart?.()

  const finishVolley = () => {
    reattachFalconCompanionToPlayer(companion, playerContainer, facing)
    ref.onVolleyEnd?.()
    onVolleyComplete?.()
  }

  const runNextStrike = () => {
    if (hitIndex >= count) {
      finishVolley()
      return
    }

    const lateral = count === 1 ? 0 : (hitIndex - (count - 1) / 2) * 8
    const hoverY = playerContainer.y + FALCON_HOVER_OFFSET_Y
    const fromPerch = hitIndex === 0 || companion.parentContainer === playerContainer
    const startX = fromPerch ? playerContainer.x + lateral : aimX + lateral
    const startY = fromPerch ? hoverY : aimY - 32

    if (companion.parentContainer === playerContainer) {
      detachCompanionToWorld(scene, companion, playerContainer, depth)
    }
    companion.setVisible(true)
    companion.setPosition(startX, startY)
    const travelFacing = aimX >= startX ? 'right' : 'left'
    drawFalconSideView(companion.falconGfx, travelFacing, 0.55)

    tweenCompanionBlitzSwoop(scene, companion, startX, startY, aimX, aimY, () => {
      onHit(hitIndex)
      hitIndex += 1

      if (hitIndex < count) {
        const hopX = aimX + lateral
        const hopY = aimY - 32
        companion.setPosition(hopX, hopY)
        scene.time.delayedCall(BLITZ_COMPANION_STRIKE_STAGGER_MS, runNextStrike)
        return
      }

      const perch = companionWorldPosition(companion)
      const returnTarget = {
        x: playerContainer.x,
        y: playerContainer.y + FALCON_HOVER_OFFSET_Y,
      }
      const returnDist = Math.hypot(returnTarget.x - perch.x, returnTarget.y - perch.y)
      const returnDuration = Math.min(160, Math.max(70, returnDist * 1.1))
      const progress = { t: 0 }
      scene.tweens.add({
        targets: progress,
        t: 1,
        duration: returnDuration,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const t = progress.t
          const x = perch.x + (returnTarget.x - perch.x) * t
          const arcLift = Math.sin(t * Math.PI) * 16
          const y = perch.y + (returnTarget.y - perch.y) * t - arcLift
          companion.setPosition(x, y)
          drawFalconSideView(companion.falconGfx, returnTarget.x >= x ? 'right' : 'left', 0.45)
        },
        onComplete: () => finishVolley(),
      })
    })
  }

  runNextStrike()
}
