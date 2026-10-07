import Phaser from 'phaser'
import type { PlayerAvatarKey } from '../player/playerJobAvatar'

/** Near-black outline like the reference sheet. */
const OUTLINE = 0x1a1625

const NOVICE_LOIN_MID = 0x6d7560
const NOVICE_LOIN_DARK = 0x4a5242
const SWORDMAN_TUNIC = 0x3d342c
const SWORDMAN_VEST = 0x5c4632
const SWORDMAN_PLATE = 0xc9a66b
const SWORDMAN_PANTS = 0x1e3a5f
const SWORDMAN_PANTS_SHADE = 0x0f172a
const SWORDMAN_BOOT = 0x4a3220
const SWORDMAN_BOOT_HI = 0x7a5438
const KNIGHT_RED = 0xc62828
const KNIGHT_PANTS = 0x2563eb
const KNIGHT_PANTS_SHADE = 0x1d4ed8
const KNIGHT_PLATE = 0x8fa8c4
const KNIGHT_PLATE_HI = 0xc5dff0
const KNIGHT_PLATE_LO = 0x4b5f78
const KNIGHT_PAULDRON = 0x7ec8e8
const KNIGHT_GEM = 0x22c55e
const KNIGHT_BOOT = 0x374151
const WOOD_DARK = 0x5c3d1e
const WOOD_MID = 0x8b5a2b
const WOOD_HI = 0xb8864b
const BLADE_EDGE = 0x64748b
const BLADE_FACE = 0xe2e8f0
const BLADE_SHINE = 0xf8fafc
const KNIGHT_BLADE_EDGE = 0x334155
const KNIGHT_BLADE_FACE = 0x94a3b8
const KNIGHT_BLADE_CORE = 0xbae6fd
const HILT = 0x5c3d1e
const EYE_WHITE = 0xf8fafc

export type SwordsmanLinePalette = {
  skin: number
  hair: number
  shirt: number
  pants: number
  shoes: number
  eyes: number
}

type Pal = SwordsmanLinePalette

const SHADOW = 0x1a1625

export function isSwordsmanLineJob(avatarKey: PlayerAvatarKey): boolean {
  return avatarKey === 'novice' || avatarKey === 'swordman' || avatarKey === 'knight'
}

function px(g: Phaser.GameObjects.Graphics, cx: number, feetY: number, dx: number, dy: number, color: number) {
  g.fillStyle(color, 1)
  g.fillRect(cx + dx, feetY + dy, 1, 1)
}

function stamp(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  feetY: number,
  pixels: ReadonlyArray<readonly [number, number, number]>,
) {
  for (const [dx, dy, color] of pixels) {
    px(g, cx, feetY, dx, dy, color)
  }
}

/** dy: 0 = feet row; negative = upward. */
/** Pixel legs overlap when spread goes negative; keep width and lift a foot for walk. */
function swordsmanLineLegSpread(legSpread: number): number {
  return Math.max(2, Math.abs(legSpread))
}

