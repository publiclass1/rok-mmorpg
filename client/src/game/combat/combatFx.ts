import Phaser from 'phaser'
import type { AttackStyle } from '../character/characterSpriteRegistry'
import type { Facing } from '../movement/clickToMove'
import type { PlayerDisplay } from '../player/playerSprites'
import { setPlayerHitFlash } from '../player/playerSprites'
import type { AttackVariant } from '../player/playerCombatAnim'

export type FloatStyle =
  | 'hit'
  | 'crit'
  | 'critMagic'
  | 'miss'
  | 'mobHitPlayer'
  | 'recoverHp'
  | 'recoverSp'

export type DamageFloatVariant = 'hit' | 'critPhysical' | 'critMagic' | 'miss' | 'blood' | 'bloodCrit'

const STYLE_COLORS: Record<Exclude<FloatStyle, 'crit' | 'critMagic'>, string> = {
  hit: '#fef08a',
  miss: '#9ca3af',
  mobHitPlayer: '#ef4444',
  recoverHp: '#4ade80',
  recoverSp: '#60a5fa',
}

/** RO physical crit: yellow digits on thick black stroke over brown-red jagged burst. */
const CRIT_PHYSICAL_TEXT = { fill: '#ffe566', stroke: '#000000' }
const CRIT_MAGIC_TEXT = { fill: '#a5f3fc', stroke: '#0c1929' }

function fillJaggedStar(
  g: Phaser.GameObjects.Graphics,
  outerR: number,
  innerR: number,
  spikes: number,
  color: number,
  alpha: number,
  rotation = -Math.PI / 2,
) {
  g.fillStyle(color, alpha)
  g.beginPath()
  const step = Math.PI / spikes
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = rotation + i * step
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r * 0.82
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  g.fillPath()
}

/** Jagged star + speed lines at local origin (parent container moves with damage text). */
function createRoCritBurstGraphics(scene: Phaser.Scene, magic: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()

  if (magic) {
    fillJaggedStar(g, 38, 16, 10, 0x1e3a5f, 0.92)
    fillJaggedStar(g, 28, 11, 10, 0x38bdf8, 0.88)
    fillJaggedStar(g, 16, 6, 8, 0x7dd3fc, 0.75)
    g.lineStyle(2, 0xe0f2fe, 0.9)
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + 0.08
      g.lineBetween(Math.cos(a) * 10, Math.sin(a) * 8, Math.cos(a) * 44, Math.sin(a) * 34)
    }
  } else {
    const rot = -0.4
    fillJaggedStar(g, 42, 17, 12, 0x5c2018, 0.95, rot)
    fillJaggedStar(g, 34, 14, 12, 0x8b3a2a, 0.95, rot)
    fillJaggedStar(g, 24, 10, 10, 0xb85c38, 0.9, rot)
    fillJaggedStar(g, 14, 5, 8, 0xd48450, 0.75, rot)
    g.lineStyle(2, 0xfff4c2, 0.85)
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14 + 0.12
      const len = 18 + (i % 3) * 10
      g.lineBetween(Math.cos(a) * 8, Math.sin(a) * 6, Math.cos(a) * len, Math.sin(a) * len * 0.85)
    }
    g.lineStyle(1, 0xffffff, 0.5)
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - 0.2
      g.lineBetween(0, 0, Math.cos(a) * 52, Math.sin(a) * 40)
    }
  }

  return g
}

