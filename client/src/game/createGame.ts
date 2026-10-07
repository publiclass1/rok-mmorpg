import Phaser from 'phaser'
import type { CharacterSessionState } from './character/characterState'
import type { CharacterRow, NpcRow } from '../types/database'
import { WorldScene } from './scenes/WorldScene'
import type { BootDungeonState } from './world/bootDungeon'

/** Initial render size; Scale.RESIZE grows/shrinks with the fullscreen host. */
export const GAME_VIEW_WIDTH = 1280
export const GAME_VIEW_HEIGHT = 720

export function createPhaserGame(
  parent: HTMLElement,
  character: CharacterRow,
  npcs: NpcRow[],
  bootSession: CharacterSessionState,
  bootDungeon: BootDungeonState | null = null,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_VIEW_WIDTH,
    height: GAME_VIEW_HEIGHT,
    backgroundColor: '#1a5c28',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [WorldScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('bootCharacter', character)
        game.registry.set('bootNpcs', npcs)
        game.registry.set('bootSession', bootSession)
        game.registry.set('bootDungeon', bootDungeon)
      },
    },
  })
}

export function startWorldScene(game: Phaser.Game, character: CharacterRow, npcs: NpcRow[]) {
  game.scene.start('WorldScene', { character, npcs })
}
