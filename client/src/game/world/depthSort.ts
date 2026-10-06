import type Phaser from 'phaser'

/** Depth for Y-sorted pseudo-2.5D overlap (higher Y draws in front). */
export function depthFromFeet(feetY: number, epsilon = 0): number {
  return feetY + epsilon
}

export function setDepthByFeet(
  obj: Phaser.GameObjects.GameObject & { setDepth: (d: number) => unknown },
  feetY: number,
  epsilon = 0,
) {
  obj.setDepth(depthFromFeet(feetY, epsilon))
}