export function showDamageFloat(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  variant: DamageFloatVariant,
) {
  if (variant === 'miss') {
    showFloatingText(scene, x, y, 'MISS', 'miss')
    return
  }

  const isBloodCrit = variant === 'bloodCrit'
  const isCritPhysical = variant === 'critPhysical' || isBloodCrit
  const isCritMagic = variant === 'critMagic'
  const isCrit = isCritPhysical || isCritMagic
  const isBlood = variant === 'blood'
  const label = String(damage)

  const textStyle = isBloodCrit
    ? { fill: '#ff2d2d', stroke: '#000000' }
    : isCritPhysical && !isBloodCrit
      ? CRIT_PHYSICAL_TEXT
      : isCritMagic
        ? CRIT_MAGIC_TEXT
        : isBlood
          ? { fill: '#ef4444', stroke: '#450a0a' }
          : { fill: STYLE_COLORS.hit, stroke: '#1f2937' }

  const duration = isCrit ? 2000 : 1500
  const rise = isCrit ? -42 : -28

  if (isCrit) {
    const floater = scene.add.container(x, y)
    floater.setDepth(8000)

    const burst = createRoCritBurstGraphics(scene, isCritMagic)
    floater.add(burst)

    const text = scene.add
      .text(0, 0, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '22px',
        color: textStyle.fill,
        fontStyle: 'bold',
        stroke: textStyle.stroke,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
    floater.add(text)

    floater.setScale(0.55)
    scene.tweens.add({
      targets: floater,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: 'Back.easeOut',
    })
    scene.tweens.add({
      targets: floater,
      y: y + rise,
      duration,
      ease: 'Sine.easeOut',
    })
    scene.tweens.add({
      targets: floater,
      alpha: 0,
      delay: duration - 450,
      duration: 450,
      onComplete: () => floater.destroy(),
    })
    return
  }

  const text = scene.add
    .text(x, y, label, {
      fontSize: isBlood ? '14px' : '12px',
      color: textStyle.fill,
      stroke: textStyle.stroke,
      strokeThickness: isBlood ? 3 : 1,
      fontStyle: isBlood ? 'bold' : 'normal',
    })
    .setOrigin(0.5)

  scene.tweens.add({
    targets: text,
    y: y + rise,
    duration,
    ease: 'Linear',
  })
  scene.tweens.add({
    targets: text,
    alpha: 0,
    duration,
    onComplete: () => text.destroy(),
  })
}

export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: FloatStyle,
) {
  if (style === 'crit' || style === 'critMagic') {
    const n = Number(text.replace(/^-/, ''))
    if (!Number.isNaN(n)) {
      showDamageFloat(scene, x, y, n, style === 'critMagic' ? 'critMagic' : 'critPhysical')
      return
    }
  }

  const color =
    style === 'crit'
      ? CRIT_PHYSICAL_TEXT.fill
      : style === 'critMagic'
        ? CRIT_MAGIC_TEXT.fill
        : STYLE_COLORS[style as keyof typeof STYLE_COLORS] ?? STYLE_COLORS.hit

  const label = scene.add
    .text(x, y, text, {
      fontSize: style === 'miss' ? '11px' : style === 'crit' || style === 'critMagic' ? '14px' : '12px',
      color,
      fontStyle: style === 'crit' || style === 'critMagic' ? 'bold' : undefined,
    })
    .setOrigin(0.5)
  scene.tweens.add({
    targets: label,
    y: y - 28,
    alpha: 0,
    duration: style === 'mobHitPlayer' ? 1500 : 550,
    onComplete: () => label.destroy(),
  })
}

/** Green HP / blue SP floats above the player during sit or passive regen. */
export function showRecoveryFloats(
  scene: Phaser.Scene,
  x: number,
  y: number,
  gained: { hp: number; sp: number },
) {
  const { hp, sp } = gained
  if (hp <= 0 && sp <= 0) return

  const both = hp > 0 && sp > 0
  if (hp > 0) {
    showFloatingText(scene, x, y - (both ? 48 : 36), `+${hp}`, 'recoverHp')
  }
  if (sp > 0) {
    showFloatingText(scene, x, y - (both ? 32 : 36), `+${sp}`, 'recoverSp')
  }
}

export function playMobHitShake(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, tintColor: number) {
  sprite.setTint(0xffffff)
  scene.tweens.add({
    targets: sprite,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: 60,
    yoyo: true,
    onComplete: () => {
      sprite.clearTint()
      sprite.setTint(tintColor)
    },
  })
}

function drawHitSparks(scene: Phaser.Scene, x: number, y: number, depth: number) {
  const sparks = scene.add.graphics()
  sparks.setPosition(x, y)
  sparks.setDepth(depth)
  sparks.lineStyle(2, 0xfff7ed, 0.95)
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + 0.2
    sparks.lineBetween(0, 0, Math.cos(a) * 10, Math.sin(a) * 10)
  }
  sparks.fillStyle(0xffffff, 0.8)
  sparks.fillCircle(0, 0, 3)
  scene.tweens.add({
    targets: sparks,
    alpha: 0,
    scaleX: 1.4,
    scaleY: 1.4,
    duration: 120,
    onComplete: () => sparks.destroy(),
  })
}