export function drawSwordsmanLineDownLegs(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
  legSpread: number,
  pal: Pal,
) {
  const ls = swordsmanLineLegSpread(legSpread)
  if (avatarKey === 'novice') {
    const skin = pal.skin
    const loin = pal.pants
    stamp(g, cx, feetY, [
      [-8 - ls, -2, OUTLINE],
      [-7 - ls, -2, skin],
      [-6 - ls, -2, skin],
      [-5 - ls, -2, OUTLINE],
      [-8 - ls, -3, OUTLINE],
      [-7 - ls, -3, skin],
      [-7 - ls, -4, loin],
      [-6 - ls, -4, loin],
      [-5 - ls, -4, NOVICE_LOIN_DARK],
      [-4 - ls, -4, loin],
      [-7 - ls, -5, loin],
      [-6 - ls, -5, NOVICE_LOIN_MID],
      [-5 - ls, -5, loin],
      [-4 - ls, -5, loin],
      [-3 - ls, -5, NOVICE_LOIN_DARK],
      [-6 - ls, -6, OUTLINE],
      [-5 - ls, -6, loin],
      [-4 - ls, -6, loin],
      [-3 - ls, -6, loin],
      [-5 - ls, -7, loin],
      [-4 - ls, -7, NOVICE_LOIN_DARK],
      [-4 - ls, -8, OUTLINE],
      [4 + ls, -2, OUTLINE],
      [5 + ls, -2, skin],
      [6 + ls, -2, skin],
      [7 + ls, -2, OUTLINE],
      [6 + ls, -3, OUTLINE],
      [5 + ls, -3, skin],
      [4 + ls, -4, loin],
      [5 + ls, -4, loin],
      [6 + ls, -4, NOVICE_LOIN_DARK],
      [4 + ls, -5, NOVICE_LOIN_MID],
      [5 + ls, -5, loin],
      [4 + ls, -6, loin],
      [5 + ls, -6, OUTLINE],
      [4 + ls, -7, loin],
      [3 + ls, -8, OUTLINE],
      [-3 - ls, -5, NOVICE_LOIN_DARK],
      [-2, -5, loin],
      [-1, -5, loin],
      [0, -5, loin],
      [1, -5, loin],
      [2, -5, loin],
      [-3 - ls, -6, loin],
      [-2, -6, loin],
      [-1, -6, loin],
      [0, -6, loin],
      [1, -6, loin],
      [2, -6, loin],
      [3, -6, loin],
      [-3, -7, loin],
      [-2, -7, loin],
      [-1, -7, loin],
      [0, -7, loin],
      [1, -7, loin],
      [2, -7, loin],
      [3, -7, loin],
      [-3, -8, loin],
      [-2, -8, loin],
      [-1, -8, loin],
      [0, -8, loin],
      [1, -8, loin],
      [2, -8, loin],
    ])
    return
  }

  const pants = avatarKey === 'knight' ? KNIGHT_PANTS : SWORDMAN_PANTS
  const pantsShade = avatarKey === 'knight' ? KNIGHT_PANTS_SHADE : SWORDMAN_PANTS_SHADE
  const boot = avatarKey === 'knight' ? KNIGHT_BOOT : SWORDMAN_BOOT
  const bootHi = avatarKey === 'knight' ? KNIGHT_PLATE_HI : SWORDMAN_BOOT_HI

  for (const side of [-1, 1]) {
    const s = side
    const base = s < 0 ? -7 - ls : 4 + ls
    stamp(g, cx, feetY, [
      [base, -2, OUTLINE],
      [base + s, -2, boot],
      [base + s * 2, -2, boot],
      [base + s * 3, -2, OUTLINE],
      [base, -3, boot],
      [base + s, -3, bootHi],
      [base + s * 2, -3, boot],
      [base + s, -4, boot],
      [base + s * 2, -4, boot],
      [base, -5, boot],
      [base + s * 3, -5, OUTLINE],
      [base + s, -6, boot],
      [base + s * 2, -6, KNIGHT_PLATE_LO],
      [base + s, -7, pantsShade],
      [base + s * 2, -7, pants],
      [base + s, -8, pants],
      [base + s * 2, -8, pants],
      [base + s, -9, pants],
      [base + s * 2, -9, pantsShade],
      [base + s, -10, pants],
      [base + s * 2, -10, pants],
      [base + s, -11, OUTLINE],
      [base + s * 2, -11, OUTLINE],
    ])
  }
}

