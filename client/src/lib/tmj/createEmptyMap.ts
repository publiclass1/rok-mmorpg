import { GID_GRASS_A, GID_WALL, TILE_SIZE, type TmjMap, type TmjTileLayer } from './types'

function fillLayer(width: number, height: number, value: number): number[] {
  return Array.from({ length: width * height }, () => value)
}

function makeGroundLayer(width: number, height: number, id: number): TmjTileLayer {
  const data = fillLayer(width, height, GID_GRASS_A)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        data[y * width + x] = GID_WALL
      }
    }
  }
  return {
    data,
    height,
    id,
    name: 'ground',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width,
    x: 0,
    y: 0,
  }
}

function makeCollisionLayer(width: number, height: number, id: number): TmjTileLayer {
  const data = fillLayer(width, height, 0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        data[y * width + x] = GID_WALL
      }
    }
  }
  return {
    data,
    height,
    id,
    name: 'collision',
    opacity: 1,
    type: 'tilelayer',
    visible: false,
    width,
    x: 0,
    y: 0,
  }
}

export function createEmptyMap(width = 30, height = 20): TmjMap {
  return {
    compressionlevel: -1,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TILE_SIZE,
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width,
    height,
    tilesets: [
      {
        columns: 4,
        firstgid: 1,
        image: 'tiles.png',
        imagewidth: 128,
        imageheight: 32,
        margin: 0,
        name: 'tiles',
        spacing: 0,
        tilecount: 4,
        tileheight: TILE_SIZE,
        tilewidth: TILE_SIZE,
      },
    ],
    nextlayerid: 6,
    nextobjectid: 1,
    layers: [
      makeGroundLayer(width, height, 1),
      makeCollisionLayer(width, height, 2),
      {
        id: 3,
        name: 'obstacles',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
      {
        id: 4,
        name: 'portals',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
      {
        id: 5,
        name: 'decor',
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
        objects: [],
      },
    ],
  }
}
