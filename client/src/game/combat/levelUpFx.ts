import Phaser from 'phaser'
import type { PlayerDisplay } from '../player/playerSprites'
import { setPlayerHitFlash } from '../player/playerSprites'
import { ensureMobParticleTexture } from '../textures'
import { setDepthByFeet } from '../world/depthSort'
import { PLAYER_SKILL_CALLOUT_OFFSET_ABOVE } from '../world/worldNameLabel'
import type { LevelUpKind } from './levelUpSteps'

const BEAM_HEIGHT = 72
const BEAM_WIDTH = 14

const KIND_STYLE: Record<
  LevelUpKind,
  {
    beam: number
    beamCore: number
    particle: number
    title: string
    levelLine: (lv: number) => string
    titleColor: string
    stroke: string
  }
> = {
  base: {
    beam: 0xffd54f,
    beamCore: 0xfff9c4,
    particle: 0xfbbf24,
    title: 'LEVEL UP!',
    levelLine: (lv) => `Lv ${lv}`,
    titleColor: '#fde047',
    stroke: '#78350f',
  },
  job: {
    beam: 0xc084fc,
    beamCore: 0xe9d5ff,
    particle: 0xa78bfa,
    title: 'JOB LEVEL UP!',
    levelLine: (lv) => `Job Lv ${lv}`,
    titleColor: '#e9d5ff',
    stroke: '#4c1d95',
  },
}

function drawBeam(g: Phaser.GameObjects.Graphics, core: number, outer: number) {
  g.clear()
  const hw = BEAM_WIDTH / 2
  g.fillStyle(outer, 0.55)
  g.fillRoundedRect(-hw, -BEAM_HEIGHT, BEAM_WIDTH, BEAM_HEIGHT, 4)
  g.fillStyle(core, 0.75)
  g.fillRoundedRect(-hw + 2, -BEAM_HEIGHT + 4, BEAM_WIDTH - 4, BEAM_HEIGHT - 8, 3)
}

function spawnLevelUpParticles(scene: Phaser.Scene, x: number, y: number, tint: number) {
  ensureMobParticleTexture(scene)
  const emitter = scene.add.particles(x, y - 8, 'mob_particle', {
    speed: { min: 50, max: 140 },
    angle: { min: 250, max: 290 },
    lifespan: { min: 350, max: 650 },
    scale: { start: 1.4, end: 0 },
    gravityY: -40,
    tint,
    emitting: false,
  })
  emitter.explode(18)
  scene.time.delayedCall(700, () => emitter.destroy())
}

function flashLevelUpTint(scene: Phaser.Scene, display: PlayerDisplay | undefined, kind: LevelUpKind) {
  if (!display) return
  setPlayerHitFlash(display, true)
  scene.time.delayedCall(kind === 'base' ? 180 : 160, () => setPlayerHitFlash(display, false))
}

export function playLevelUpWorldFx(
  scene: Phaser.Scene,
  feetX: number,
  feetY: number,
  kind: LevelUpKind,
  level: number,
  display?: PlayerDisplay,
): void {
  const style = KIND_STYLE[kind]
  const feet = feetY

  const beam = scene.add.graphics()
  beam.setPosition(feetX, feetY)
  drawBeam(beam, style.beamCore, style.beam)
  beam.setScale(1, 0.15)
  beam.setAlpha(0)
  setDepthByFeet(beam, feet, -0.02)

  scene.tweens.add({
    targets: beam,
    scaleY: 1,
    alpha: 1,
    duration: 160,
    ease: 'Sine.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: beam,
        alpha: 0,
        scaleY: 1.15,
        delay: 520,
        duration: 380,
        ease: 'Sine.easeIn',
        onComplete: () => beam.destroy(),
      })
    },
  })

  spawnLevelUpParticles(scene, feetX, feetY, style.particle)
  flashLevelUpTint(scene, display, kind)

  const labelY = feetY - PLAYER_SKILL_CALLOUT_OFFSET_ABOVE - 6
  const text = scene.add.text(feetX, labelY, `${style.title}\n${style.levelLine(level)}`, {
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    fontStyle: 'bold',
    color: style.titleColor,
    align: 'center',
    stroke: style.stroke,
    strokeThickness: 4,
  })
  text.setOrigin(0.5, 1)
  text.setAlpha(0)
  setDepthByFeet(text, feet, 0.08)

  scene.tweens.add({
    targets: text,
    alpha: 1,
    y: labelY - 10,
    duration: 200,
    ease: 'Sine.easeOut',
  })
  scene.tweens.add({
    targets: text,
    alpha: 0,
    y: labelY - 22,
    delay: 780,
    duration: 320,
    ease: 'Sine.easeIn',
    onComplete: () => text.destroy(),
  })
}
