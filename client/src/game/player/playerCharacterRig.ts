import {
  DEFAULT_CHARACTER_APPEARANCE,
  resolveAppearanceColors,
  type CharacterAppearance,
} from '../character/characterAppearance'
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
  anim: 'idle' | 'walk' | 'attack' | 'jump' | 'sit' | 'flinch'
  walkFrame: 0 | 1
  attackPhase: 0 | 1 | 2
  bash: boolean
  hitFlash: boolean
}

export function defaultCharacterPose(facing: Facing = 'down'): CharacterPose {
  return {
    facing,
    anim: 'idle',
    walkFrame: 0,
    attackPhase: 0,
    bash: false,
    hitFlash: false,
  }
}

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
  applyCharacterPose({ root, parts }, defaultCharacterPose())
  return { root, parts }
}

export function applyCharacterPose(
  rig: CharacterRig,
  pose: CharacterPose,
  appearance: CharacterAppearance = DEFAULT_CHARACTER_APPEARANCE,
) {
  const { parts } = rig
  const colors = resolveAppearanceColors(appearance)
  const female = appearance.gender === 'female'
  const bodyHalfW = female ? 7 : 8
  const bodyW = bodyHalfW * 2
  const hairW = female ? 13 : 12

  const sitting = pose.anim === 'sit'
  const walk = pose.anim === 'walk'
  const jumping = pose.anim === 'jump'
  const attacking = pose.anim === 'attack'
  const flinching = pose.anim === 'flinch'
  const frame = pose.walkFrame
  const flip = pose.facing === 'left' ? -1 : 1
  const attackPhase = pose.attackPhase

  const shirtColor = pose.hitFlash ? 0xf87171 : colors.shirt
  const skinColor = pose.hitFlash ? 0xfca5a5 : colors.skin

  rig.root.setPosition(0, jumping ? -6 : 0)

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

  let legSpread = sitting ? 10 : walk ? (frame === 0 ? 4 : -4) : 3
  let legY = sitting ? 6 : 8
  let legH = sitting ? 8 : 10

  if (jumping) {
    legSpread = 6
    legY = 10
    legH = 6
  } else if (flinching) {
    legSpread = 5
    legY = 9
  }

  parts.legs.fillStyle(colors.pants, 1)
  parts.legs.fillRoundedRect(-8 - legSpread, legY, 6, legH, 2)
  parts.legs.fillRoundedRect(2 + legSpread, legY, 6, legH, 2)

  parts.feet.fillStyle(colors.shoes, 1)
  const footY = sitting ? legY + legH - 2 : legY + legH
  parts.feet.fillRoundedRect(-9 - legSpread, footY, 7, 4, 1)
  parts.feet.fillRoundedRect(2 + legSpread, footY, 7, 4, 1)

  parts.body.fillStyle(shirtColor, 1)
  if (sitting) {
    parts.body.fillRoundedRect(-bodyHalfW - 1, -2, bodyW + 2, 12, 3)
  } else if (jumping) {
    parts.body.fillRoundedRect(-bodyHalfW, 2, bodyW, 11, 3)
  } else {
    const bodyY = attacking && attackPhase === 0 ? 1 : 0
    parts.body.fillRoundedRect(-bodyHalfW, bodyY, bodyW, 14, 3)
  }

  parts.arms.fillStyle(skinColor, 1)
  let armSwing = walk ? (frame === 0 ? -3 : 3) : 0

  if (sitting) {
    parts.arms.fillRoundedRect(-12, 2, 5, 8, 2)
    parts.arms.fillRoundedRect(7, 2, 5, 8, 2)
  } else if (flinching) {
    parts.arms.fillRoundedRect(-11, 0, 5, 9, 2)
    parts.arms.fillRoundedRect(6, 0, 5, 9, 2)
  } else if (attacking) {
    const strikeReach = pose.bash ? 16 : 12
    if (attackPhase === 0) {
      parts.arms.fillRoundedRect(-15 + armSwing * flip, 4, 5, 8, 2)
      parts.arms.fillRoundedRect(6 - armSwing * flip, 1, 5, 10, 2)
    } else if (attackPhase === 1) {
      parts.arms.fillRoundedRect(-14, 3, 5, 9, 2)
      parts.arms.fillRoundedRect(strikeReach - 2, -1, 6, 12, 2)
    } else {
      parts.arms.fillRoundedRect(-13 + armSwing * flip, 2, 5, 10, 2)
      parts.arms.fillRoundedRect(8 - armSwing * flip, 2, 5, 10, 2)
    }
  } else {
    parts.arms.fillRoundedRect(-13 + armSwing * flip, 2, 5, 10, 2)
    parts.arms.fillRoundedRect(8 - armSwing * flip, 2, 5, 10, 2)
  }

  let headY = sitting ? -10 : -8
  if (flinching) headY = -6
  if (jumping) headY = -5

  parts.head.fillStyle(skinColor, 1)
  parts.head.fillCircle(0, headY, 7)
  parts.head.fillStyle(colors.hair, 1)
  if (female) {
    parts.head.fillEllipse(0, headY - 3, hairW, 8)
  } else {
    parts.head.fillEllipse(0, headY - 4, hairW, 6)
  }

  parts.earLeft.fillStyle(skinColor, 1)
  parts.earRight.fillStyle(skinColor, 1)
  parts.earLeft.fillCircle(-7, headY, 2)
  parts.earRight.fillCircle(7, headY, 2)

  const eyeOffX = pose.facing === 'left' ? -1 : pose.facing === 'right' ? 1 : 0
  parts.eyes.fillStyle(colors.eyes, 1)
  parts.eyes.fillCircle(-3 + eyeOffX, headY + 1, 1.5)
  parts.eyes.fillCircle(3 + eyeOffX, headY + 1, 1.5)

  parts.nose.fillStyle(0xd97706, 0.85)
  parts.nose.fillCircle(eyeOffX, headY + 3, 1)

  parts.mouth.lineStyle(1, 0x7c2d12, 0.9)
  if (sitting) {
    parts.mouth.strokeCircle(0, headY + 5, 2)
  } else if (flinching) {
    parts.mouth.strokeCircle(0, headY + 5, 1.5)
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
