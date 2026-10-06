export type MinimapWorldRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MinimapPoint = {
  x: number
  y: number
}

export type MinimapRemote = MinimapPoint & {
  characterId: string
}

export type MinimapMob = MinimapPoint & {
  spawnIndex: number
}

export type MinimapPayload = {
  mapId: string
  worldWidth: number
  worldHeight: number
  view: MinimapWorldRect
  localPlayer: MinimapPoint
  remotes: MinimapRemote[]
  mobs: MinimapMob[]
}