export function drawSwordsmanLineDownTorso(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
  pal: Pal,
) {
  const skin = pal.skin

  if (avatarKey === 'novice') {
    stamp(g, cx, feetY, [
      [-4, -9, OUTLINE],
      [-3, -9, skin],
      [-2, -9, skin],
      [-1, -9, skin],
      [0, -9, skin],
      [1, -9, skin],
      [2, -9, skin],
      [3, -9, OUTLINE],
      [-5, -10, OUTLINE],
      [-4, -10, skin],
      [-3, -10, skin],
      [-2, -10, skin],
      [-1, -10, skin],
      [0, -10, skin],
      [1, -10, skin],
      [2, -10, skin],
      [3, -10, skin],
      [4, -10, OUTLINE],
      [-5, -11, OUTLINE],
      [-4, -11, skin],
      [-3, -11, skin],
      [-2, -11, skin],
      [-1, -11, skin],
      [0, -11, skin],
      [1, -11, skin],
      [2, -11, skin],
      [3, -11, skin],
      [4, -11, OUTLINE],
      [-4, -12, skin],
      [-3, -12, skin],
      [-2, -12, skin],
      [-1, -12, skin],
      [0, -12, skin],
      [1, -12, skin],
      [2, -12, skin],
      [3, -12, skin],
      [-4, -13, skin],
      [-3, -13, skin],
      [-2, -13, skin],
      [-1, -13, skin],
      [0, -13, skin],
      [1, -13, skin],
      [2, -13, skin],
      [3, -13, skin],
      [-3, -14, pal.pants],
      [-2, -14, pal.pants],
      [-1, -14, pal.pants],
      [0, -14, pal.pants],
      [1, -14, pal.pants],
      [2, -14, pal.pants],
      [-5, -12, OUTLINE],
      [4, -12, OUTLINE],
      [-5, -13, OUTLINE],
      [4, -13, OUTLINE],
      [-2, -15, NOVICE_LOIN_DARK],
      [1, -15, NOVICE_LOIN_DARK],
    ])
    return
  }

  if (avatarKey === 'swordman') {
    stamp(g, cx, feetY, [
      [-5, -9, SWORDMAN_TUNIC],
      [-4, -9, SWORDMAN_VEST],
      [-3, -9, SWORDMAN_PLATE],
      [-2, -9, SWORDMAN_PLATE],
      [-1, -9, SWORDMAN_PLATE],
      [0, -9, SWORDMAN_PLATE],
      [1, -9, SWORDMAN_VEST],
      [2, -9, SWORDMAN_TUNIC],
      [3, -9, SWORDMAN_TUNIC],
      [-5, -10, OUTLINE],
      [-4, -10, SWORDMAN_TUNIC],
      [-3, -10, SWORDMAN_TUNIC],
      [-2, -10, SWORDMAN_PLATE],
      [-1, -10, SWORDMAN_PLATE],
      [0, -10, SWORDMAN_PLATE],
      [1, -10, SWORDMAN_TUNIC],
      [2, -10, SWORDMAN_TUNIC],
      [3, -10, SWORDMAN_TUNIC],
      [4, -10, OUTLINE],
      [-5, -11, OUTLINE],
      [-4, -11, SWORDMAN_VEST],
      [-3, -11, SWORDMAN_VEST],
      [-2, -11, SWORDMAN_PLATE],
      [-1, -11, SWORDMAN_PLATE],
      [0, -11, SWORDMAN_PLATE],
      [1, -11, SWORDMAN_VEST],
      [2, -11, SWORDMAN_VEST],
      [3, -11, SWORDMAN_TUNIC],
      [4, -11, OUTLINE],
      [-5, -12, SWORDMAN_VEST],
      [-4, -12, SWORDMAN_VEST],
      [-3, -12, SWORDMAN_PLATE],
      [-2, -12, SWORDMAN_PLATE],
      [-1, -12, SWORDMAN_PLATE],
      [0, -12, SWORDMAN_PLATE],
      [1, -12, SWORDMAN_VEST],
      [2, -12, SWORDMAN_VEST],
      [3, -12, SWORDMAN_TUNIC],
      [4, -12, OUTLINE],
      [-4, -13, SWORDMAN_VEST],
      [-3, -13, SWORDMAN_VEST],
      [-2, -13, SWORDMAN_PLATE],
      [-1, -13, SWORDMAN_PLATE],
      [0, -13, SWORDMAN_VEST],
      [1, -13, SWORDMAN_VEST],
      [2, -13, SWORDMAN_TUNIC],
      [3, -13, OUTLINE],
      [-3, -14, SWORDMAN_TUNIC],
      [-2, -14, SWORDMAN_TUNIC],
      [-1, -14, SWORDMAN_TUNIC],
      [0, -14, SWORDMAN_TUNIC],
      [1, -14, OUTLINE],
      [-6, -11, OUTLINE],
      [-6, -12, SWORDMAN_VEST],
      [-6, -13, OUTLINE],
      [4, -13, OUTLINE],
      [-5, -11, SWORDMAN_VEST],
      [3, -11, OUTLINE],
    ])
    stamp(g, cx, feetY, [
      [-6, -10, SWORDMAN_VEST],
      [-6, -11, SWORDMAN_BOOT_HI],
      [4, -10, SWORDMAN_VEST],
      [4, -11, SWORDMAN_BOOT_HI],
    ])
    return
  }

  // Knight
  stamp(g, cx, feetY, [
    [-6, -10, OUTLINE],
    [-5, -10, KNIGHT_RED],
    [-4, -10, KNIGHT_PLATE],
    [-3, -10, KNIGHT_PLATE_HI],
    [-2, -10, KNIGHT_PLATE],
    [-1, -10, KNIGHT_PLATE_HI],
    [0, -10, KNIGHT_PLATE],
    [1, -10, KNIGHT_RED],
    [2, -10, KNIGHT_PLATE],
    [3, -10, KNIGHT_PLATE],
    [4, -10, KNIGHT_RED],
    [5, -10, OUTLINE],
    [-6, -11, KNIGHT_RED],
    [-5, -11, KNIGHT_PLATE_LO],
    [-4, -11, KNIGHT_PLATE],
    [-3, -11, KNIGHT_PLATE_HI],
    [-2, -11, KNIGHT_GEM],
    [-1, -11, KNIGHT_GEM],
    [0, -11, KNIGHT_GEM],
    [1, -11, KNIGHT_PLATE_HI],
    [2, -11, KNIGHT_PLATE],
    [3, -11, KNIGHT_PLATE_LO],
    [4, -11, KNIGHT_RED],
    [5, -11, OUTLINE],
    [-5, -12, KNIGHT_PLATE_LO],
    [-4, -12, KNIGHT_PLATE],
    [-3, -12, KNIGHT_PLATE_HI],
    [-2, -12, KNIGHT_PLATE],
    [-1, -12, KNIGHT_PLATE_HI],
    [0, -12, KNIGHT_PLATE],
    [1, -12, KNIGHT_PLATE_HI],
    [2, -12, KNIGHT_PLATE],
    [3, -12, KNIGHT_PLATE_LO],
    [4, -12, KNIGHT_RED],
    [-4, -13, KNIGHT_PLATE],
    [-3, -13, KNIGHT_PLATE],
    [-2, -13, KNIGHT_PLATE_LO],
    [-1, -13, KNIGHT_PLATE],
    [0, -13, KNIGHT_PLATE],
    [1, -13, KNIGHT_PLATE],
    [2, -13, KNIGHT_RED],
    [-5, -13, KNIGHT_RED],
    [3, -13, OUTLINE],
    [-6, -12, OUTLINE],
    [5, -12, OUTLINE],
  ])
  stamp(g, cx, feetY, [
    [-7, -11, KNIGHT_PAULDRON],
    [-7, -12, KNIGHT_PLATE_HI],
    [-7, -13, KNIGHT_PLATE_LO],
    [-7, -14, OUTLINE],
    [-6, -14, KNIGHT_PAULDRON],
    [5, -11, KNIGHT_PAULDRON],
    [5, -12, KNIGHT_PLATE_HI],
    [6, -11, KNIGHT_PAULDRON],
    [6, -12, KNIGHT_PAULDRON],
    [6, -13, KNIGHT_PLATE_LO],
    [7, -12, OUTLINE],
    [7, -13, OUTLINE],
    [-5, -9, KNIGHT_RED],
    [-4, -9, KNIGHT_RED],
    [3, -9, KNIGHT_RED],
    [4, -9, KNIGHT_RED],
  ])
}

