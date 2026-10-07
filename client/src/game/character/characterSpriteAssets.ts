import Phaser from 'phaser'
import type { PlayerAvatarKey } from '../player/playerJobAvatar'
import {
  listNpcSpriteDefs,
  resolvePlayerSpriteDef,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  type AttackStyle,
  type CharacterSpriteDef,
} from './characterSpriteRegistry'
import { DEFAULT_CHARACTER_APPEARANCE, type CharacterGender } from './characterAppearance'
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

type FrameMotion =
  | { kind: 'idle' | 'walk'; walkStep: number; idleBlink?: boolean }
  | { kind: 'sit' }
  | { kind: 'attack'; style: AttackStyle; phase: 0 | 1 | 2 }

type ChibiPalette = {
  skin: number
  hair: number
  shirt: number
  pants: number
  shoes: number
  eyes: number
}

type DrawMode =
  | { kind: 'player'; female: boolean; avatarKey: PlayerAvatarKey }
  | { kind: 'npc'; archetype: NpcArchetype }

const PLATE_GRAY = 0x9ca3af
const KNIGHT_CAPE = 0x5b21b6
const APRON_TAN = 0xd6d3d1
const QUIVER_BROWN = 0x78350f

const WEAPON_BLADE = 0xc0c8d4
const WEAPON_HILT = 0x8b5a2b
const WEAPON_SPEAR = 0x9ca3af
const CAST_GLOW = 0xa78bfa

function drawWeapon(
  g: Phaser.GameObjects.Graphics,
  style: AttackStyle,
  phase: 0 | 1 | 2,
  facing: 'down' | 'left' | 'right' | 'up',
  cx: number,
  feetY: number,
  bodyW: number,
) {
  const torsoTop = feetY - 28
  let wx = cx
  let wy = torsoTop + 6
  const bladeLen = style === 'swing' ? 14 : style === 'thrust' ? 22 : style === 'bow' ? 12 : 10

  if (facing === 'right') {
    wx = cx + bodyW / 2 + (phase === 0 ? -4 : phase === 1 ? 10 : 6)
    wy = torsoTop + (phase === 0 ? 2 : phase === 1 ? 8 : 14)
  } else if (facing === 'left') {
    wx = cx - bodyW / 2 + (phase === 0 ? 4 : phase === 1 ? -10 : -6)
    wy = torsoTop + (phase === 0 ? 2 : phase === 1 ? 8 : 14)
  } else if (facing === 'down') {
    wx = cx + (phase === 0 ? -10 : phase === 1 ? 12 : 8)
    wy = torsoTop + (phase === 0 ? 0 : phase === 1 ? 10 : 16)
  } else {
    wx = cx + (phase === 0 ? 8 : phase === 1 ? -6 : -4)
    wy = torsoTop + (phase === 0 ? 4 : phase === 1 ? -4 : 0)
  }

  g.fillStyle(WEAPON_HILT, 1)
  g.fillRect(wx - 2, wy - 2, 4, 6)

  if (style === 'swing') {
    g.fillStyle(WEAPON_BLADE, 1)
    if (facing === 'left' || facing === 'right') {
      const dir = facing === 'right' ? 1 : -1
      const angle = phase === 0 ? -0.9 : phase === 1 ? 0.2 : 0.7
      const bx = wx + dir * Math.cos(angle) * bladeLen
      const by = wy + Math.sin(angle) * bladeLen
      g.fillTriangle(wx, wy, bx, by, wx + dir * 3, wy + 8)
    } else {
      const sign = facing === 'down' ? 1 : -1
      const angle = phase === 0 ? (sign > 0 ? -1.1 : 1.1) : phase === 1 ? sign * 0.35 : sign * 0.85
      const bx = wx + Math.cos(angle) * bladeLen * 0.55
      const by = wy + sign * Math.sin(Math.abs(angle)) * bladeLen
      g.fillTriangle(wx, wy, bx, by, wx + sign * 3, wy - sign * 2)
    }
  } else if (style === 'thrust') {
    g.fillStyle(WEAPON_SPEAR, 1)
    const ext = phase === 1 ? bladeLen : phase === 0 ? 4 : 10
    if (facing === 'left') g.fillRect(wx - ext, wy, ext, 3)
    else if (facing === 'right') g.fillRect(wx, wy, ext, 3)
    else if (facing === 'down') g.fillRect(wx, wy, 3, ext)
    else g.fillRect(wx, wy - ext, 3, ext)
  } else if (style === 'bow') {
    g.lineStyle(2, WEAPON_HILT, 1)
    g.strokeCircle(wx, wy, phase === 1 ? 10 : 8)
    if (phase >= 1) {
      g.lineStyle(1, 0xe2e8f0, 1)
      g.lineBetween(wx - 8, wy, wx + 8, wy)
    }
  } else {
    g.fillStyle(WEAPON_HILT, 1)
    g.fillRect(wx - 2, wy - (phase === 1 ? 14 : 8), 4, phase === 1 ? 18 : 12)
    if (phase >= 1) {
      g.fillStyle(CAST_GLOW, 0.9)
      g.fillCircle(wx, wy - (phase === 1 ? 16 : 10), phase === 2 ? 4 : 3)
    }
  }
}

