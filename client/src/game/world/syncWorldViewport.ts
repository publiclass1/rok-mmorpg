import Phaser from 'phaser'
import type { MobInstance } from '../combat/mobTypes'
import type { RemotePlayerEntity } from '../realtime/remotePlayers'
import type { NpcWorldVisual } from '../npc/npcWorldVisual'
import { pointInView, type ViewBounds } from './viewportCull'

export function setMobViewportVisible(mob: MobInstance, inView: boolean) {
  const dying = !mob.alive && mob.sprite.visible && mob.sprite.alpha > 0.01
  const show = inView && (mob.alive || dying)
  mob.sprite.setVisible(show)
  if (mob.alive) {
    mob.hpBarBg.setVisible(show)
    mob.hpBarFill.setVisible(show)
    mob.label.setVisible(show)
  } else if (!show) {
    mob.hpBarBg.setVisible(false)
    mob.hpBarFill.setVisible(false)
    mob.label.setVisible(false)
  }
}

export function setRemoteViewportVisible(entity: RemotePlayerEntity, inView: boolean) {
  entity.inViewport = inView
  entity.display.container.setVisible(inView)
  if (!inView) {
    entity.label.setVisible(false)
  }
}

export function setNpcViewportVisible(npc: NpcWorldVisual, inView: boolean) {
  npc.sprite.setVisible(inView)
  npc.label.setVisible(inView)
  npc.counterLine?.setVisible(inView)
}

export function setDecorViewportVisible(decor: Phaser.GameObjects.Image, inView: boolean) {
  decor.setVisible(inView)
}

export function entityInView(bounds: ViewBounds, x: number, y: number): boolean {
  return pointInView(x, y, bounds)
}
