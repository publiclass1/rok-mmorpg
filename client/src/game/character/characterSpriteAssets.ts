import Phaser from 'phaser'
import {
  KAFRA_SPRITE,
  PLAYER_SPRITE_FEMALE,
  PLAYER_SPRITE_MALE,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  type CharacterSpriteDef,
} from './characterSpriteRegistry'

/** Source colors in master sheets — replaced by palette swap for players. */
export const PALETTE_SOURCE = {
  skin: 0xff00ff,
  hair: 0x00ff00,
  shirt: 0x0000ff,
  pants: 0xff0000,
  shoes: 0x00ffff,
  eyes: 0xffff00,
} as const

type FrameMotion = {
  kind: 'idle' | 'walk'
  walkStep: number
  /** NPC idle frame 1: eyes closed, body unchanged */
  idleBlink?: boolean
}

function drawArms(
  g: Phaser.GameObjects.Graphics,
  skin: number,
  cx: number,
  feetY: number,
  bodyW: number,
  facing: 'down' | 'left' | 'right' | 'up',
  armSwing: number,
) {
  g.fillStyle(skin, 1)
  const torsoTop = feetY - 28
  const armH = 10
  const armW = 4

  if (facing === 'down') {
    g.fillRect(cx - bodyW / 2 - armW - 1, torsoTop + 2 + armSwing, armW, armH)
    g.fillRect(cx + bodyW / 2 + 1, torsoTop + 2 - armSwing, armW, armH)
  } else if (facing === 'left') {
    g.fillRect(cx - bodyW / 2 - 2, torsoTop + 3, armW, armH)
    g.fillRect(cx + bodyW / 2 - 6, torsoTop + 4, armW, armH - 2)
  } else if (facing === 'right') {
    g.fillRect(cx - bodyW / 2 + 2, torsoTop + 4, armW, armH - 2)
    g.fillRect(cx + bodyW / 2 - armW + 2, torsoTop + 3, armW, armH)
  } else {
    g.fillRect(cx - bodyW / 2 + 1, torsoTop + 4, armW - 1, armH - 2)
    g.fillRect(cx + bodyW / 2 - armW, torsoTop + 4, armW - 1, armH - 2)
  }
}

function drawChibiFrame(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  facing: 'down' | 'left' | 'right' | 'up',
  motion: FrameMotion,
  female: boolean,
  kafra: boolean,
) {
  const skin = kafra ? 0xffdbac : PALETTE_SOURCE.skin
  const hair = kafra ? 0xec4899 : PALETTE_SOURCE.hair
  const shirt = kafra ? 0x1d4ed8 : PALETTE_SOURCE.shirt
  const pants = kafra ? 0x1e3a8a : PALETTE_SOURCE.pants
  const shoes = kafra ? 0x111827 : PALETTE_SOURCE.shoes
  const eyes = kafra ? 0x111827 : PALETTE_SOURCE.eyes

  const walkStep = motion.kind === 'walk' ? motion.walkStep : 0
  const legSpread =
    motion.kind === 'walk'
      ? walkStep === 0
        ? 2
        : walkStep === 1
          ? 5
          : walkStep === 2
            ? -2
            : -5
      : 2
  const bob = motion.kind === 'walk' && walkStep % 2 === 1 ? -1 : 0
  const armSwing =
    motion.kind === 'walk' ? (walkStep === 0 || walkStep === 2 ? -2 : 2) : 0

  const cx = ox + SPRITE_FRAME_WIDTH / 2
  const feetY = oy + SPRITE_FRAME_HEIGHT - 4 + bob
  const bodyW = female ? 18 : 20

  g.fillStyle(shoes, 1)
  g.fillRect(cx - 10 - legSpread, feetY - 4, 8, 4)
  g.fillRect(cx + 2 + legSpread, feetY - 4, 8, 4)

  g.fillStyle(pants, 1)
  g.fillRect(cx - 9 - legSpread, feetY - 14, 7, 12)
  g.fillRect(cx + 2 + legSpread, feetY - 14, 7, 12)

  g.fillStyle(shirt, 1)
  g.fillRoundedRect(cx - bodyW / 2, feetY - 28, bodyW, 16, 3)
  if (kafra) {
    g.fillStyle(0xffffff, 1)
    g.fillRect(cx - 6, feetY - 26, 12, 12)
    g.fillStyle(0xdc2626, 1)
    g.fillRect(cx - 2, feetY - 22, 4, 4)
  }

  drawArms(g, skin, cx, feetY, bodyW, facing, armSwing)

  g.fillStyle(skin, 1)
  g.fillCircle(cx, feetY - 34, female ? 7 : 8)

  g.fillStyle(hair, 1)
  if (kafra) {
    g.fillEllipse(cx, feetY - 38, 16, 10)
  } else if (female) {
    g.fillEllipse(cx, feetY - 38, 18, 10)
  } else {
    g.fillEllipse(cx, feetY - 39, 14, 8)
  }

  let eyeDx = 0
  if (facing === 'left') eyeDx = -2
  if (facing === 'right') eyeDx = 2

  const blink = motion.idleBlink === true
  if (!blink) {
    g.fillStyle(eyes, 1)
    g.fillRect(cx - 4 + eyeDx, feetY - 35, 2, 2)
    g.fillRect(cx + 2 + eyeDx, feetY - 35, 2, 2)
  }
}

