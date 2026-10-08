import Phaser from 'phaser'
import type { PlayerDisplay } from '../player/playerSprites'
import { setPlayerHitFlash } from '../player/playerSprites'
import { ensureMobParticleTexture } from '../textures'
import { setDepthByFeet } from '../world/depthSort'
import { PLAYER_SKILL_CALLOUT_OFFSET_ABOVE } from '../world/worldNameLabel'

const BEAM_HEIGHT = 80
const BEAM_WIDTH = 16

const CONFETTI_TINTS = [0xff6b6b, 0xfbbf24, 0x34d399, 0x60a5fa, 0xc084fc, 0xf472b6]

const STYLE = {
  beam: 0x2dd4bf,
  beamCore: 0x99f6e4,
  title: 'JOB CHANGE!',
  titleColor: '#5eead4',
  stroke: '#134e4a',
}

function drawBeam(g: Phaser.GameObjects.Graphics, core: number, outer: number) {
  g.clear()
  const hw = BEAM_WIDTH / 2
  g.fillStyle(outer, 0.55)
  g.fillRoundedRect(-hw, -BEAM_HEIGHT, BEAM_WIDTH, BEAM_HEIGHT, 4)
  g.fillStyle(core, 0.75)
  g.fillRoundedRect(-hw + 2, -BEAM_HEIGHT + 4, BEAM_WIDTH - 4, BEAM_HEIGHT - 8, 3)
}

function spawnConfettiBurst(scene: Phaser.Scene, x: number, y: number) {
  ensureMobParticleTexture(scene)
  const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = []
  for (const tint of CONFETTI_TINTS) {
    const emitter = scene.add.particles(x, y - 6, 'mob_particle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 900 },
      scale: { start: 1.5, end: 0.2 },
      gravityY: 120,
      tint,
      emitting: false,
    })
    emitter.explode(6)
    emitters.push(emitter)
  }
  const center = scene.add.particles(x, y - 10, 'mob_particle', {
    speed: { min: 90, max: 200 },
    angle: { min: 240, max: 300 },
    lifespan: { min: 400, max: 750 },
    scale: { start: 1.8, end: 0 },
    gravityY: -30,
    tint: [0xfff9c4, 0xfde047],
    emitting: false,
  })
  center.explode(12)
  emitters.push(center)
  scene.time.delayedCall(1000, () => emitters.forEach((e) => e.destroy()))
}

function flashJobChangeTint(scene: Phaser.Scene, display: PlayerDisplay | undefined) {
  if (!display) return
  setPlayerHitFlash(display, true)
  scene.time.delayedCall(220, () => setPlayerHitFlash(display, false))
}

export function playJobChangeWorldFx(
  scene: Phaser.Scene,
  feetX: number,
  feetY: number,
  jobName: string,
  display?: PlayerDisplay,
): void {
  const feet = feetY

  const beam = scene.add.graphics()
  beam.setPosition(feetX, feetY)
  drawBeam(beam, STYLE.beamCore, STYLE.beam)
  beam.setScale(1, 0.12)
  beam.setAlpha(0)
  setDepthByFeet(beam, feet, -0.02)

  scene.tweens.add({
    targets: beam,
    scaleY: 1,
    alpha: 1,
    duration: 180,
    ease: 'Sine.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: beam,
        alpha: 0,
        scaleY: 1.12,
        delay: 680,
        duration: 420,
        ease: 'Sine.easeIn',
        onComplete: () => beam.destroy(),
      })
    },
  })

  spawnConfettiBurst(scene, feetX, feetY)
  flashJobChangeTint(scene, display)

  const labelY = feetY - PLAYER_SKILL_CALLOUT_OFFSET_ABOVE - 6
  const text = scene.add.text(feetX, labelY, `${STYLE.title}\n${jobName}`, {
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    fontStyle: 'bold',
    color: STYLE.titleColor,
    align: 'center',
    stroke: STYLE.stroke,
    strokeThickness: 4,
  })
  text.setOrigin(0.5, 1)
  text.setAlpha(0)
  setDepthByFeet(text, feet, 0.08)

  scene.tweens.add({
    targets: text,
    alpha: 1,
    y: labelY - 12,
    duration: 220,
    ease: 'Sine.easeOut',
  })
  scene.tweens.add({
    targets: text,
    alpha: 0,
    y: labelY - 26,
    delay: 900,
    duration: 360,
    ease: 'Sine.easeIn',
    onComplete: () => text.destroy(),
  })
}
