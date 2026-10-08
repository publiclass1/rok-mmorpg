export type DecorFootprintRect = { x: number; y: number; width: number; height: number }

export type DecorAssetId =
  | 'river'
  | 'lake'
  | 'canal'
  | 'stones'
  | 'tree'
  | 'tree_small'
  | 'tree_large'
  | 'tree_oak'
  | 'tree_pine'
  | 'house'
  | 'large_house'
  | 'large_house_b'
  | 'castle'
  | 'sanctuary'
  | 'kafra_hq'
  | 'shop_weapon'
  | 'shop_armor'
  | 'shop_tool'
  | 'inn'
  | 'fountain'
  | 'gate'
  | 'wall_tower'
  | 'bridge_h'
  | 'bridge_v'
  | 'lamp_post'
  | 'bush'

export type DecorAssetDef = {
  id: DecorAssetId
  label: string
  /** Public URL path */
  src: string
  width: number
  height: number
  /** Sort with Y (feet); false = flat on ground (water) */
  ySort: boolean
  /** Depth for flat decor (water / bridge) */
  flatDepth?: number
  footprint?: DecorFootprintRect
  footprints?: DecorFootprintRect[]
  /** Walkable deck: blocking decor underneath (e.g. canal) is ignored where this overlaps */
  clearsBelow?: boolean
}

const buildingBody = (w: number, h: number, inset = 12, baseH = 72): DecorFootprintRect => ({
  x: inset,
  y: h - baseH,
  width: w - inset * 2,
  height: baseH,
})

const treeTrunk = (w: number, h: number): DecorFootprintRect => ({
  x: w * 0.38,
  y: h - 28,
  width: w * 0.24,
  height: 28,
})

