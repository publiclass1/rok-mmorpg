import Phaser from 'phaser'
import { addItemsToSessionInventory } from '../character/sessionInventory'
import type { CharacterSessionState } from '../character/characterState'

const PICKUP_RANGE = 48

export type MapDropVisual = {
  dropId: string
  itemId: string
  sprite: Phaser.GameObjects.Image
  x: number
  y: number
}

export class MapDropManager {
  private readonly drops = new Map<string, MapDropVisual>()
  private scene: Phaser.Scene
  private onPickup: (dropId: string, itemId: string) => void

  constructor(scene: Phaser.Scene, onPickup: (dropId: string, itemId: string) => void) {
    this.scene = scene
    this.onPickup = onPickup
  }

  spawnDrop(dropId: string, itemId: string, x: number, y: number) {
    if (this.drops.has(dropId)) return
    const key = this.textureKey(itemId)
    const sprite = this.scene.add.image(x, y, key)
    sprite.setDisplaySize(24, 24)
    sprite.setOrigin(0.5, 0.5)
    sprite.setDepth(y)
    sprite.setInteractive({ useHandCursor: true })
    sprite.on('pointerdown', () => this.tryPickup(dropId))
    this.drops.set(dropId, { dropId, itemId, sprite, x, y })
  }

  removeDrop(dropId: string) {
    const d = this.drops.get(dropId)
    if (!d) return
    d.sprite.destroy()
    this.drops.delete(dropId)
  }

  clear() {
    for (const d of this.drops.values()) d.sprite.destroy()
    this.drops.clear()
  }

  tickPlayerProximity(px: number, py: number) {
    for (const d of this.drops.values()) {
      if (Phaser.Math.Distance.Between(px, py, d.x, d.y) <= PICKUP_RANGE) {
        this.tryPickup(d.dropId)
      }
    }
  }

  private tryPickup(dropId: string) {
    const d = this.drops.get(dropId)
    if (!d) return
    this.onPickup(d.dropId, d.itemId)
  }

  private textureKey(itemId: string): string {
    if (itemId === 'skull' && this.scene.textures.exists('map_drop_skull')) {
      return 'map_drop_skull'
    }
    const key = `map_drop_${itemId}`
    if (!this.scene.textures.exists(key)) {
      this.scene.textures.addBase64(
        key,
        `data:image/svg+xml;base64,${btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#334155"/></svg>',
        )}`,
      )
    }
    return key
  }
}

export function applyPickupToSession(
  session: CharacterSessionState,
  itemId: string,
): CharacterSessionState {
  return {
    ...session,
    sessionInventory: addItemsToSessionInventory(session.sessionInventory, [itemId]),
  }
}
