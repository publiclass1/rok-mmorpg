import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'

export const FALCON_BODY = 0x1e293b
export const FALCON_BODY_DARK = 0x0f172a
export const FALCON_BREAST = 0x64748b
export const FALCON_BEAK = 0xfbbf24
export const FALCON_TALON = 0xef4444
export const FALCON_EYE = 0xf8fafc

export type FalconCompanionContainer = Phaser.GameObjects.Container & {
  falconGfx: Phaser.GameObjects.Graphics
}

/** wingPhase 0–1: perched (0) through mid-flap (0.5) to full extension (1). */
export function drawFalconSideView(
  g: Phaser.GameObjects.Graphics,
  facing: Facing,
  wingPhase: number,
) {
  g.clear()
  const flap = Math.max(0, Math.min(1, wingPhase))
  const wingLift = flap * 14
  const wingSpread = flap * 6

  if (facing === 'down' || facing === 'up') {
    g.fillStyle(FALCON_BODY_DARK, 1)
    g.fillEllipse(0, 0, 16, 10)
    g.fillStyle(FALCON_BREAST, 0.85)
    g.fillEllipse(0, 1, 8, 6)
    g.fillStyle(FALCON_BODY, 1)
    g.fillEllipse(-10 - wingSpread, -4 - wingLift * 0.25, 12 + wingSpread * 0.4, 5 + wingLift * 0.15)
    g.fillEllipse(10 + wingSpread, -4 - wingLift * 0.25, 12 + wingSpread * 0.4, 5 + wingLift * 0.15)
    g.fillStyle(FALCON_BEAK, 1)
    g.fillTriangle(0, facing === 'down' ? 6 : -6, -3, facing === 'down' ? 2 : -2, 3, facing === 'down' ? 2 : -2)
    return
  }

  const dir = facing === 'right' ? 1 : -1

  g.fillStyle(FALCON_BODY_DARK, 1)
  g.fillEllipse(-2 * dir, 2, 14, 8)
  g.fillStyle(FALCON_BREAST, 0.9)
  g.fillEllipse(0, 3, 8, 5)

  g.fillStyle(FALCON_BODY, 1)
  g.fillTriangle(
    -4 * dir,
    0,
    -18 * dir - wingLift * dir,
    -10 - wingLift,
    -11 * dir,
    2,
  )
  g.fillTriangle(
    -4 * dir,
    0,
    -18 * dir - wingLift * dir,
    12 + wingLift,
    -11 * dir,
    2,
  )

  g.fillStyle(FALCON_BODY_DARK, 1)
  g.fillTriangle(6 * dir, 2, 12 * dir, 4, 8 * dir, 6)

  g.fillStyle(FALCON_BODY, 1)
  g.fillCircle(8 * dir, -4, 5)
  g.fillStyle(FALCON_EYE, 1)
  g.fillCircle(9 * dir, -5, 1.5)
  g.fillStyle(FALCON_BEAK, 1)
  g.fillTriangle(12 * dir, -4, 16 * dir, -3, 13 * dir, -1)

  g.fillStyle(FALCON_TALON, 1)
  g.lineStyle(1, FALCON_TALON, 1)
  g.lineBetween(2 * dir, 6, 0, 10)
  g.lineBetween(4 * dir, 6, 5 * dir, 10)
}

export function createFalconGraphicsContainer(scene: Phaser.Scene): FalconCompanionContainer {
  const gfx = scene.add.graphics()
  const container = scene.add.container(0, 0, [gfx]) as FalconCompanionContainer
  container.falconGfx = gfx
  container.setVisible(false)
  return container
}