export const DECOR_ASSETS: DecorAssetDef[] = [
  { id: 'river', label: 'River', src: '/maps/decor/river.svg', width: 128, height: 48, ySort: false, flatDepth: 1 },
  { id: 'lake', label: 'Lake', src: '/maps/decor/lake.svg', width: 128, height: 96, ySort: false, flatDepth: 1 },
  {
    id: 'canal',
    label: 'Canal',
    src: '/maps/decor/canal.svg',
    width: 128,
    height: 128,
    ySort: false,
    flatDepth: 1,
    footprint: { x: 0, y: 0, width: 128, height: 128 },
  },
  {
    id: 'stones',
    label: 'Stones',
    src: '/maps/decor/stones.svg',
    width: 64,
    height: 48,
    ySort: true,
    footprint: { x: 4, y: 20, width: 56, height: 28 },
  },
  {
    id: 'tree',
    label: 'Tree (medium)',
    src: '/maps/decor/tree.svg',
    width: 128,
    height: 176,
    ySort: true,
    footprint: treeTrunk(128, 176),
  },
  {
    id: 'tree_small',
    label: 'Tree (small)',
    src: '/maps/decor/tree_small.svg',
    width: 96,
    height: 144,
    ySort: true,
    footprint: treeTrunk(96, 144),
  },
  {
    id: 'tree_large',
    label: 'Tree (large)',
    src: '/maps/decor/tree_large.svg',
    width: 160,
    height: 224,
    ySort: true,
    footprint: treeTrunk(160, 224),
  },
  {
    id: 'tree_oak',
    label: 'Oak',
    src: '/maps/decor/tree_oak.svg',
    width: 192,
    height: 240,
    ySort: true,
    footprint: treeTrunk(192, 240),
  },
  {
    id: 'tree_pine',
    label: 'Pine',
    src: '/maps/decor/tree_pine.svg',
    width: 112,
    height: 208,
    ySort: true,
    footprint: treeTrunk(112, 208),
  },
  {
    id: 'house',
    label: 'House',
    src: '/maps/decor/house.svg',
    width: 160,
    height: 144,
    ySort: true,
    footprint: buildingBody(160, 144, 10, 64),
  },
  {
    id: 'large_house',
    label: 'Townhouse',
    src: '/maps/decor/large_house.svg',
    width: 224,
    height: 192,
    ySort: true,
    footprint: buildingBody(224, 192, 14, 80),
  },
  {
    id: 'large_house_b',
    label: 'Townhouse B',
    src: '/maps/decor/large_house_b.svg',
    width: 224,
    height: 192,
    ySort: true,
    footprint: buildingBody(224, 192, 14, 80),
  },
  {
    id: 'castle',
    label: 'Castle',
    src: '/maps/decor/castle.svg',
    width: 576,
    height: 416,
    ySort: true,
    footprint: { x: 48, y: 300, width: 480, height: 116 },
  },
  {
    id: 'sanctuary',
    label: 'Sanctuary',
    src: '/maps/decor/sanctuary.svg',
    width: 320,
    height: 320,
    ySort: true,
    footprint: buildingBody(320, 320, 24, 96),
  },
  {
    id: 'kafra_hq',
    label: 'Kafra HQ',
    src: '/maps/decor/kafra_hq.svg',
    width: 288,
    height: 224,
    ySort: true,
    footprint: buildingBody(288, 224, 16, 76),
  },
  {
    id: 'shop_weapon',
    label: 'Weapon shop',
    src: '/maps/decor/shop_weapon.svg',
    width: 192,
    height: 176,
    ySort: true,
    footprint: buildingBody(192, 176, 12, 68),
  },
  {
    id: 'shop_armor',
    label: 'Armor shop',
    src: '/maps/decor/shop_armor.svg',
    width: 192,
    height: 176,
    ySort: true,
    footprint: buildingBody(192, 176, 12, 68),
  },
  {
    id: 'shop_tool',
    label: 'Tool shop',
    src: '/maps/decor/shop_tool.svg',
    width: 192,
    height: 176,
    ySort: true,
    footprint: buildingBody(192, 176, 12, 68),
  },
  {
    id: 'inn',
    label: 'Inn',
    src: '/maps/decor/inn.svg',
    width: 192,
    height: 176,
    ySort: true,
    footprint: buildingBody(192, 176, 12, 68),
  },
  {
    id: 'fountain',
    label: 'Fountain',
    src: '/maps/decor/fountain.svg',
    width: 192,
    height: 192,
    ySort: true,
    footprint: { x: 24, y: 120, width: 144, height: 72 },
  },
  {
    id: 'gate',
    label: 'Gate',
    src: '/maps/decor/gate.svg',
    width: 224,
    height: 192,
    ySort: true,
    footprints: [
      { x: 8, y: 112, width: 48, height: 80 },
      { x: 168, y: 112, width: 48, height: 80 },
    ],
  },
  {
    id: 'wall_tower',
    label: 'Wall tower',
    src: '/maps/decor/wall_tower.svg',
    width: 96,
    height: 176,
    ySort: true,
    footprint: { x: 8, y: 88, width: 80, height: 88 },
  },
  {
    id: 'bridge_h',
    label: 'Bridge (H)',
    src: '/maps/decor/bridge_h.svg',
    width: 192,
    height: 128,
    ySort: false,
    flatDepth: 1.5,
    clearsBelow: true,
    footprints: [
      { x: 0, y: 72, width: 12, height: 56 },
      { x: 180, y: 72, width: 12, height: 56 },
    ],
  },
  {
    id: 'bridge_v',
    label: 'Bridge (V)',
    src: '/maps/decor/bridge_v.svg',
    width: 128,
    height: 192,
    ySort: false,
    flatDepth: 1.5,
    clearsBelow: true,
    footprints: [
      { x: 72, y: 0, width: 56, height: 12 },
      { x: 72, y: 180, width: 56, height: 12 },
    ],
  },
  { id: 'lamp_post', label: 'Lamp', src: '/maps/decor/lamp_post.svg', width: 32, height: 96, ySort: true },
  {
    id: 'bush',
    label: 'Bush',
    src: '/maps/decor/bush.svg',
    width: 64,
    height: 48,
    ySort: true,
    footprint: { x: 8, y: 28, width: 48, height: 20 },
  },
]

export const DECOR_DRAG_MIME = 'application/x-map-decor-asset'

export function getDecorAsset(id: string): DecorAssetDef | undefined {
  return DECOR_ASSETS.find((a) => a.id === id)
}
