import Phaser from 'phaser'
import { applyPoseToSprite } from '../character/characterSpriteAnim'
import { defaultCharacterPose, type CharacterPose } from '../character/characterPose'
import { SPRITE_FRAME_HEIGHT, SPRITE_FRAME_WIDTH } from '../character/characterSpriteRegistry'
import { MOUNT_BODY_Y_OFFSET, WORLD_VISIBLE_EQUIP_LAYERS } from './playerDisplayLayers'
import { syncEquipmentTransforms } from './playerEquipmentVisual'
import { playerDisplayScene, type PlayerDisplay } from './playerSprites'

/** Visible bust crop from the idle-down frame (top ~56% of sprite). */
const PORTRAIT_CROP_H = 36

function applyHudPortraitPose(display: PlayerDisplay) {
  if (!playerDisplayScene(display)) return
  display.riderLayer.setY(0)
  display.body.setY(0)
  display.body.anims?.stop()
  display.body.clearTint()
  applyPoseToSprite(display.body, display.textureKey, display.spriteDef, display.pose)
  syncEquipmentTransforms(display)
}

function restorePlayerPose(display: PlayerDisplay, pose: CharacterPose) {
  display.pose = pose
  display.riderLayer.setY(pose.mounted ? MOUNT_BODY_Y_OFFSET : 0)
  applyHudPortraitPose(display)
}

function blitGameObject(
  ctx: CanvasRenderingContext2D,
  feetX: number,
  feetY: number,
  go: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
) {
  if (!go.visible || go.alpha <= 0) return
  const frame = go.frame
  const source = frame.source.image as CanvasImageSource
  const dispW = go.displayWidth
  const dispH = go.displayHeight
  const x = feetX + go.x - go.originX * dispW
  const y = feetY + go.y - go.originY * dispH
  ctx.save()
  if (go.flipX) {
    ctx.translate(x + dispW, y)
    ctx.scale(-1, 1)
    ctx.drawImage(
      source,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      dispW,
      dispH,
    )
  } else {
    ctx.drawImage(
      source,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      x,
      y,
      dispW,
      dispH,
    )
  }
  ctx.restore()
}

/** Rasterize the same rig used in-world (palette + headgear) for the HUD bust. */
export function capturePlayerHudPortrait(
  _scene: Phaser.Scene,
  display: PlayerDisplay,
): string | null {
  const savedPose = { ...display.pose }

  display.pose = { ...defaultCharacterPose('down'), anim: 'idle', mounted: false }
  applyHudPortraitPose(display)

  const w = SPRITE_FRAME_WIDTH
  const fullH = SPRITE_FRAME_HEIGHT
  const feetX = w / 2
  const feetY = fullH

  const full = document.createElement('canvas')
  full.width = w
  full.height = fullH
  const ctx = full.getContext('2d')
  if (!ctx) {
    restorePlayerPose(display, savedPose)
    return null
  }
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, fullH)

  blitGameObject(ctx, feetX, feetY, display.body)
  for (const slot of WORLD_VISIBLE_EQUIP_LAYERS) {
    const layer = display.layers[slot]
    if (layer) blitGameObject(ctx, feetX, feetY, layer)
  }

  const out = document.createElement('canvas')
  out.width = w
  out.height = PORTRAIT_CROP_H
  const outCtx = out.getContext('2d')
  if (!outCtx) {
    restorePlayerPose(display, savedPose)
    return null
  }
  outCtx.imageSmoothingEnabled = false
  outCtx.drawImage(full, 0, 0, w, PORTRAIT_CROP_H, 0, 0, w, PORTRAIT_CROP_H)

  const url = out.toDataURL('image/png')
  restorePlayerPose(display, savedPose)
  return url
}