function motionForColumn(
  def: CharacterSpriteDef,
  col: number,
  kafra: boolean,
): FrameMotion {
  if (
    col >= def.strips.idle.offset &&
    col < def.strips.idle.offset + def.strips.idle.count
  ) {
    const idleIndex = col - def.strips.idle.offset
    return {
      kind: 'idle',
      walkStep: 0,
      idleBlink: kafra && idleIndex === 1,
    }
  }
  if (col >= def.strips.walk.offset && col < def.strips.walk.offset + def.strips.walk.count) {
    return { kind: 'walk', walkStep: col - def.strips.walk.offset }
  }
  return { kind: 'idle', walkStep: 0 }
}

function generateSheet(
  scene: Phaser.Scene,
  textureKey: string,
  def: CharacterSpriteDef,
  options: { female: boolean; kafra: boolean },
) {
  if (scene.textures.exists(textureKey)) return

  const cols = def.framesPerRow
  const rows = 4
  const w = cols * SPRITE_FRAME_WIDTH
  const h = rows * SPRITE_FRAME_HEIGHT
  const g = scene.add.graphics()

  const facings: Array<'down' | 'left' | 'right' | 'up'> = ['down', 'left', 'right', 'up']
  for (let row = 0; row < rows; row++) {
    const facing = facings[row]
    for (let col = 0; col < cols; col++) {
      const ox = col * SPRITE_FRAME_WIDTH
      const oy = row * SPRITE_FRAME_HEIGHT
      const motion = motionForColumn(def, col, options.kafra)
      drawChibiFrame(g, ox, oy, facing, motion, options.female, options.kafra)
    }
  }

  g.generateTexture(textureKey, w, h)
  g.destroy()

  addSpriteSheetFrames(scene, textureKey, def)
}

export function ensureMasterCharacterSheets(scene: Phaser.Scene) {
  generateSheet(scene, PLAYER_SPRITE_MALE.masterTextureKey, PLAYER_SPRITE_MALE, {
    female: false,
    kafra: false,
  })
  generateSheet(scene, PLAYER_SPRITE_FEMALE.masterTextureKey, PLAYER_SPRITE_FEMALE, {
    female: true,
    kafra: false,
  })
  generateSheet(scene, KAFRA_SPRITE.masterTextureKey, KAFRA_SPRITE, {
    female: true,
    kafra: true,
  })
}

export function addSpriteSheetFrames(scene: Phaser.Scene, textureKey: string, def: CharacterSpriteDef) {
  if (!scene.textures.exists(textureKey)) return
  const tex = scene.textures.get(textureKey)
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST)
  const cols = def.framesPerRow
  const rows = 4
  const totalFrames = cols * rows
  for (let i = 0; i < totalFrames; i++) {
    const col = i % cols
    const r = Math.floor(i / cols)
    if (!tex.has(`${i}`)) {
      tex.add(`${i}`, 0, col * SPRITE_FRAME_WIDTH, r * SPRITE_FRAME_HEIGHT, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT)
    }
  }
}
