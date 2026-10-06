import Phaser from 'phaser'
import { DECOR_ASSETS } from '../../lib/mapDecor/catalog'
import { readDecorAssetId } from '../../lib/mapDecor/decorProps'
import { setDepthByFeet } from './depthSort'

export function preloadMapDecor(scene: Phaser.Scene): void {
  for (const asset of DECOR_ASSETS) {
    scene.load.image(`decor_${asset.id}`, asset.src)
  }
}

export function spawnMapDecor(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): Phaser.GameObjects.Image[] {
  const layer = tilemap.getObjectLayer('decor')
  if (!layer?.objects?.length) return []

  const sprites: Phaser.GameObjects.Image[] = []
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
    } else {
      img.setDepth(1)
    }
    sprites.push(img)
  }
  return sprites
}
