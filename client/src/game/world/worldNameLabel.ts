import Phaser from 'phaser'

export const PLAYER_NAME_OFFSET_BELOW = 10
/** Skill name callout sits above the feet anchor (negative Y from feet). */
export const PLAYER_SKILL_CALLOUT_OFFSET_ABOVE = 42
/** iRO-style cast gauge (black + green fill), above skill name. */
export const PLAYER_CAST_BAR_OFFSET_ABOVE = 56
/** Greek spell incantation, above cast bar. */
export const PLAYER_SPELL_CHANT_OFFSET_ABOVE = 74

export function styleSpellChantLabel(text: Phaser.GameObjects.Text) {
  text
    .setFontSize(10)
    .setColor('#e9d5ff')
    .setStroke('#4c1d95', 3)
    .setFontStyle('italic')
}

export function positionPlayerSpellChant(text: Phaser.GameObjects.Text, feetX: number, feetY: number) {
  text.setOrigin(0.5, 1)
  text.setPosition(feetX, feetY - PLAYER_SPELL_CHANT_OFFSET_ABOVE)
}

export function styleWorldNameLabel(text: Phaser.GameObjects.Text, color = '#ffffff') {
  text.setFontSize(11).setColor(color).setStroke('#0f172a', 3)
}

export function styleSkillCalloutLabel(text: Phaser.GameObjects.Text) {
  text.setFontSize(12).setColor('#fde68a').setStroke('#78350f', 4).setFontStyle('bold')
}

export function positionSkillCalloutLabel(text: Phaser.GameObjects.Text, feetX: number, feetY: number) {
  text.setOrigin(0.5, 1)
  text.setPosition(feetX, feetY - PLAYER_SKILL_CALLOUT_OFFSET_ABOVE)
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
