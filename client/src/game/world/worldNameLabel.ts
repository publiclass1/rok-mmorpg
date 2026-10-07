import Phaser from 'phaser'

export const PLAYER_NAME_OFFSET_BELOW = 10

export function styleWorldNameLabel(text: Phaser.GameObjects.Text, color = '#ffffff') {
  text.setFontSize(11).setColor(color).setStroke('#0f172a', 3)
}

/** Player names sit below the feet anchor (container x/y). */
export function positionPlayerNameLabel(
  text: Phaser.GameObjects.Text,
  feetX: number,
  feetY: number,
) {
  text.setOrigin(0.5, 0)
  text.setPosition(feetX, feetY + PLAYER_NAME_OFFSET_BELOW)
}
