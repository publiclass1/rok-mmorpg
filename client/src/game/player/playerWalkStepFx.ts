import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'
import { setDepthByFeet } from '../world/depthSort'

const DUST_FILL = 0x9ca3af
const DUST_STROKE = 0x6b7280

/** Tiny foot dust when robe jobs step (mage/wizard). */
export function playPlayerWalkStepFx(
  scene: Phaser.Scene,
  feetX: number,
  feetY: number,
  facing: Facing,
  walkFrame: 0 | 1,
) {
  const depthY = feetY
  const depthEpsilon = -0.15

  let offX = walkFrame === 0 ? -5 : 5
  let offY = 2
  if (facing === 'left') {
    offX = walkFrame === 0 ? -7 : -2
    offY = 1
  } else if (facing === 'right') {
    offX = walkFrame === 0 ? 2 : 7
    offY = 1
  } else if (facing === 'up') {
    offX = walkFrame === 0 ? -4 : 4
    offY = 4
  }

  const x = feetX + offX
  const y = feetY + offY

  const puff = scene.add.ellipse(x, y, 10, 5, DUST_FILL, 0.45)
  puff.setStrokeStyle(1, DUST_STROKE, 0.35)
  setDepthByFeet(puff, depthY, depthEpsilon)

  scene.tweens.add({
    targets: puff,
    scaleX: 1.6,
    scaleY: 1.4,
    alpha: 0,
    duration: 160,
    ease: 'Sine.easeOut',
    onComplete: () => puff.destroy(),
  })

  const scuff = scene.add.graphics()
  scuff.setPosition(x, y)
  setDepthByFeet(scuff, depthY, depthEpsilon - 0.01)
  scuff.fillStyle(DUST_FILL, 0.35)
  scuff.fillEllipse(-3, -1, 6, 3)
  scene.tweens.add({
    targets: scuff,
    alpha: 0,
    duration: 140,
    ease: 'Sine.easeOut',
    onComplete: () => scuff.destroy(),
  })
}
