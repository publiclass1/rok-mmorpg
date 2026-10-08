import type Phaser from 'phaser'
import { clampWorldYScale } from './worldViewPerspectiveConfig'

const WORLD_ROOT_REGISTRY_KEY = 'worldPerspectiveRoot'

export function registerWorldRoot(scene: Phaser.Scene, root: Phaser.GameObjects.Container): void {
  scene.registry.set(WORLD_ROOT_REGISTRY_KEY, root)
}

export function getWorldRoot(scene: Phaser.Scene): Phaser.GameObjects.Container | null {
  const root = scene.registry.get(WORLD_ROOT_REGISTRY_KEY) as Phaser.GameObjects.Container | undefined
  return root?.scene ? root : null
}

/** Parent world visuals under the shared perspective root (no-op if root missing). */
export function attachToWorldRoot(
  scene: Phaser.Scene,
  ...objects: Phaser.GameObjects.GameObject[]
): void {
  const root = getWorldRoot(scene)
  if (!root) return
  for (const obj of objects) {
    if (obj.scene) root.add(obj)
  }
}

export function applyWorldYScale(
  root: Phaser.GameObjects.Container,
  yScale: number,
): number {
  const clamped = clampWorldYScale(yScale)
  root.setScale(1, clamped)
  return clamped
}
