import Phaser from 'phaser'

export function tryJump(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { y: number },
  isJumping: () => boolean,
  setJumping: (v: boolean) => void,
): boolean {
  if (isJumping()) return false
  setJumping(true)
  const startY = target.y
  scene.tweens.add({
    targets: target,
    y: startY - 12,
    duration: 140,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      target.y = startY
      setJumping(false)
    },
  })
  return true
}
