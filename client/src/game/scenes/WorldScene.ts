import Phaser from 'phaser'
import { emitGameEvent } from '../events'
import { MapPresenceChannel } from '../realtime/mapChannel'
import { supabase } from '../../lib/supabase'
import type { CharacterRow, NpcRow } from '../../types/database'

const SPEED = 160
const INTERACT_RANGE = 64

export class WorldScene extends Phaser.Scene {
  private character!: CharacterRow
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }

  private npcs: NpcRow[] = []
  private npcSprites: Phaser.GameObjects.Rectangle[] = []
  private presence: MapPresenceChannel | null = null
  private remoteSprites = new Map<string, Phaser.GameObjects.Container>()
  private facing: 'up' | 'down' | 'left' | 'right' = 'down'
  private persistTimer: number | null = null
  private nearestNpc: NpcRow | null = null

  constructor() {
    super('WorldScene')
  }

  init(data: { character?: CharacterRow; npcs?: NpcRow[] }) {
    this.character = data.character ?? this.registry.get('bootCharacter')
    this.npcs = data.npcs ?? this.registry.get('bootNpcs') ?? []
  }

  preload() {
    this.load.image('tiles', '/tiles.png')
    this.load.tilemapTiledJSON('map', `/maps/${this.character.map_id}.tmj`)
  }

  create() {
    const map = this.make.tilemap({ key: 'map' })
    const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0)
    if (!tileset) {
      throw new Error('Failed to load tileset')
    }

    map.createLayer('ground', tileset, 0, 0)
    const collision = map.createLayer('collision', tileset, 0, 0)
    collision?.setVisible(false)
    collision?.setCollisionByExclusion([-1, 0])

    const g = this.add.graphics()
    g.fillStyle(0x3b82f6, 1)
    g.fillCircle(12, 12, 12)
    g.generateTexture('player', 24, 24)
    g.destroy()

    this.player = this.physics.add.sprite(this.character.x, this.character.y, 'player')
    this.player.setCollideWorldBounds(true)
    if (collision) {
      this.physics.add.collider(this.player, collision)
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(1)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd

    for (const npc of this.npcs) {
      const rect = this.add.rectangle(npc.x, npc.y, 28, 36, 0xf59e0b)
      rect.setStrokeStyle(2, 0xffffff)
      this.add
        .text(npc.x, npc.y - 28, npc.label, { fontSize: '11px', color: '#fff' })
        .setOrigin(0.5)
      this.npcSprites.push(rect)
    }

    this.presence = new MapPresenceChannel(
      this.character.map_id,
      {
        characterId: this.character.id,
        name: this.character.name,
        x: this.player.x,
        y: this.player.y,
        facing: this.facing,
      },
      (remotes) => {
        for (const remote of remotes) {
          let container = this.remoteSprites.get(remote.characterId)
          if (!container) {
            const dot = this.add.circle(0, 0, 10, 0xef4444)
            const label = this.add.text(0, -18, remote.name, { fontSize: '10px', color: '#fecaca' })
            label.setOrigin(0.5)
            container = this.add.container(remote.x, remote.y, [dot, label])
            this.remoteSprites.set(remote.characterId, container)
          } else {
            container.setPosition(remote.x, remote.y)
          }
        }

        emitGameEvent(
          'remotePlayers',
          remotes.map((r) => ({
            characterId: r.characterId,
            name: r.name,
            x: r.x,
            y: r.y,
          })),
        )
      },
    )

    void this.presence.join().then(() => {
      this.presence?.startBroadcast(() => ({
        characterId: this.character.id,
        name: this.character.name,
        x: this.player.x,
        y: this.player.y,
        facing: this.facing,
      }))
    })

    this.persistTimer = window.setInterval(() => {
      void this.persistPosition()
    }, 3000)

    emitGameEvent('status', `Entered ${this.character.map_id} — WASD to move, E near NPC`)
  }

  update() {
    let vx = 0
    let vy = 0

    if (this.cursors.left?.isDown || this.wasd.A.isDown) {
      vx = -1
      this.facing = 'left'
    } else if (this.cursors.right?.isDown || this.wasd.D.isDown) {
      vx = 1
      this.facing = 'right'
    }

    if (this.cursors.up?.isDown || this.wasd.W.isDown) {
      vy = -1
      this.facing = 'up'
    } else if (this.cursors.down?.isDown || this.wasd.S.isDown) {
      vy = 1
      this.facing = 'down'
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707
      vy *= 0.707
    }

    this.player.setVelocity(vx * SPEED, vy * SPEED)

    emitGameEvent('position', {
      x: this.player.x,
      y: this.player.y,
      mapId: this.character.map_id,
    })

    this.nearestNpc = null
    let best = INTERACT_RANGE
    for (const npc of this.npcs) {
      const dx = npc.x - this.player.x
      const dy = npc.y - this.player.y
      const dist = Math.hypot(dx, dy)
      if (dist < best) {
        best = dist
        this.nearestNpc = npc
      }
    }
    emitGameEvent('npcNearby', this.nearestNpc)
  }

  getNearestNpc() {
    return this.nearestNpc
  }

  getPlayerPosition() {
    return { x: this.player.x, y: this.player.y, mapId: this.character.map_id }
  }

  private async persistPosition() {
    await supabase
      .from('characters')
      .update({
        x: this.player.x,
        y: this.player.y,
        map_id: this.character.map_id,
      })
      .eq('id', this.character.id)
  }

  shutdown() {
    if (this.persistTimer) window.clearInterval(this.persistTimer)
    void this.presence?.leave()
    void this.persistPosition()
  }
}
