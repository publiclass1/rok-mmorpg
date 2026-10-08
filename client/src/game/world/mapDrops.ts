import Phaser from 'phaser'
import { addItemsToSessionInventory } from '../character/sessionInventory'
import type { CharacterSessionState } from '../character/characterState'
import { ensureItemEquipIconTexture } from '../player/itemEquipIconTexture'
import { createMapDropRarityFx, destroyMapDropRarityFx, type MapDropRarityFx } from './mapDropRarityFx'

// Pickup range is measured in pixels; maps use 32px tiles (e.g. prontera.tmj).
// Keep this tight so pickup only happens when you're close to the drop.
const PICKUP_RANGE = 16
const HOVER_RADIUS = 18

export type MapDropVisual = {
  dropId: string
  itemId: string
  sprite: Phaser.GameObjects.Image
  rarityFx?: MapDropRarityFx
  x: number
  y: number
  ownerCharacterId?: string
  availableAt?: number
  expiresAt?: number
}

export class MapDropManager {
  private readonly drops = new Map<string, MapDropVisual>()
  private scene: Phaser.Scene
  private onPickup: (dropId: string, itemId: string) => void

  constructor(scene: Phaser.Scene, onPickup: (dropId: string, itemId: string) => void) {
    this.scene = scene
    this.onPickup = onPickup
  }

  findDropAt(wx: number, wy: number): { dropId: string; itemId: string; x: number; y: number } | null {
    let best: { dropId: string; itemId: string; x: number; y: number; dist: number } | null = null
    for (const d of this.drops.values()) {
      const dist = Phaser.Math.Distance.Between(wx, wy, d.x, d.y)
      if (dist <= HOVER_RADIUS && (!best || dist < best.dist)) {
        best = { dropId: d.dropId, itemId: d.itemId, x: d.x, y: d.y, dist }
      }
    }
    return best ? { dropId: best.dropId, itemId: best.itemId, x: best.x, y: best.y } : null
  }

  spawnDrop(dropId: string, itemId: string, x: number, y: number, metadata?: { ownerCharacterId?: string; availableAt?: string; expiresAt?: string }) {
    if (this.drops.has(dropId)) return
    const key = this.textureKey(itemId)
    const sprite = this.scene.add.image(x, y, key)
    sprite.setDisplaySize(24, 24)
    sprite.setOrigin(0.5, 0.5)
    sprite.setDepth(y)
    sprite.setInteractive({ useHandCursor: false })
    sprite.on('pointerdown', () => this.tryPickup(dropId))

    const rarityFx = createMapDropRarityFx(this.scene, x, y, itemId, y - 2)

    const expiresAt = metadata?.expiresAt ? Date.parse(metadata.expiresAt) : undefined
    this.drops.set(dropId, {
      dropId, itemId, sprite, rarityFx, x, y,
      ownerCharacterId: metadata?.ownerCharacterId,
      availableAt: metadata?.availableAt ? Date.parse(metadata.availableAt) : undefined,
      expiresAt,
    })
    if (expiresAt) {
      this.scene.time.delayedCall(Math.max(0, expiresAt - Date.now()), () => this.removeDrop(dropId))
    }

    ensureItemEquipIconTexture(this.scene, itemId, (iconKey) => {
      const d = this.drops.get(dropId)
      if (!d) return
      d.sprite.setTexture(iconKey)
      d.sprite.setDisplaySize(24, 24)
    })
  }

  removeDrop(dropId: string) {
    const d = this.drops.get(dropId)
    if (!d) return
    destroyMapDropRarityFx(d.rarityFx)
    d.sprite.destroy()
    this.drops.delete(dropId)
  }

  clear() {
    for (const d of this.drops.values()) {
      destroyMapDropRarityFx(d.rarityFx)
      d.sprite.destroy()
    }
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
