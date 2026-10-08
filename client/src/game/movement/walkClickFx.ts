import Phaser from 'phaser'
import { setDepthByFeet } from '../world/depthSort'
import { attachToWorldRoot } from '../world/worldViewRootAttach'

const RING_COLOR = 0x4ade80
const RING_STROKE = 0x86efac
const PIN_COLOR = 0xbbf7d0

/** One-shot ground destination marker (expanding ring + small pin), MMO-style. */
export function playWalkClickFx(scene: Phaser.Scene, x: number, y: number) {
  const depthY = y
  const depthEpsilon = -0.12

  const ring = scene.add.ellipse(x, y, 28, 20, RING_COLOR, 0.35)
  ring.setStrokeStyle(2, RING_STROKE, 0.9)
  setDepthByFeet(ring, depthY, depthEpsilon)
  attachToWorldRoot(scene, ring)

  scene.tweens.add({
    targets: ring,
    scaleX: 2.1,
    scaleY: 2.1,
    alpha: 0,
    duration: 320,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  })

  const pin = scene.add.graphics()
  pin.setPosition(x, y - 4)
  setDepthByFeet(pin, depthY, depthEpsilon + 0.01)
  attachToWorldRoot(scene, pin)
  pin.lineStyle(2, PIN_COLOR, 0.95)
  pin.beginPath()
  pin.moveTo(-5, -3)
  pin.lineTo(0, 4)
  pin.lineTo(5, -3)
  pin.closePath()
  pin.strokePath()

  const pinStartY = y - 4
  scene.tweens.add({
    targets: pin,
    y: pinStartY + 8,
    duration: 140,
    ease: 'Quad.easeOut',
    yoyo: true,
  })
  scene.tweens.add({
    targets: pin,
    alpha: 0,
    duration: 280,
    ease: 'Sine.easeOut',
    onComplete: () => pin.destroy(),
  })
}
