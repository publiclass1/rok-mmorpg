import Phaser from 'phaser'
import type { CharacterRow, NpcRow } from '../types/database'
import { WorldScene } from './scenes/WorldScene'

export function createPhaserGame(
  parent: HTMLElement,
  character: CharacterRow,
  npcs: NpcRow[],
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: '#0f172a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [WorldScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('bootCharacter', character)
        game.registry.set('bootNpcs', npcs)
      },
    },
  })
}

export function startWorldScene(game: Phaser.Game, character: CharacterRow, npcs: NpcRow[]) {
  game.scene.start('WorldScene', { character, npcs })
}
