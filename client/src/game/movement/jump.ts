import Phaser from 'phaser'

export function tryJump(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  isJumping: () => boolean,
  setJumping: (v: boolean) => void,
): boolean {
  if (isJumping()) return false
  setJumping(true)
  const startY = sprite.y
  scene.tweens.add({
    targets: sprite,
    y: startY - 12,
    duration: 140,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      sprite.y = startY
      setJumping(false)
    },
  })
  return true
}
