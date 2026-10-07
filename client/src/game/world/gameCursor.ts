import type Phaser from 'phaser'

export type GameCursor = 'default' | 'npc' | 'loot' | 'mob' | 'skillTarget' | 'aoe'

const CSS: Record<GameCursor, string> = {
  default: "url('/cursors/game-pointer.png') 2 2, default",
  npc: "url('/cursors/cursor-npc.png') 2 2, pointer",
  loot: "url('/cursors/cursor-grab.png') 2 2, grab",
  mob: "url('/cursors/cursor-sword.png') 2 2, crosshair",
  skillTarget: "url('/cursors/cursor-skill-target.png') 2 2, crosshair",
  aoe: "url('/cursors/cursor-aoe.png') 16 16, crosshair",
}

export function cursorCss(cursor: GameCursor): string {
  return CSS[cursor]
}

/** Apply cursor to Phaser canvas and React host so CSS cannot override via inherit. */
export function applyGameCursorToDom(game: Phaser.Game, css: string): void {
  const canvas = game.canvas
  if (!canvas) return
  canvas.style.cursor = css
  const parent = canvas.parentElement
  if (parent?.classList.contains('game-canvas')) {
    parent.style.cursor = css
  }
}
