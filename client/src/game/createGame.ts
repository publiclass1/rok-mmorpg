import Phaser from 'phaser'
import type { CharacterSessionState } from './character/characterState'
import type { CharacterRow, NpcRow } from '../types/database'
import { WorldScene } from './scenes/WorldScene'

/** Internal render size; Scale.FIT scales this canvas to the fullscreen host. */
export const GAME_VIEW_WIDTH = 1280
export const GAME_VIEW_HEIGHT = 720

export function createPhaserGame(
  parent: HTMLElement,
  character: CharacterRow,
  npcs: NpcRow[],
  bootSession: CharacterSessionState,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_VIEW_WIDTH,
    height: GAME_VIEW_HEIGHT,
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
        game.registry.set('bootSession', bootSession)
      },
    },
  })
}

export function startWorldScene(game: Phaser.Game, character: CharacterRow, npcs: NpcRow[]) {
  game.scene.start('WorldScene', { character, npcs })
}
