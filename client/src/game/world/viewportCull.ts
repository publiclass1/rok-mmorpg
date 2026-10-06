import Phaser from 'phaser'

export type ViewBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

export const VIEW_CULL_MARGIN_PX = 96

export function viewBoundsWithMargin(cam: Phaser.Cameras.Scene2D.Camera, margin = VIEW_CULL_MARGIN_PX): ViewBounds {
  const view = cam.worldView
  return {
    left: view.x - margin,
    right: view.x + view.width + margin,
    top: view.y - margin,
    bottom: view.y + view.height + margin,
  }
}

export function pointInView(x: number, y: number, bounds: ViewBounds): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
}

export function cameraWorldViewRect(cam: Phaser.Cameras.Scene2D.Camera) {
  const view = cam.worldView
  return {
    x: view.x,
    y: view.y,
    width: view.width,
    height: view.height,
  }
}