export function playMobHitImpact(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  tintColor: number,
  fromX?: number,
  fromY?: number,
) {
  const cx = sprite.x
  const cy = sprite.y - 14
  sprite.setTint(0xffffff)
  scene.time.delayedCall(50, () => sprite.setTint(0xff6b6b))
  scene.time.delayedCall(120, () => sprite.setTint(tintColor))

  scene.tweens.add({
    targets: sprite,
    scaleX: 1.12,
    scaleY: 1.12,
    duration: 55,
    yoyo: true,
  })

  drawHitSparks(scene, cx, cy, sprite.depth + 0.08)

  if (fromX !== undefined && fromY !== undefined) {
    const dx = cx - fromX
    const dy = cy - fromY
    const len = Math.hypot(dx, dy)
    const nx = len > 0.01 ? dx / len : 0
    const ny = len > 0.01 ? dy / len : 1
    const bump = 5
    const startX = sprite.x
    const startY = sprite.y
    scene.tweens.add({
      targets: sprite,
      x: startX + nx * bump,
      y: startY + ny * bump,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        sprite.setPosition(startX, startY)
      },
    })
  }
}

export function playMobAttackLunge(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  targetX: number,
  targetY: number,
) {
  const startX = sprite.x
  const startY = sprite.y
  const dx = targetX - startX
  const dy = targetY - startY
  const len = Math.hypot(dx, dy)
  const nx = len > 0.01 ? dx / len : 0
  const ny = len > 0.01 ? dy / len : 1
  const lunge = 6

  scene.tweens.add({
    targets: sprite,
    x: startX + nx * lunge,
    y: startY + ny * lunge,
    duration: 70,
    yoyo: true,
  })
}

function spawnMobDeathBurst(scene: Phaser.Scene, x: number, y: number, tint: number) {
  const emitter = scene.add.particles(x, y - 10, 'mob_particle', {
    speed: { min: 40, max: 110 },
    lifespan: 400,
    scale: { start: 1.2, end: 0 },
    gravityY: 180,
    tint,
    emitting: false,
  })
  emitter.explode(10)
  scene.time.delayedCall(450, () => emitter.destroy())
}

export function playMobDeath(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  tintColor: number,
  onComplete: () => void,
) {
  sprite.anims.stop()
  sprite.setFrame(0)
  sprite.setAlpha(1)
  sprite.setScale(1, 1)
  sprite.clearTint()
  sprite.setTint(tintColor)

  let burstDone = false
  const onBurst = () => {
    if (burstDone) return
    burstDone = true
    spawnMobDeathBurst(scene, sprite.x, sprite.y, tintColor)
  }

  sprite.once(Phaser.Animations.Events.ANIMATION_UPDATE, (_anim, frame) => {
    if (frame.index >= 2) onBurst()
  })

  sprite.play('mob_death')

  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        sprite.anims.stop()
        sprite.setFrame(0)
        sprite.setAlpha(1)
        sprite.setScale(1, 1)
        sprite.clearTint()
        sprite.setTint(tintColor)
        onComplete()
      },
    })
  })
}

export function flashPlayerHit(scene: Phaser.Scene, display: PlayerDisplay) {
  setPlayerHitFlash(display, true)
  scene.time.delayedCall(120, () => setPlayerHitFlash(display, false))
}

type SlashArcSpec = {
  outerStart: number
  outerEnd: number
  innerStart: number
  innerEnd: number
}

