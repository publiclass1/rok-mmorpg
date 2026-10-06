import Phaser from 'phaser'
import type { Facing } from '../movement/clickToMove'

export type CharacterPartId =
  | 'body'
  | 'legs'
  | 'feet'
  | 'arms'
  | 'head'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'earLeft'
  | 'earRight'

export type CharacterRig = {
  root: Phaser.GameObjects.Container
  parts: Record<CharacterPartId, Phaser.GameObjects.Graphics>
}

export type CharacterPose = {
  facing: Facing
  anim: 'idle' | 'walk' | 'attack' | 'jump' | 'sit'
  walkFrame: 0 | 1
}

const SKIN = 0xfcd34d
const SHIRT = 0x1d4ed8
const PANTS = 0x374151
const SHOES = 0x111827
const HAIR = 0x422006

function clear(g: Phaser.GameObjects.Graphics) {
  g.clear()
}

export function createCharacterRig(scene: Phaser.Scene): CharacterRig {
  const partIds: CharacterPartId[] = [
    'feet',
    'legs',
    'body',
    'arms',
    'head',
    'earLeft',
    'earRight',
    'eyes',
    'nose',
    'mouth',
  ]
  const parts = {} as Record<CharacterPartId, Phaser.GameObjects.Graphics>
  const children: Phaser.GameObjects.GameObject[] = []
  for (const id of partIds) {
    const g = scene.add.graphics()
    parts[id] = g
    children.push(g)
  }
  const root = scene.add.container(0, 0, children)
  applyCharacterPose({ root, parts }, { facing: 'down', anim: 'idle', walkFrame: 0 })
  return { root, parts }
}

export function applyCharacterPose(rig: CharacterRig, pose: CharacterPose) {
  const { parts } = rig
  const sitting = pose.anim === 'sit'
  const walk = pose.anim === 'walk'
  const frame = pose.walkFrame
  const flip = pose.facing === 'left' ? -1 : 1

  clear(parts.feet)
  clear(parts.legs)
  clear(parts.body)
  clear(parts.arms)
  clear(parts.head)
  clear(parts.earLeft)
  clear(parts.earRight)
  clear(parts.eyes)
  clear(parts.nose)
  clear(parts.mouth)

  const legSpread = sitting ? 10 : walk ? (frame === 0 ? 4 : -4) : 3
  const legY = sitting ? 6 : 8
  const legH = sitting ? 8 : 10

  parts.legs.fillStyle(PANTS, 1)
  parts.legs.fillRoundedRect(-8 - legSpread, legY, 6, legH, 2)
  parts.legs.fillRoundedRect(2 + legSpread, legY, 6, legH, 2)

  parts.feet.fillStyle(SHOES, 1)
  const footY = sitting ? legY + legH - 2 : legY + legH
  parts.feet.fillRoundedRect(-9 - legSpread, footY, 7, 4, 1)
  parts.feet.fillRoundedRect(2 + legSpread, footY, 7, 4, 1)

  parts.body.fillStyle(SHIRT, 1)
  if (sitting) {
    parts.body.fillRoundedRect(-9, -2, 18, 12, 3)
  } else {
    parts.body.fillRoundedRect(-8, 0, 16, 14, 3)
  }

  parts.arms.fillStyle(SKIN, 1)
  const armSwing = walk ? (frame === 0 ? -3 : 3) : 0
  if (sitting) {
    parts.arms.fillRoundedRect(-12, 2, 5, 8, 2)
    parts.arms.fillRoundedRect(7, 2, 5, 8, 2)
  } else {
    parts.arms.fillRoundedRect(-13 + armSwing * flip, 2, 5, 10, 2)
    parts.arms.fillRoundedRect(8 - armSwing * flip, 2, 5, 10, 2)
  }

  const headY = sitting ? -10 : -8
  parts.head.fillStyle(SKIN, 1)
  parts.head.fillCircle(0, headY, 7)
  parts.head.fillStyle(HAIR, 1)
  parts.head.fillEllipse(0, headY - 4, 12, 6)

  parts.earLeft.fillStyle(SKIN, 1)
  parts.earRight.fillStyle(SKIN, 1)
  parts.earLeft.fillCircle(-7, headY, 2)
  parts.earRight.fillCircle(7, headY, 2)

  const eyeOffX = pose.facing === 'left' ? -1 : pose.facing === 'right' ? 1 : 0
  parts.eyes.fillStyle(0x111827, 1)
  parts.eyes.fillCircle(-3 + eyeOffX, headY + 1, 1.5)
  parts.eyes.fillCircle(3 + eyeOffX, headY + 1, 1.5)

  parts.nose.fillStyle(0xd97706, 0.85)
  parts.nose.fillCircle(eyeOffX, headY + 3, 1)

  parts.mouth.lineStyle(1, 0x7c2d12, 0.9)
  if (sitting) {
    parts.mouth.strokeCircle(0, headY + 5, 2)
  } else {
    parts.mouth.beginPath()
    parts.mouth.arc(0, headY + 5, 3, 0.1 * Math.PI, 0.9 * Math.PI, false)
    parts.mouth.strokePath()
  }

  if (pose.facing === 'left') {
    rig.root.setScale(-1, 1)
  } else {
    rig.root.setScale(1, 1)
  }
}
