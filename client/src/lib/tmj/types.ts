/** Tiled map JSON (TMJ) subset used by this project. */

export const TILE_SIZE = 32

/** GID 1–4: wall, grass A, grass B, path (see textures.ts) */
export const GID_WALL = 1
export const GID_GRASS_A = 2
export const GID_GRASS_B = 3
export const GID_PATH = 4

export type TmjTileset = {
  columns: number
  firstgid: number
  image: string
  imagewidth: number
  imageheight: number
  margin: number
  name: string
  spacing: number
  tilecount: number
  tileheight: number
  tilewidth: number
}

export type TmjTileLayer = {
  data: number[]
  height: number
  id: number
  name: string
  opacity: number
  type: 'tilelayer'
  visible: boolean
  width: number
  x: number
  y: number
}

export type TmjObjectProperty = {
  name: string
  type: string
  value: string | number | boolean
}

export type TmjMapObject = {
  id: number
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  properties?: TmjObjectProperty[]
}

export type TmjObjectGroup = {
  id: number
  name: string
  opacity: number
  type: 'objectgroup'
  visible: boolean
  x: number
  y: number
  objects: TmjMapObject[]
}

export type TmjMap = {
  compressionlevel: number
  infinite: boolean
  orientation: string
  renderorder: string
  tiledversion: string
  tileheight: number
  tilewidth: number
  type: 'map'
  version: string
  width: number
  height: number
  tilesets: TmjTileset[]
  nextlayerid: number
  nextobjectid: number
  layers: Array<TmjTileLayer | TmjObjectGroup>
}

export type PortalObjectProps = {
  portalId: string
  targetMapId: string
  targetX: number
  targetY: number
  label: string
  mode: 'walk' | 'npc' | 'both'
}
