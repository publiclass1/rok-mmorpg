export type GameCursor = 'default' | 'npc' | 'mob' | 'skillTarget' | 'aoe'

const CSS: Record<GameCursor, string> = {
  default: "url('/cursors/game-pointer.png') 2 2, default",
  npc: "url('/cursors/cursor-npc.png') 2 2, pointer",
  mob: "url('/cursors/cursor-sword.png') 2 2, crosshair",
  skillTarget: "url('/cursors/cursor-skill-target.png') 2 2, crosshair",
  aoe: "url('/cursors/cursor-aoe.png') 16 16, crosshair",
}

export function cursorCss(cursor: GameCursor): string {
  return CSS[cursor]
}