function slashArcSpec(facing: Facing, swing: boolean): SlashArcSpec {
  if (facing === 'left' || facing === 'right') {
    if (facing === 'right') {
      return swing
        ? { outerStart: -0.9, outerEnd: 0.9, innerStart: -0.7, innerEnd: 0.7 }
        : { outerStart: -0.8, outerEnd: 0.8, innerStart: -0.8, innerEnd: 0.8 }
    }
    return swing
      ? { outerStart: Math.PI - 0.9, outerEnd: Math.PI + 0.9, innerStart: Math.PI - 0.7, innerEnd: Math.PI + 0.7 }
      : { outerStart: Math.PI - 0.8, outerEnd: Math.PI + 0.8, innerStart: Math.PI - 0.8, innerEnd: Math.PI + 0.8 }
  }
  if (facing === 'down') {
    return swing
      ? { outerStart: 0.2, outerEnd: Math.PI - 0.2, innerStart: 0.35, innerEnd: Math.PI - 0.35 }
      : { outerStart: 0.3, outerEnd: Math.PI - 0.3, innerStart: 0.3, innerEnd: Math.PI - 0.3 }
  }
  return swing
    ? { outerStart: Math.PI + 0.2, outerEnd: -0.2, innerStart: Math.PI + 0.35, innerEnd: -0.35 }
    : { outerStart: Math.PI + 0.3, outerEnd: -0.3, innerStart: Math.PI + 0.3, innerEnd: -0.3 }
}

function strokeSlashArcAt(
  g: Phaser.GameObjects.Graphics,
  arcR: number,
  spec: SlashArcSpec,
  outerColor: number,
  outerWidth: number,
  innerColor: number,
  innerWidth: number,
  innerRadiusDelta: number,
) {
  g.lineStyle(outerWidth, outerColor, 0.85)
  g.beginPath()
  g.arc(0, 0, arcR, spec.outerStart, spec.outerEnd, false)
  g.strokePath()
  g.lineStyle(innerWidth, innerColor, 0.95)
  g.beginPath()
  g.arc(0, 0, arcR - innerRadiusDelta, spec.innerStart, spec.innerEnd, false)
  g.strokePath()
}

function drawThrustSlash(
  scene: Phaser.Scene,
  sx: number,
  sy: number,
  facing: Facing,
  bash: boolean,
  depth: number,
) {
  const g = scene.add.graphics()
  g.setPosition(sx, sy)
  g.setDepth(depth)
  const color = bash ? 0xfbbf24 : 0x94a3b8
  const tip = bash ? 0xfffbeb : 0xe2e8f0
  const len = bash ? 26 : 20
  const width = bash ? 4 : 3
  g.lineStyle(width, color, 0.95)
  switch (facing) {
    case 'right':
      g.lineBetween(0, 0, len, 0)
      g.fillStyle(tip, 1)
      g.fillTriangle(len, 0, len - 5, -3, len - 5, 3)
      break
    case 'left':
      g.lineBetween(0, 0, -len, 0)
      g.fillStyle(tip, 1)
      g.fillTriangle(-len, 0, -len + 5, -3, -len + 5, 3)
      break
    case 'down':
      g.lineBetween(0, 0, 0, len)
      g.fillStyle(tip, 1)
      g.fillTriangle(0, len, -3, len - 5, 3, len - 5)
      break
    case 'up':
      g.lineBetween(0, 0, 0, -len)
      g.fillStyle(tip, 1)
      g.fillTriangle(0, -len, -3, -len + 5, 3, -len + 5)
      break
  }
  const slide =
    facing === 'right'
      ? { x: 10, y: 0 }
      : facing === 'left'
        ? { x: -10, y: 0 }
        : facing === 'down'
          ? { x: 0, y: 10 }
          : { x: 0, y: -10 }
  scene.tweens.add({
    targets: g,
    x: sx + slide.x,
    y: sy + slide.y,
    alpha: 0,
    duration: bash ? 160 : 120,
    onComplete: () => g.destroy(),
  })
}

function drawSwingSlash(
  scene: Phaser.Scene,
  sx: number,
  sy: number,
  facing: Facing,
  bash: boolean,
  depth: number,
) {
  const slash = scene.add.graphics()
  slash.setPosition(sx, sy)
  slash.setDepth(depth)
  const outer = bash ? 0xfbbf24 : 0xe2e8f0
  const inner = bash ? 0xfffbeb : 0xffffff
  const arcR = bash ? 24 : 20
  strokeSlashArcAt(
    slash,
    arcR,
    slashArcSpec(facing, true),
    outer,
    bash ? 5 : 4,
    inner,
    2,
    4,
  )

  const rotStart =
    facing === 'right' ? -0.5 : facing === 'left' ? 0.5 : facing === 'down' ? -0.3 : 0.3
  slash.setRotation(rotStart)
  scene.tweens.add({
    targets: slash,
    rotation: rotStart + (facing === 'left' ? -0.6 : 0.6),
    alpha: 0,
    scaleX: 1.25,
    duration: bash ? 180 : 140,
    onComplete: () => slash.destroy(),
  })
}

