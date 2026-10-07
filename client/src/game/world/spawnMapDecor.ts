import Phaser from 'phaser'
import { DECOR_ASSETS } from '../../lib/mapDecor/catalog'
import { decorFootprintRects } from '../../lib/mapDecor/decorFootprints'
import { readDecorAssetId } from '../../lib/mapDecor/decorProps'
import { setDepthByFeet } from './depthSort'

export function preloadMapDecor(scene: Phaser.Scene): void {
  for (const asset of DECOR_ASSETS) {
    scene.load.image(`decor_${asset.id}`, asset.src)
  }
}

export type SpawnMapDecorResult = {
  sprites: Phaser.GameObjects.Image[]
  blockers: Phaser.GameObjects.Rectangle[]
}

export function spawnMapDecor(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): SpawnMapDecorResult {
  const layer = tilemap.getObjectLayer('decor')
  if (!layer?.objects?.length) return { sprites: [], blockers: [] }

  const sprites: Phaser.GameObjects.Image[] = []
  const tmjObjects = layer.objects as import('../../lib/tmj/types').TmjMapObject[]
  const footprintRects = decorFootprintRects(tmjObjects)
  const blockers: Phaser.GameObjects.Rectangle[] = []

  for (const rect of footprintRects) {
    if (rect.width <= 0 || rect.height <= 0) continue
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const body = scene.add.rectangle(cx, cy, rect.width, rect.height, 0x000000, 0)
    body.setVisible(false)
    scene.physics.add.existing(body, true)
    blockers.push(body)
  }

  for (const obj of layer.objects) {
    const assetId = readDecorAssetId(obj as import('../../lib/tmj/types').TmjMapObject)
    if (!assetId) continue
    const key = `decor_${assetId}`
    if (!scene.textures.exists(key)) continue

    const w = obj.width ?? 32
    const h = obj.height ?? 32
    const feetX = (obj.x ?? 0) + w / 2
    const feetY = (obj.y ?? 0) + h

    const img = scene.add.image(feetX, feetY, key)
    img.setOrigin(0.5, 1)
    img.setDisplaySize(w, h)

    const asset = DECOR_ASSETS.find((a) => a.id === assetId)
    if (asset?.ySort) {
      setDepthByFeet(img, feetY)
    } else if (asset?.flatDepth !== undefined) {
      img.setDepth(asset.flatDepth)
    } else {
      img.setDepth(1)
    }
    sprites.push(img)
  }
  return { sprites, blockers }
}