export function drawSwordsmanLineDownArms(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
  armSwing: number,
  pal: Pal,
) {
  const skin = pal.skin
  const swing = armSwing
  const cuff = avatarKey === 'knight' ? KNIGHT_PLATE : avatarKey === 'swordman' ? SWORDMAN_VEST : skin

  stamp(g, cx, feetY, [
    [-8, -10 + swing, OUTLINE],
    [-7, -10 + swing, skin],
    [-7, -11 + swing, skin],
    [-7, -12 + swing, skin],
    [-8, -12 + swing, OUTLINE],
    [-7, -13 + swing, cuff],
    [7, -10 - swing, OUTLINE],
    [6, -10 - swing, skin],
    [6, -11 - swing, skin],
    [6, -12 - swing, skin],
    [7, -12 - swing, OUTLINE],
    [6, -13 - swing, cuff],
  ])
}

export function drawSwordsmanLineDownHead(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  feetY: number,
  pal: Pal,
  blink: boolean,
) {
  const skin = pal.skin
  const hair = pal.hair

  stamp(g, cx, feetY, [
    [-3, -16, OUTLINE],
    [-2, -16, hair],
    [-1, -16, hair],
    [0, -16, hair],
    [1, -16, hair],
    [2, -16, OUTLINE],
    [-4, -17, OUTLINE],
    [-3, -17, hair],
    [-2, -17, hair],
    [-1, -17, hair],
    [0, -17, hair],
    [1, -17, hair],
    [2, -17, hair],
    [3, -17, OUTLINE],
    [-5, -18, hair],
    [-4, -18, hair],
    [-3, -18, hair],
    [-2, -18, hair],
    [-1, -18, hair],
    [0, -18, hair],
    [1, -18, hair],
    [2, -18, hair],
    [3, -18, hair],
    [4, -18, hair],
    [-5, -19, OUTLINE],
    [-4, -19, hair],
    [-3, -19, hair],
    [-2, -19, hair],
    [-1, -19, skin],
    [0, -19, skin],
    [1, -19, skin],
    [2, -19, hair],
    [3, -19, hair],
    [4, -19, OUTLINE],
    [-4, -20, OUTLINE],
    [-3, -20, skin],
    [-2, -20, skin],
    [-1, -20, skin],
    [0, -20, skin],
    [1, -20, skin],
    [2, -20, skin],
    [3, -20, OUTLINE],
    [-4, -21, OUTLINE],
    [-3, -21, skin],
    [-2, -21, skin],
    [-1, -21, skin],
    [0, -21, skin],
    [1, -21, skin],
    [2, -21, skin],
    [3, -21, OUTLINE],
    [-3, -22, skin],
    [-2, -22, skin],
    [-1, -22, skin],
    [0, -22, skin],
    [1, -22, skin],
    [2, -22, skin],
    [-3, -23, OUTLINE],
    [-2, -23, skin],
    [-1, -23, skin],
    [0, -23, skin],
    [1, -23, skin],
    [2, -23, OUTLINE],
    [-4, -20, hair],
    [3, -20, hair],
    [-5, -19, hair],
    [4, -19, hair],
    [-4, -17, hair],
    [3, -17, hair],
  ])

  if (!blink) {
    stamp(g, cx, feetY, [
      [-3, -21, EYE_WHITE],
      [-2, -21, EYE_WHITE],
      [-3, -20, pal.eyes],
      [-2, -20, pal.eyes],
      [1, -21, EYE_WHITE],
      [2, -21, EYE_WHITE],
      [1, -20, pal.eyes],
      [2, -20, pal.eyes],
      [-3, -20, OUTLINE],
      [2, -20, OUTLINE],
    ])
  }
}

