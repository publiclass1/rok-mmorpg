import Phaser from 'phaser'
import {
  listNpcSpriteDefs,
  PLAYER_SPRITE_FEMALE,
  PLAYER_SPRITE_MALE,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  type CharacterSpriteDef,
} from './characterSpriteRegistry'
import {
  NPC_ARCHETYPE_PALETTES,
  type NpcArchetype,
} from './npcArchetypes'

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
  idleBlink?: boolean
}

type DrawMode = { kind: 'player'; female: boolean } | { kind: 'npc'; archetype: NpcArchetype }

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

function drawArchetypeOverlay(
  g: Phaser.GameObjects.Graphics,
  archetype: NpcArchetype,
  cx: number,
  feetY: number,
) {
  switch (archetype) {
    case 'kafra':
      g.fillStyle(0xffffff, 1)
      g.fillRect(cx - 6, feetY - 26, 12, 12)
      g.fillStyle(0xdc2626, 1)
      g.fillRect(cx - 2, feetY - 22, 4, 4)
      break
    case 'warp_agent':
      g.fillStyle(0x6d28d9, 0.85)
      g.fillTriangle(cx - 14, feetY - 24, cx, feetY - 38, cx + 14, feetY - 24)
      break
    case 'save_priest':
      g.fillStyle(0xfbbf24, 1)
      g.fillRect(cx - 1, feetY - 30, 2, 8)
      g.fillRect(cx - 3, feetY - 27, 6, 2)
      break
    case 'job_master':
      g.fillStyle(0xfcd34d, 1)
      g.fillRect(cx - 4, feetY - 24, 8, 2)
      break
    case 'merchant':
      g.fillStyle(0x166534, 1)
      g.fillRect(cx - 7, feetY - 25, 14, 8)
      g.fillStyle(0xca8a04, 1)
      g.fillRect(cx - 5, feetY - 23, 10, 4)
      break
    case 'healer':
      g.fillStyle(0xf472b6, 1)
      g.fillRect(cx - 1, feetY - 26, 2, 6)
      g.fillRect(cx - 3, feetY - 24, 6, 2)
      break
  }
}

function drawChibiFrame(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  facing: 'down' | 'left' | 'right' | 'up',
  motion: FrameMotion,
  mode: DrawMode,
) {
  const isPlayer = mode.kind === 'player'
  const female = isPlayer ? mode.female : NPC_ARCHETYPE_PALETTES[mode.archetype].female
  const pal = isPlayer
    ? {
        skin: PALETTE_SOURCE.skin,
        hair: PALETTE_SOURCE.hair,
        shirt: PALETTE_SOURCE.shirt,
        pants: PALETTE_SOURCE.pants,
        shoes: PALETTE_SOURCE.shoes,
        eyes: PALETTE_SOURCE.eyes,
      }
    : NPC_ARCHETYPE_PALETTES[mode.archetype]

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

  g.fillStyle(pal.shoes, 1)
  g.fillRect(cx - 10 - legSpread, feetY - 4, 8, 4)
  g.fillRect(cx + 2 + legSpread, feetY - 4, 8, 4)

  g.fillStyle(pal.pants, 1)
  g.fillRect(cx - 9 - legSpread, feetY - 14, 7, 12)
  g.fillRect(cx + 2 + legSpread, feetY - 14, 7, 12)

  g.fillStyle(pal.shirt, 1)
  g.fillRoundedRect(cx - bodyW / 2, feetY - 28, bodyW, 16, 3)
  if (!isPlayer) {
    drawArchetypeOverlay(g, mode.archetype, cx, feetY)
  }

  drawArms(g, pal.skin, cx, feetY, bodyW, facing, armSwing)

  g.fillStyle(pal.skin, 1)
  g.fillCircle(cx, feetY - 34, female ? 7 : 8)

  g.fillStyle(pal.hair, 1)
  if (female) {
    g.fillEllipse(cx, feetY - 38, femaleHairWidth(mode), 10)
  } else {
    g.fillEllipse(cx, feetY - 39, 14, 8)
  }

  let eyeDx = 0
  if (facing === 'left') eyeDx = -2
  if (facing === 'right') eyeDx = 2

  const blink = motion.idleBlink === true
  if (!blink) {
    g.fillStyle(pal.eyes, 1)
    g.fillRect(cx - 4 + eyeDx, feetY - 35, 2, 2)
    g.fillRect(cx + 2 + eyeDx, feetY - 35, 2, 2)
  }
}

function femaleHairWidth(mode: DrawMode): number {
  if (mode.kind === 'npc' && mode.archetype === 'kafra') return 16
  if (mode.kind === 'player' && mode.female) return 18
  return 16
}

function motionForColumn(def: CharacterSpriteDef, col: number, npcSheet: boolean): FrameMotion {
  if (
    col >= def.strips.idle.offset &&
    col < def.strips.idle.offset + def.strips.idle.count
  ) {
    const idleIndex = col - def.strips.idle.offset
    return {
      kind: 'idle',
      walkStep: 0,
      idleBlink: npcSheet && idleIndex === 1,
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
  mode: DrawMode,
) {
  if (scene.textures.exists(textureKey)) return

  const cols = def.framesPerRow
  const rows = 4
  const w = cols * SPRITE_FRAME_WIDTH
  const h = rows * SPRITE_FRAME_HEIGHT
  const g = scene.add.graphics()
  const npcSheet = mode.kind === 'npc'

  const facings: Array<'down' | 'left' | 'right' | 'up'> = ['down', 'left', 'right', 'up']
  for (let row = 0; row < rows; row++) {
    const facing = facings[row]
    for (let col = 0; col < cols; col++) {
      const ox = col * SPRITE_FRAME_WIDTH
      const oy = row * SPRITE_FRAME_HEIGHT
      const motion = motionForColumn(def, col, npcSheet)
      drawChibiFrame(g, ox, oy, facing, motion, mode)
    }
  }

  g.generateTexture(textureKey, w, h)
  g.destroy()

  addSpriteSheetFrames(scene, textureKey, def)
}

export function ensureMasterCharacterSheets(scene: Phaser.Scene) {
  generateSheet(scene, PLAYER_SPRITE_MALE.masterTextureKey, PLAYER_SPRITE_MALE, {
    kind: 'player',
    female: false,
  })
  generateSheet(scene, PLAYER_SPRITE_FEMALE.masterTextureKey, PLAYER_SPRITE_FEMALE, {
    kind: 'player',
    female: true,
  })
  for (const def of listNpcSpriteDefs()) {
    if (!def.npcArchetype) continue
    generateSheet(scene, def.masterTextureKey, def, {
      kind: 'npc',
      archetype: def.npcArchetype,
    })
  }
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
