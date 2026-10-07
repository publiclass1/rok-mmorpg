import { getItemIconUrl } from '../character/itemCatalog'

const textureKeyForItem = (itemId: string) => `equip_icon_${itemId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export const EQUIP_PLACEHOLDER_TEXTURE = 'equip_placeholder'

const inflight = new Set<string>()

export function ensureEquipPlaceholderTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(EQUIP_PLACEHOLDER_TEXTURE)) return EQUIP_PLACEHOLDER_TEXTURE
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 0.01)
  g.fillRect(0, 0, 1, 1)
  g.generateTexture(EQUIP_PLACEHOLDER_TEXTURE, 1, 1)
  g.destroy()
  return EQUIP_PLACEHOLDER_TEXTURE
}

/** Load item SVG/PNG into the scene texture manager (cached per item id). */
export function ensureItemEquipIconTexture(
  scene: Phaser.Scene,
  itemId: string,
  onReady: (textureKey: string) => void,
): void {
  const url = getItemIconUrl(itemId)
  if (!url) return

  const key = textureKeyForItem(itemId)
  if (scene.textures.exists(key)) {
    onReady(key)
    return
  }

  if (inflight.has(key)) {
    const poll = () => {
      if (scene.textures.exists(key)) onReady(key)
      else window.setTimeout(poll, 16)
    }
    poll()
    return
  }

  inflight.add(key)
  const img = new Image()
  img.onload = () => {
    inflight.delete(key)
    if (!scene.textures.exists(key)) {
      scene.textures.addImage(key, img)
    }
    onReady(key)
  }
  img.onerror = () => {
    inflight.delete(key)
  }
  img.src = url
}