export function drawSwordsmanLineDownHeldWeapon(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
) {
  if (avatarKey === 'novice') {
    stamp(g, cx, feetY, [
      [-10, -6, OUTLINE],
      [-9, -6, WOOD_DARK],
      [-9, -7, WOOD_MID],
      [-9, -8, WOOD_MID],
      [-9, -9, WOOD_HI],
      [-10, -9, OUTLINE],
      [-8, -9, WOOD_HI],
      [-9, -10, WOOD_DARK],
      [-8, -7, WOOD_DARK],
      [-10, -7, OUTLINE],
      [-10, -8, OUTLINE],
    ])
    return
  }

  if (avatarKey === 'swordman') {
    stamp(g, cx, feetY, [
      [-11, -5, OUTLINE],
      [-10, -5, HILT],
      [-10, -6, HILT],
      [-9, -6, BLADE_EDGE],
      [-9, -7, BLADE_FACE],
      [-9, -8, BLADE_FACE],
      [-9, -9, BLADE_SHINE],
      [-9, -10, BLADE_FACE],
      [-9, -11, BLADE_EDGE],
      [-10, -11, OUTLINE],
      [-8, -7, BLADE_EDGE],
      [-8, -8, BLADE_FACE],
      [-8, -9, BLADE_FACE],
      [-8, -10, BLADE_EDGE],
      [-10, -7, HILT],
      [-11, -6, OUTLINE],
    ])
    return
  }

  stamp(g, cx, feetY, [
    [-12, -4, OUTLINE],
    [-11, -4, HILT],
    [-11, -5, HILT],
    [-10, -5, KNIGHT_BLADE_EDGE],
    [-10, -6, KNIGHT_BLADE_FACE],
    [-10, -7, KNIGHT_BLADE_CORE],
    [-10, -8, KNIGHT_BLADE_CORE],
    [-10, -9, KNIGHT_BLADE_FACE],
    [-10, -10, KNIGHT_BLADE_CORE],
    [-10, -11, KNIGHT_BLADE_FACE],
    [-10, -12, KNIGHT_BLADE_EDGE],
    [-11, -12, OUTLINE],
    [-9, -6, KNIGHT_BLADE_EDGE],
    [-9, -7, KNIGHT_BLADE_FACE],
    [-9, -8, KNIGHT_BLADE_CORE],
    [-9, -9, KNIGHT_BLADE_FACE],
    [-9, -10, KNIGHT_BLADE_EDGE],
    [-8, -7, KNIGHT_BLADE_EDGE],
    [-8, -8, KNIGHT_BLADE_FACE],
    [-8, -9, KNIGHT_BLADE_EDGE],
    [-11, -6, HILT],
    [-12, -5, OUTLINE],
    [-9, -11, KNIGHT_BLADE_EDGE],
  ])
}