export function playPlayerAttackSlash(
  scene: Phaser.Scene,
  display: PlayerDisplay,
  facing: Facing,
  options: { variant: AttackVariant; attackStyle: AttackStyle },
) {
  if (options.attackStyle === 'bow' || options.attackStyle === 'cast') {
    return
  }

  const container = display.container
  const playerX = container.x
  const playerY = container.y
  const bash = options.variant === 'bash'
  const thrust = options.attackStyle === 'thrust'
  const lunge = thrust ? 12 : 8

  const offset = { x: 0, y: 0 }
  switch (facing) {
    case 'up':
      offset.y = -lunge
      break
    case 'down':
      offset.y = lunge
      break
    case 'left':
      offset.x = -lunge
      break
    case 'right':
      offset.x = lunge
      break
  }

  const reach = thrust ? 14 : 20
  const sx = playerX + (facing === 'left' ? -reach : facing === 'right' ? reach : 0)
  const sy = playerY + (facing === 'up' ? -reach : facing === 'down' ? reach : 0)
  const slashDepth = container.depth + 0.08

  if (options.attackStyle === 'swing') {
    drawSwingSlash(scene, sx, sy, facing, bash, slashDepth)
  } else if (options.attackStyle === 'thrust') {
    drawThrustSlash(scene, sx, sy, facing, bash, slashDepth)
  } else {
    const slash = scene.add.graphics()
    slash.setPosition(sx, sy)
    slash.setDepth(slashDepth)
    const arcR = bash ? 24 : 18
    const color = bash ? 0xfbbf24 : 0xe2e8f0
    slash.lineStyle(bash ? 4 : 3, color, 0.95)
    const spec = slashArcSpec(facing, false)
    slash.beginPath()
    slash.arc(0, 0, arcR, spec.outerStart, spec.outerEnd, false)
    slash.strokePath()
    scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: bash ? 200 : 150,
      onComplete: () => slash.destroy(),
    })
  }

  const rig = display.bodyRig
  const startX = rig.x
  const startY = rig.y
  scene.tweens.add({
    targets: rig,
    x: startX + offset.x,
    y: startY + offset.y,
    duration: 90,
    yoyo: true,
    onComplete: () => {
      rig.setPosition(startX, startY)
    },
  })
}

/** @deprecated Use playPlayerAttackSlash with PlayerDisplay */
export function playPlayerAttack(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.Sprite,
  facing: Facing,
  onComplete?: () => void,
) {
  const slash = scene.add.graphics()
  slash.lineStyle(3, 0xe2e8f0, 0.9)
  const sx = player.x + (facing === 'left' ? -20 : facing === 'right' ? 20 : 0)
  const sy = player.y + (facing === 'up' ? -20 : facing === 'down' ? 20 : 0)
  slash.beginPath()
  if (facing === 'left' || facing === 'right') {
    slash.arc(sx, sy, 18, facing === 'right' ? -0.8 : Math.PI - 0.8, facing === 'right' ? 0.8 : Math.PI + 0.8, false)
  } else {
    slash.arc(sx, sy, 18, facing === 'down' ? 0.3 : Math.PI + 0.3, facing === 'down' ? Math.PI - 0.3 : -0.3, false)
  }
  slash.strokePath()
  scene.tweens.add({
    targets: slash,
    alpha: 0,
    duration: 150,
    onComplete: () => {
      slash.destroy()
      onComplete?.()
    },
  })
}

export function missTextPosition(
  playerX: number,
  playerY: number,
  facing: Facing,
): { x: number; y: number } {
  switch (facing) {
    case 'up':
      return { x: playerX, y: playerY - 36 }
    case 'down':
      return { x: playerX, y: playerY + 12 }
    case 'left':
      return { x: playerX - 28, y: playerY - 16 }
    case 'right':
      return { x: playerX + 28, y: playerY - 16 }
  }
}