function drawArms(
  g: Phaser.GameObjects.Graphics,
  skin: number,
  cx: number,
  feetY: number,
  bodyW: number,
  facing: 'down' | 'left' | 'right' | 'up',
  armSwing: number,
  attack?: { style: AttackStyle; phase: 0 | 1 | 2 },
) {
  g.fillStyle(skin, 1)
  const torsoTop = feetY - 28
  const armH = 10
  const armW = 4

  if (attack) {
    const p = attack.phase
    g.fillStyle(skin, 1)
    if (attack.style === 'thrust') {
      if (facing === 'down') {
        g.fillRect(cx - bodyW / 2 - armW, torsoTop + 2, armW, armH)
        g.fillRect(cx + bodyW / 2 - 2, torsoTop + (p === 1 ? 8 : 2), armW, armH + (p === 1 ? 4 : 0))
      } else if (facing === 'left') {
        g.fillRect(cx - bodyW / 2 - (p === 1 ? 10 : 2), torsoTop + 4, armW + (p === 1 ? 6 : 0), armH)
        g.fillRect(cx + bodyW / 2 - 6, torsoTop + 6, armW, armH - 2)
      } else if (facing === 'right') {
        g.fillRect(cx - bodyW / 2 + 2, torsoTop + 6, armW, armH - 2)
        g.fillRect(
          cx + bodyW / 2 - armW + (p === 1 ? 6 : 0),
          torsoTop + 4,
          armW + (p === 1 ? 6 : 0),
          armH,
        )
      } else {
        g.fillRect(cx - bodyW / 2 + 1, torsoTop + 4, armW - 1, armH - 2)
        g.fillRect(cx + bodyW / 2 - armW, torsoTop + (p === 1 ? -4 : 4), armW - 1, armH - 2)
      }
    } else if (facing === 'down') {
      g.fillRect(cx - bodyW / 2 - armW, torsoTop + (p === 0 ? 0 : 4), armW, armH)
      g.fillRect(cx + bodyW / 2 + 1, torsoTop + (p === 1 ? -2 : 2), armW, armH)
    } else if (facing === 'left') {
      g.fillRect(cx - bodyW / 2 - 2, torsoTop + (p === 1 ? -2 : 3), armW, armH)
      g.fillRect(cx + bodyW / 2 - 6, torsoTop + 5, armW, armH - 2)
    } else if (facing === 'right') {
      g.fillRect(cx - bodyW / 2 + 2, torsoTop + 5, armW, armH - 2)
      g.fillRect(cx + bodyW / 2 - armW + 2, torsoTop + (p === 1 ? -2 : 3), armW, armH)
    } else {
      g.fillRect(cx - bodyW / 2 + 1, torsoTop + (p === 1 ? 0 : 4), armW - 1, armH - 2)
      g.fillRect(cx + bodyW / 2 - armW, torsoTop + 4, armW - 1, armH - 2)
    }
    return
  }

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

function playerBodyWidth(female: boolean, avatarKey: PlayerAvatarKey): number {
  let w = female ? 18 : 20
  if (avatarKey === 'swordman') w += 2
  if (avatarKey === 'knight') w += 4
  return w
}

function drawDefaultLegs(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  feetY: number,
  legSpread: number,
  pal: ChibiPalette,
) {
  g.fillStyle(pal.shoes, 1)
  g.fillRect(cx - 10 - legSpread, feetY - 4, 8, 4)
  g.fillRect(cx + 2 + legSpread, feetY - 4, 8, 4)

  g.fillStyle(pal.pants, 1)
  g.fillRect(cx - 9 - legSpread, feetY - 14, 7, 12)
  g.fillRect(cx + 2 + legSpread, feetY - 14, 7, 12)
}

function drawKnightCape(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  feetY: number,
  bodyW: number,
  facing: 'down' | 'left' | 'right' | 'up',
) {
  if (facing === 'down') return
  g.fillStyle(KNIGHT_CAPE, 0.9)
  if (facing === 'up') {
    g.fillTriangle(cx - bodyW / 2 - 2, feetY - 26, cx, feetY - 34, cx + bodyW / 2 + 2, feetY - 26)
  } else {
    const side = facing === 'left' ? -1 : 1
    g.fillRect(cx + side * (bodyW / 2 + 1), feetY - 28, 5, 18)
  }
}

function drawPlayerJobBody(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
  bodyW: number,
  legSpread: number,
  facing: 'down' | 'left' | 'right' | 'up',
  pal: ChibiPalette,
) {
  if (avatarKey === 'knight') {
    drawKnightCape(g, cx, feetY, bodyW, facing)
  }

  if (avatarKey === 'mage' || avatarKey === 'acolyte') {
    g.fillStyle(pal.shoes, 1)
    g.fillRect(cx - 6, feetY - 4, 12, 4)
    g.fillStyle(pal.shirt, 1)
    g.fillRoundedRect(cx - bodyW / 2 - 1, feetY - 30, bodyW + 2, 30, 3)
    if (avatarKey === 'acolyte') {
      g.fillStyle(0xf8fafc, 1)
      g.fillRect(cx - 2, feetY - 24, 4, 4)
    }
    return
  }

  drawDefaultLegs(g, cx, feetY, legSpread, pal)

  g.fillStyle(pal.shirt, 1)
  g.fillRoundedRect(cx - bodyW / 2, feetY - 28, bodyW, 16, 3)

  switch (avatarKey) {
    case 'swordman':
      g.fillStyle(PLATE_GRAY, 1)
      g.fillRect(cx - bodyW / 2 - 3, feetY - 27, 5, 7)
      g.fillRect(cx + bodyW / 2 - 2, feetY - 27, 5, 7)
      g.fillRect(cx - bodyW / 2, feetY - 14, bodyW, 5)
      break
    case 'knight':
      g.fillStyle(PLATE_GRAY, 1)
      g.fillRect(cx - bodyW / 2 - 2, feetY - 28, bodyW + 4, 18)
      g.fillStyle(pal.shirt, 0.35)
      g.fillRect(cx - bodyW / 2 + 2, feetY - 26, bodyW - 4, 10)
      break
    case 'archer':
      if (facing === 'left' || facing === 'right') {
        g.fillStyle(QUIVER_BROWN, 1)
        const side = facing === 'left' ? -1 : 1
        g.fillRect(cx + side * (bodyW / 2 + 3), feetY - 22, 4, 12)
      }
      break
    case 'hunter':
      if (facing === 'left' || facing === 'right') {
        g.fillStyle(QUIVER_BROWN, 1)
        const side = facing === 'left' ? -1 : 1
        g.fillRect(cx + side * (bodyW / 2 + 2), feetY - 24, 5, 14)
      }
      break
    case 'merchant':
      g.fillStyle(APRON_TAN, 1)
      g.fillRect(cx - bodyW / 2 + 1, feetY - 22, bodyW - 2, 10)
      g.fillStyle(0xca8a04, 1)
      g.fillRect(cx - 3, feetY - 14, 6, 4)
      break
    case 'thief':
      g.fillStyle(0x374151, 1)
      g.fillRect(cx - bodyW / 2, feetY - 16, bodyW, 4)
      break
    default:
      break
  }
}

function drawPlayerJobHeadAccessory(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  headY: number,
  facing: 'down' | 'left' | 'right' | 'up',
) {
  switch (avatarKey) {
    case 'archer':
      g.fillStyle(0x166534, 1)
      g.fillRect(cx - 5, headY - 12, 10, 4)
      g.fillStyle(0xdc2626, 1)
      g.fillRect(cx + 4, headY - 13, 3, 5)
      break
    case 'hunter':
      g.fillStyle(0x4b5563, 1)
      g.fillRect(cx - 6, headY - 12, 12, 5)
      g.fillStyle(0x16a34a, 1)
      g.fillRect(cx + 5, headY - 13, 2, 6)
      break
    case 'thief':
      g.fillStyle(0xdc2626, 1)
      g.fillRect(cx - 6, headY - 11, 12, 3)
      if (facing === 'down') {
        g.fillStyle(0x111827, 1)
        g.fillRect(cx - 5, headY - 7, 10, 2)
      }
      break
    default:
      break
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
    case 'dungeon_guide':
      g.fillStyle(0xe2e8f0, 1)
      g.fillRect(cx - 5, feetY - 25, 10, 7)
      g.fillStyle(0xa78bfa, 1)
      g.fillRect(cx - 3, feetY - 23, 6, 2)
      break
    case 'rental_clerk':
      g.fillStyle(0x0d9488, 1)
      g.fillRect(cx - 6, feetY - 26, 12, 6)
      g.fillStyle(0xfbbf24, 1)
      g.fillCircle(cx + 8, feetY - 28, 3)
      break
  }
}

function drawChibiMountedSit(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  feetY: number,
  facing: 'down' | 'left' | 'right' | 'up',
  pal: ChibiPalette,
  bodyW: number,
  female: boolean,
  mode: DrawMode,
) {
  const torsoTop = feetY - 30

  g.fillStyle(pal.shoes, 1)
  if (facing === 'down') {
    g.fillRect(cx - 11, feetY - 10, 6, 4)
    g.fillRect(cx + 5, feetY - 10, 6, 4)
    g.fillStyle(pal.pants, 1)
    g.fillRect(cx - 12, feetY - 16, 8, 8)
    g.fillRect(cx + 4, feetY - 16, 8, 8)
  } else if (facing === 'up') {
    g.fillRect(cx - 8, feetY - 12, 5, 4)
    g.fillRect(cx + 3, feetY - 12, 5, 4)
    g.fillStyle(pal.pants, 1)
    g.fillRect(cx - 10, feetY - 18, 7, 8)
    g.fillRect(cx + 3, feetY - 18, 7, 8)
  } else {
    const side = facing === 'left' ? -1 : 1
    g.fillRect(cx + side * 4, feetY - 12, 6, 4)
    g.fillRect(cx - side * 10, feetY - 14, 6, 4)
    g.fillStyle(pal.pants, 1)
    g.fillRect(cx + side * 2, feetY - 20, 9, 8)
    g.fillRect(cx - side * 8, feetY - 18, 8, 7)
  }

  g.fillStyle(pal.shirt, 1)
  g.fillRoundedRect(cx - bodyW / 2, torsoTop, bodyW, 14, 3)
  if (mode.kind === 'npc') {
    drawArchetypeOverlay(g, mode.archetype, cx, feetY - 4)
  }

  g.fillStyle(pal.skin, 1)
  const armH = 8
  const armW = 4
  if (facing === 'down') {
    g.fillRect(cx - bodyW / 2 - armW, torsoTop + 4, armW, armH)
    g.fillRect(cx + bodyW / 2, torsoTop + 4, armW, armH)
  } else if (facing === 'left') {
    g.fillRect(cx - bodyW / 2 + 1, torsoTop + 5, armW, armH)
    g.fillRect(cx + bodyW / 2 - 5, torsoTop + 3, armW, armH - 1)
  } else if (facing === 'right') {
    g.fillRect(cx - bodyW / 2 + 1, torsoTop + 3, armW, armH - 1)
    g.fillRect(cx + bodyW / 2 - armW, torsoTop + 5, armW, armH)
  } else {
    g.fillRect(cx - bodyW / 2 + 2, torsoTop + 5, armW - 1, armH - 2)
    g.fillRect(cx + bodyW / 2 - armW, torsoTop + 5, armW - 1, armH - 2)
  }

  g.fillCircle(cx, torsoTop - 6, female ? 7 : 8)

  g.fillStyle(pal.hair, 1)
  if (female) {
    g.fillEllipse(cx, torsoTop - 10, femaleHairWidth(mode), 10)
  } else {
    g.fillEllipse(cx, torsoTop - 11, 14, 8)
  }

  let eyeDx = 0
  if (facing === 'left') eyeDx = -2
  if (facing === 'right') eyeDx = 2
  g.fillStyle(pal.eyes, 1)
  g.fillRect(cx - 4 + eyeDx, torsoTop - 7, 2, 2)
  g.fillRect(cx + 2 + eyeDx, torsoTop - 7, 2, 2)
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
  const pal: ChibiPalette = isPlayer
    ? {
        skin: PALETTE_SOURCE.skin,
        hair: PALETTE_SOURCE.hair,
        shirt: PALETTE_SOURCE.shirt,
        pants: PALETTE_SOURCE.pants,
        shoes: PALETTE_SOURCE.shoes,
        eyes: PALETTE_SOURCE.eyes,
      }
    : NPC_ARCHETYPE_PALETTES[mode.archetype]

  const cx = ox + SPRITE_FRAME_WIDTH / 2
  const bodyW =
    isPlayer ? playerBodyWidth(female, mode.avatarKey) : female ? 18 : 20
  let feetY = oy + SPRITE_FRAME_HEIGHT - 4

  if (motion.kind === 'sit') {
    drawChibiMountedSit(g, cx, feetY, facing, pal, bodyW, female, mode)
    return
  }

  const attackMotion = motion.kind === 'attack' ? motion : null
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

  feetY += bob

  if (isPlayer) {
    drawPlayerJobBody(g, mode.avatarKey, cx, feetY, bodyW, legSpread, facing, pal)
  } else {
    drawDefaultLegs(g, cx, feetY, legSpread, pal)
    g.fillStyle(pal.shirt, 1)
    g.fillRoundedRect(cx - bodyW / 2, feetY - 28, bodyW, 16, 3)
    drawArchetypeOverlay(g, mode.archetype, cx, feetY)
  }

  drawArms(
    g,
    pal.skin,
    cx,
    feetY,
    bodyW,
    facing,
    armSwing,
    attackMotion && isPlayer
      ? { style: attackMotion.style, phase: attackMotion.phase }
      : undefined,
  )

  g.fillStyle(pal.skin, 1)
  g.fillCircle(cx, feetY - 34, female ? 7 : 8)

  g.fillStyle(pal.hair, 1)
  if (female) {
    g.fillEllipse(cx, feetY - 38, femaleHairWidth(mode), 10)
  } else {
    g.fillEllipse(cx, feetY - 39, 14, 8)
  }

  if (isPlayer) {
    drawPlayerJobHeadAccessory(g, mode.avatarKey, cx, feetY - 34, facing)
  }

  let eyeDx = 0
  if (facing === 'left') eyeDx = -2
  if (facing === 'right') eyeDx = 2

  const blink = motion.kind === 'idle' && motion.idleBlink === true
  if (!blink) {
    g.fillStyle(pal.eyes, 1)
    g.fillRect(cx - 4 + eyeDx, feetY - 35, 2, 2)
    g.fillRect(cx + 2 + eyeDx, feetY - 35, 2, 2)
  }

  if (attackMotion && isPlayer) {
    drawWeapon(g, attackMotion.style, attackMotion.phase, facing, cx, feetY, bodyW)
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
  if (col >= def.strips.sit.offset && col < def.strips.sit.offset + def.strips.sit.count) {
    return { kind: 'sit' }
  }
  const attackStyles: AttackStyle[] = ['swing', 'thrust', 'bow', 'cast']
  for (const style of attackStyles) {
    const strip = def.strips.attack[style]
    if (col >= strip.offset && col < strip.offset + strip.count) {
      const phase = (col - strip.offset) as 0 | 1 | 2
      return { kind: 'attack', style, phase }
    }
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

export function ensurePlayerMasterSheet(
  scene: Phaser.Scene,
  gender: CharacterGender,
  avatarKey: PlayerAvatarKey,
) {
  const female = gender === 'female'
  const appearance = { ...DEFAULT_CHARACTER_APPEARANCE, gender }
  const def = resolvePlayerSpriteDef(appearance, avatarKey)
  generateSheet(scene, def.masterTextureKey, def, {
    kind: 'player',
    female,
    avatarKey,
  })
}

export function ensureMasterCharacterSheets(scene: Phaser.Scene) {
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
