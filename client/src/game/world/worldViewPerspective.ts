import Phaser from 'phaser'

export {
  WORLD_Y_SCALE_MIN,
  WORLD_Y_SCALE_MAX,
  WORLD_Y_SCALE_DEFAULT,
  clampWorldYScale,
  loadWorldYScale,
  saveWorldYScale,
} from './worldViewPerspectiveConfig'

export {
  registerWorldRoot,
  getWorldRoot,
  attachToWorldRoot,
  applyWorldYScale,
} from './worldViewRootAttach'

/** Map logical world feet position to screen pixels (respects perspective root + camera). */
export function worldCoordsToScreen(
  cam: Phaser.Cameras.Scene2D.Camera,
  worldX: number,
  worldY: number,
  worldRoot: Phaser.GameObjects.Container | null = null,
): { x: number; y: number } {
  let wx = worldX
  let wy = worldY
  if (worldRoot) {
    const matrix = worldRoot.getWorldTransformMatrix()
    const out = new Phaser.Math.Vector2()
    matrix.transformPoint(worldX, worldY, out)
    wx = out.x
    wy = out.y
  }
  return {
    x: (wx - cam.scrollX) * cam.zoom + cam.width * 0.5,
    y: (wy - cam.scrollY) * cam.zoom + cam.height * 0.5,
  }
}
