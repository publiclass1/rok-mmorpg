import Phaser from 'phaser'
import type { AttackStyle } from '../character/characterSpriteRegistry'
import type { Facing } from '../movement/clickToMove'
import type { PlayerDisplay } from '../player/playerSprites'
import { setPlayerHitFlash } from '../player/playerSprites'
import type { AttackVariant } from '../player/playerCombatAnim'

export type FloatStyle = 'hit' | 'crit' | 'critMagic' | 'miss' | 'mobHitPlayer'

export type DamageFloatVariant = 'hit' | 'critPhysical' | 'critMagic' | 'miss'

const STYLE_COLORS: Record<Exclude<FloatStyle, 'crit' | 'critMagic'>, string> = {
  hit: '#fef08a',
  miss: '#9ca3af',
  mobHitPlayer: '#fca5a5',
}

const CRIT_PHYSICAL = { fill: '#c4a574', stroke: '#5c4033' }
const CRIT_MAGIC = { fill: '#7dd3fc', stroke: '#1e3a5f' }

function drawCritBurst(scene: Phaser.Scene, x: number, y: number, magic: boolean) {
  const g = scene.add.graphics()
  g.setPosition(x, y)
  const color = magic ? 0x7dd3fc : 0xc4a574
  g.lineStyle(2, color, 0.85)
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    g.lineBetween(0, 0, Math.cos(a) * 14, Math.sin(a) * 10)
  }
  scene.tweens.add({
    targets: g,
    alpha: 0,
    scaleX: 1.35,
    scaleY: 1.35,
    duration: 400,
    onComplete: () => g.destroy(),
  })
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

  const isCritPhysical = variant === 'critPhysical'
  const isCritMagic = variant === 'critMagic'
  const isCrit = isCritPhysical || isCritMagic
  const label = String(damage)

  if (isCrit) {
    drawCritBurst(scene, x, y - 4, isCritMagic)
  }

  const style = isCritPhysical ? CRIT_PHYSICAL : isCritMagic ? CRIT_MAGIC : { fill: STYLE_COLORS.hit, stroke: '#1f2937' }
  const text = scene.add
    .text(x, y, label, {
      fontSize: isCrit ? '14px' : '12px',
      color: style.fill,
      fontStyle: isCrit ? 'bold' : undefined,
      stroke: style.stroke,
      strokeThickness: isCrit ? 3 : 1,
    })
    .setOrigin(0.5)

  const duration = isCrit ? 2000 : 550
  const rise = isCrit ? -36 : -28

  scene.tweens.add({
    targets: text,
    y: y + rise,
    duration,
    ease: isCrit ? 'Sine.easeOut' : 'Linear',
  })
  scene.tweens.add({
    targets: text,
    alpha: 0,
    delay: isCrit ? duration - 400 : 0,
    duration: isCrit ? 400 : duration,
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
      ? CRIT_PHYSICAL.fill
      : style === 'critMagic'
        ? CRIT_MAGIC.fill
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
    duration: 550,
    onComplete: () => label.destroy(),
  })
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
  const container = display.container
  const playerX = container.x
  const playerY = container.y
  const bash = options.variant === 'bash'

  const offset = { x: 0, y: 0 }
  switch (facing) {
    case 'up':
      offset.y = -8
      break
    case 'down':
      offset.y = 8
      break
    case 'left':
      offset.x = -8
      break
    case 'right':
      offset.x = 8
      break
  }

  const sx = playerX + (facing === 'left' ? -20 : facing === 'right' ? 20 : 0)
  const sy = playerY + (facing === 'up' ? -20 : facing === 'down' ? 20 : 0)
  const slashDepth = container.depth + 0.08

  if (options.attackStyle === 'swing') {
    drawSwingSlash(scene, sx, sy, facing, bash, slashDepth)
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
    const thrustRot = options.attackStyle === 'thrust' ? (facing === 'left' ? -0.15 : 0.15) : 0
    if (thrustRot !== 0) slash.setRotation(thrustRot)
    scene.tweens.add({
      targets: slash,
      alpha: 0,
      rotation: thrustRot + (options.attackStyle === 'thrust' ? thrustRot * 2 : 0),
      duration: bash ? 200 : 150,
      onComplete: () => slash.destroy(),
    })
  }

  const startX = container.x
  const startY = container.y
  scene.tweens.add({
    targets: container,
    x: startX + offset.x,
    y: startY + offset.y,
    duration: 90,
    yoyo: true,
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