function drawSwordsmanLineDownShadow(g: Phaser.GameObjects.Graphics, cx: number, feetY: number) {
  g.fillStyle(SHADOW, 0.35)
  g.fillEllipse(cx, feetY - 1, 16, 5)
  g.fillStyle(SHADOW, 0.2)
  g.fillEllipse(cx + 1, feetY, 12, 3)
}

/** Full down-facing idle/walk body (reference-style Novice → Swordman → Knight). */
export function drawSwordsmanLineDownFrame(
  g: Phaser.GameObjects.Graphics,
  avatarKey: PlayerAvatarKey,
  cx: number,
  feetY: number,
  legSpread: number,
  armSwing: number,
  pal: SwordsmanLinePalette,
  options?: { blink?: boolean; heldWeapon?: boolean },
) {
  const blink = options?.blink ?? false
  const heldWeapon = options?.heldWeapon ?? true
  drawSwordsmanLineDownShadow(g, cx, feetY)
  drawSwordsmanLineDownLegs(g, avatarKey, cx, feetY, legSpread, pal)
  drawSwordsmanLineDownTorso(g, avatarKey, cx, feetY, pal)
  drawSwordsmanLineDownArms(g, avatarKey, cx, feetY, armSwing, pal)
  drawSwordsmanLineDownHead(g, cx, feetY, pal, blink)
  if (heldWeapon) {
    drawSwordsmanLineDownHeldWeapon(g, avatarKey, cx, feetY)
  }
}
