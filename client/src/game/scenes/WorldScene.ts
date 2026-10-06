import Phaser from 'phaser'
import { syncDerivedVitals, toCharacterSheetPayload } from '../character/characterSheet'
import { addExperience, createInitialCharacterState, normalizeEquipment } from '../character/characterState'
import {
  getCharacterSession,
  setCharacterSession,
  updateCharacterSession,
} from '../character/characterSessionBridge'
import { SKILLS, skillUsableByJob } from '../character/skillsConfig'
import {
  flashPlayerHit,
  missTextPosition,
  playMobAttackLunge,
  playMobDeath,
  playMobHitShake,
  showFloatingText,
} from '../combat/combatFx'
import { colliderWithObstacles, spawnObstacles, spawnObstaclesFromTilemap } from '../combat/mapObstacles'
import { initMobAiFields, updateMob } from '../combat/mobAi'
import { logActivity } from '../activityLog'
import { calcMobVsPlayerDamage, calcPlayerVsMobDamage } from '../combat/damage'
import { resolveMobKillLoot } from '../combat/drops'
import { LOOT_CONFIG } from '../combat/lootConfig'
import { scaleMobExp } from '../combat/gameConfig'
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_RANGE,
  MOB_DEFS,
  MOB_RESPAWN_MS,
  MOB_SPAWNS_BY_MAP,
} from '../combat/mobConfig'
import { appearanceFromCharacterRow } from '../character/characterAppearance'
import { getItemDisplayName } from '../character/itemCatalog'
import { addItemsToSessionInventory } from '../character/sessionInventory'
import type { MobInstance } from '../combat/mobTypes'
import { SfxPlayer } from '../combat/sfx'
import {
  emitGameEvent,
  onGameEvent,
  type PartySyncPayload,
  type PlayerPresencePayload,
  type SocialPresencePayload,
} from '../events'
import { vendorManage } from '../../lib/api'
import {
  clearMoveTarget,
  createMoveTarget,
  setMoveTarget,
  updateClickMove,
  type Facing,
  type MoveTarget,
} from '../movement/clickToMove'
import { tryJump } from '../movement/jump'
import { playPlayerFlinch, startPlayerAttackAnim } from '../player/playerCombatAnim'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerSitting,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { SIT_REGEN_INTERVAL_MS, sitRegenAmounts } from '../character/sitRegen'
import { MapPresenceChannel } from '../realtime/mapChannel'
import type { MapCombatPayload, MapCombatSkillId } from '../realtime/mapCombatTypes'
import {
  applyRemotePresence,
  destroyRemotePlayer,
  playRemotePlayerAction,
  spawnRemotePlayer,
  tickRemotePlayer,
  type RemotePlayerEntity,
} from '../realtime/remotePlayers'
import { clampToMap } from '../world/clampToMap'
import { findPortalAtPoint } from '../world/mapPortals'
import { preloadMapDecor, spawnMapDecor } from '../world/spawnMapDecor'
import { setDepthByFeet } from '../world/depthSort'
import type { MinimapPayload } from '../world/minimapTypes'
import {
  entityInView,
  setDecorViewportVisible,
  setMobViewportVisible,
  setNpcViewportVisible,
  setRemoteViewportVisible,
} from '../world/syncWorldViewport'
import { cameraWorldViewRect, viewBoundsWithMargin } from '../world/viewportCull'
import { ensureMobTexture, ensureTilesTexture, TILESET_TILE_COUNT } from '../textures'
import { saveCharacterSession, saveCharacterWorldPosition } from '../../lib/characterProgress'
import type { CharacterRow, NpcRow } from '../../types/database'

const INTERACT_RANGE = 64
const MOB_CLICK_RADIUS = 24
const PARTY_EXP_RANGE = 120
const PLAYER_FEET_OFFSET = 2
const MOB_FEET_ANCHOR_ADJUST = 14

type NpcVisual = {
  rect: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  feetY: number
}

export class WorldScene extends Phaser.Scene {
  private character!: CharacterRow
  private playerDisplay!: PlayerDisplay
  private spaceKey!: Phaser.Input.Keyboard.Key
  private eventUnsubs: Array<() => void> = []

  private npcs: NpcRow[] = []
  private npcVisuals: NpcVisual[] = []
  private playerShadow!: Phaser.GameObjects.Ellipse
  private presence: MapPresenceChannel | null = null
  private remotePlayers = new Map<string, RemotePlayerEntity>()
  private facing: Facing = 'down'
  private persistTimer: number | null = null
  private progressSaveTimer: number | null = null
  private nearestNpc: NpcRow | null = null

  private moveTarget: MoveTarget = createMoveTarget()

  private get session() {
    return getCharacterSession()
  }

  private set session(state: ReturnType<typeof getCharacterSession>) {
    setCharacterSession(state)
  }
  private chaseMob: MobInstance | null = null
  private selectedMob: MobInstance | null = null
  private selectionRing: Phaser.GameObjects.Ellipse | null = null
  private uiPointerLocked = false
  private lastAttackAt = 0
  private isAttacking = false
  private isJumping = false
  private isSitting = false
  private lastSitRegenAt = 0
  private mobs: MobInstance[] = []
  private mobBySpawnIndex: (MobInstance | undefined)[] = []
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer | null = null
  private portalWarpCooldownUntil = 0
  private sfx = new SfxPlayer()
  private socialPresence: SocialPresencePayload = {}
  private partySync: PartySyncPayload = {
    partyId: null,
    leaderCharacterId: null,
    expShare: false,
    memberCharacterIds: [],
    myCharacterId: '',
  }
  private selectedRemoteId: string | null = null
  private playerSelectionRing: Phaser.GameObjects.Ellipse | null = null
  private vendingOpen = false
  private worldWidth = 0
  private worldHeight = 0
  private mapDecorSprites: Phaser.GameObjects.Image[] = []
  private lastMinimapEmitAt = 0

  constructor() {
    super('WorldScene')
  }

  init(data: { character?: CharacterRow; npcs?: NpcRow[] }) {
    this.character = data.character ?? this.registry.get('bootCharacter')
    this.npcs = data.npcs ?? this.registry.get('bootNpcs') ?? []
  }

  preload() {
    preloadMapDecor(this)
    this.load.tilemapTiledJSON('map', `/maps/${this.character.map_id}.tmj`)
  }

  create() {
    ensureTilesTexture(this)
    ensureMobTexture(this)

    const map = this.make.tilemap({ key: 'map' })
    const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0, TILESET_TILE_COUNT)
    if (!tileset) throw new Error('Failed to load tileset')

    const ground = map.createLayer('ground', tileset, 0, 0)
    ground?.setDepth(0)
    const decorTiles = map.createLayer('decor', tileset, 0, 0)
    decorTiles?.setDepth(2)
    this.mapDecorSprites = spawnMapDecor(this, map)
    const collision = map.createLayer('collision', tileset, 0, 0)
    collision?.setVisible(false)
    collision?.setCollisionByExclusion([-1, 0])
    this.collisionLayer = collision

    const worldW = map.widthInPixels
    const worldH = map.heightInPixels
    this.worldWidth = worldW
    this.worldHeight = worldH
    this.physics.world.setBounds(0, 0, worldW, worldH)
    this.cameras.main.setBounds(0, 0, worldW, worldH)

    const spawn = clampToMap(this.character.x, this.character.y, worldW, worldH)

    this.playerShadow = this.add
      .ellipse(spawn.x, spawn.y + PLAYER_FEET_OFFSET, 22, 8, 0x000000, 0.28)
      .setDepth(0.5)

    this.playerDisplay = createPlayerDisplay(this, spawn.x, spawn.y, appearanceFromCharacterRow(this.character))
    const playerBody = this.playerDisplay.container.body as Phaser.Physics.Arcade.Body
    playerBody.setCollideWorldBounds(true)
    if (collision) {
      this.physics.add.collider(this.playerDisplay.container, collision)
    }

    const fromTmj = spawnObstaclesFromTilemap(this, map)
    this.obstacles = fromTmj.length > 0 ? fromTmj : spawnObstacles(this, this.character.map_id)
    colliderWithObstacles(this, this.obstacles, this.playerDisplay.container)

    const boot = this.registry.get('bootSession') as ReturnType<typeof getCharacterSession> | undefined
    const initial = syncDerivedVitals(
      boot
        ? { ...boot, equipment: normalizeEquipment(boot.equipment) }
        : createInitialCharacterState(),
    )
    if (!boot) {
      const initialSheet = toCharacterSheetPayload(initial)
      setCharacterSession({ ...initial, hp: initialSheet.hpMax, mp: initialSheet.mpMax })
    } else {
      setCharacterSession(initial)
    }
    updatePlayerEquipmentLayers(this.playerDisplay, this.session.equipment)

    this.playerLabel = this.add
      .text(spawn.x, spawn.y - 28, this.character.name, {
        fontSize: '11px',
        color: '#bfdbfe',
      })
      .setOrigin(0.5)

    this.cameras.main.centerOn(spawn.x, spawn.y)
    this.cameras.main.startFollow(this.playerDisplay.container, true, 0.12, 0.12)
    this.cameras.main.setFollowOffset(0, 48)
    this.cameras.main.setZoom(1.35)

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiPointerLocked || !pointer.leftButtonDown()) return
      const wx = pointer.worldX
      const wy = pointer.worldY
      const npc = this.findNpcAt(wx, wy)
      if (npc) {
        if (this.isSitting) {
          this.standUp()
          return
        }
        const px = this.playerDisplay.container.x
        const py = this.playerDisplay.container.y
        if (Phaser.Math.Distance.Between(px, py, npc.x, npc.y) > INTERACT_RANGE) {
          emitGameEvent('status', 'Too far from NPC — move closer.')
          return
        }
        this.chaseMob = null
        this.setSelectedMob(null)
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.faceToward(npc.x, npc.y)
        emitGameEvent('npcInteract', npc)
        return
      }
      const remote = this.findRemotePlayerAt(wx, wy)
      if (remote) {
        if (this.isSitting) this.standUp()
        const px = this.playerDisplay.container.x
        const py = this.playerDisplay.container.y
        const rx = remote.display.container.x
        const ry = remote.display.container.y
        if (Phaser.Math.Distance.Between(px, py, rx, ry) > INTERACT_RANGE) {
          emitGameEvent('status', 'Too far from player — move closer.')
          return
        }
        this.chaseMob = null
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.setSelectedMob(null)
        this.setSelectedPlayer(remote)
        this.faceToward(rx, ry)
        return
      }
      const mob = this.findMobAt(wx, wy)
      if (mob) {
        if (this.isSitting) this.standUp()
        this.chaseMob = mob
        this.setSelectedMob(mob)
        this.setSelectedPlayer(null)
        setMoveTarget(this.moveTarget, mob.sprite.x, mob.sprite.y)
        this.faceToward(mob.sprite.x, mob.sprite.y)
      } else {
        if (this.isSitting) {
          this.standUp()
          return
        }
        this.chaseMob = null
        this.setSelectedMob(null)
        this.setSelectedPlayer(null)
        setMoveTarget(this.moveTarget, wx, wy)
      }
    })

    for (const npc of this.npcs) {
      const feetY = npc.y + 18
      const rect = this.add.rectangle(npc.x, feetY - 18, 28, 36, 0xf59e0b)
      rect.setStrokeStyle(2, 0xffffff)
      rect.setInteractive({ useHandCursor: true })
      const label = this.add
        .text(npc.x, feetY - 46, npc.label, { fontSize: '11px', color: '#fff' })
        .setOrigin(0.5)
      this.npcVisuals.push({ rect, label, feetY })
    }

    this.spawnMapMobs()

    this.eventUnsubs.push(
      onGameEvent('useSkillSlot', ({ slot }) => this.useSkillSlot(slot)),
      onGameEvent('sessionSync', (payload) => {
        setCharacterSession(structuredClone(payload))
        if (this.playerDisplay) {
          updatePlayerEquipmentLayers(this.playerDisplay, getCharacterSession().equipment)
        }
        this.scheduleProgressSave()
      }),
      onGameEvent('uiPointerLock', (locked) => {
        this.uiPointerLocked = locked
      }),
      onGameEvent('socialPresence', (payload) => {
        this.socialPresence = { ...this.socialPresence, ...payload }
        if (payload.isVending !== undefined) {
          this.vendingOpen = Boolean(payload.isVending)
        }
      }),
      onGameEvent('partySync', (payload) => {
        this.partySync = payload
      }),
      onGameEvent('partyExpGrant', (payload) => {
        this.applyPartyExpGrant(payload)
      }),
      onGameEvent('vendorPosSync', () => {
        if (!this.vendingOpen) return
        const pos = this.getPlayerPosition()
        void vendorManage({
          action: 'update_pos',
          characterId: this.character.id,
          mapId: pos.mapId,
          x: pos.x,
          y: pos.y,
        })
      }),
    )

    this.partySync.myCharacterId = this.character.id

    this.presence = new MapPresenceChannel(
      this.character.map_id,
      this.buildPlayerPresencePayload(),
      (remotes) => {
        const activeIds = new Set(remotes.map((r) => r.characterId))
        for (const [id, entity] of this.remotePlayers) {
          if (!activeIds.has(id)) {
            destroyRemotePlayer(entity)
            this.remotePlayers.delete(id)
          }
        }

        for (const remote of remotes) {
          let entity = this.remotePlayers.get(remote.characterId)
          if (!entity) {
            entity = spawnRemotePlayer(this, remote)
            this.remotePlayers.set(remote.characterId, entity)
          } else {
            applyRemotePresence(entity, remote)
          }
        }

        emitGameEvent(
          'remotePlayers',
          remotes.map((r) => ({
            characterId: r.characterId,
            name: r.name,
            x: r.x,
            y: r.y,
            isVending: r.isVending,
            stallTitle: r.stallTitle,
          })),
        )
      },
    )

    const presenceChannel = this.presence
    void presenceChannel.join().then(() => {
      if (!this.sys.isActive() || this.presence !== presenceChannel) return
      presenceChannel.setCombatHandler((payload) => this.handleRemoteCombat(payload))
      presenceChannel.startBroadcast(() => this.buildPlayerPresencePayload())
    })

    this.persistTimer = window.setInterval(() => {
      void this.persistWorldState()
    }, 3000)

    this.emitCharacterSheet()
    logActivity('system', `Entered ${this.character.map_id}.`)
    emitGameEvent(
      'status',
      `Entered ${this.character.map_id} — click move, click NPCs, Space jump, 1–9 skills`,
    )
    emitGameEvent('worldReady', { mapId: this.character.map_id })
  }

  private playerLabel!: Phaser.GameObjects.Text

  private getPlayerBody(): Phaser.Physics.Arcade.Body | null {
    const body = this.playerDisplay?.container?.body
    if (!body || !('velocity' in body)) return null
    return body as Phaser.Physics.Arcade.Body
  }

  private stopPlayerMotion() {
    this.getPlayerBody()?.setVelocity(0, 0)
  }

  update() {
    const sheet = toCharacterSheetPayload(this.session)
    const speed = 140 + Math.min(sheet.effectiveAgi, 99)
    const now = this.time.now

    if (this.isSitting) {
      setPlayerSitting(this.playerDisplay, true, this.facing)
      this.stopPlayerMotion()
      clearMoveTarget(this.moveTarget)
      this.tickSitRegen(now, sheet)
    } else if (!this.isAttacking && !this.isJumping) {
      if (this.chaseMob?.alive) {
        setMoveTarget(this.moveTarget, this.chaseMob.sprite.x, this.chaseMob.sprite.y)
        const dist = Phaser.Math.Distance.Between(
          this.playerDisplay.container.x,
          this.playerDisplay.container.y,
          this.chaseMob.sprite.x,
          this.chaseMob.sprite.y,
        )
        if (dist <= ATTACK_RANGE) {
          clearMoveTarget(this.moveTarget)
          this.stopPlayerMotion()
          this.faceToward(this.chaseMob.sprite.x, this.chaseMob.sprite.y)
          this.tryBasicAttack()
        }
      }

      const playerBody = this.getPlayerBody()
      const move = playerBody
        ? updateClickMove(
            playerBody,
            this.playerDisplay.container.x,
            this.playerDisplay.container.y,
            this.moveTarget,
            speed,
          )
        : { moving: false, facing: null as Facing | null }
      if (move.facing) this.facing = move.facing
      if (move.moving) {
        playPlayerAnim(this.playerDisplay, 'walk', this.facing)
        setPlayerWalkFrame(this.playerDisplay, (Math.floor(now / 150) % 2) as 0 | 1)
      } else if (!this.isAttacking) {
        playPlayerAnim(this.playerDisplay, 'idle', this.facing)
      }
    }

    this.playerLabel.setPosition(this.playerDisplay.container.x, this.playerDisplay.container.y - 28)

    if (!this.isSitting && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const jumped = tryJump(this, this.playerDisplay.container, () => this.isJumping, (v) => {
        this.isJumping = v
      })
      if (jumped) playPlayerAnim(this.playerDisplay, 'jump', this.facing)
    }

    const playerAlive = this.session.hp > 0
    for (const mob of this.mobs) {
      if (!mob.alive) continue
      const def = MOB_DEFS[mob.defId]
      if (def) {
        updateMob(mob, def, this.playerDisplay.container.x, this.playerDisplay.container.y, playerAlive, now, {
          onMobHitPlayer: (m) => this.onMobHitPlayer(m),
        })
      }
      this.updateMobHpBar(mob)
    }
    this.syncSelectionRing()

    emitGameEvent('position', {
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      mapId: this.character.map_id,
    })

    if (now >= this.portalWarpCooldownUntil) {
      const px = this.playerDisplay.container.x
      const py = this.playerDisplay.container.y
      const portal = findPortalAtPoint(this.character.map_id, px, py)
      if (portal) {
        this.portalWarpCooldownUntil = now + 1500
        emitGameEvent('portalWarpRequest', {
          portalId: portal.id,
          mapId: this.character.map_id,
          x: px,
          y: py,
          label: portal.label,
          destinationMapId: portal.targetMapId,
        })
      }
    }

    this.nearestNpc = null
    let best = INTERACT_RANGE
    for (const npc of this.npcs) {
      const dx = npc.x - this.playerDisplay.container.x
      const dy = npc.y - this.playerDisplay.container.y
      const dist = Math.hypot(dx, dy)
      if (dist < best) {
        best = dist
        this.nearestNpc = npc
      }
    }
    emitGameEvent('npcNearby', this.nearestNpc)
    const remoteSmooth = 1 - Math.pow(0.001, this.game.loop.delta / 120)
    for (const entity of this.remotePlayers.values()) {
      tickRemotePlayer(entity, now, remoteSmooth)
    }

    this.syncPlayerSelectionRing()
    this.syncWorldDepth()
    this.syncViewportVisibility()
    this.emitMinimap(now)
  }

  private syncViewportVisibility() {
    const bounds = viewBoundsWithMargin(this.cameras.main)

    for (const mob of this.mobs) {
      if (!mob.alive && !mob.sprite.visible) continue
      setMobViewportVisible(mob, entityInView(bounds, mob.sprite.x, mob.sprite.y))
    }

    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      setRemoteViewportVisible(entity, entityInView(bounds, c.x, c.y))
    }

    for (const npc of this.npcVisuals) {
      setNpcViewportVisible(npc, entityInView(bounds, npc.rect.x, npc.feetY))
    }

    for (const decor of this.mapDecorSprites) {
      setDecorViewportVisible(decor, entityInView(bounds, decor.x, decor.y))
    }
  }

  private emitMinimap(now: number) {
    if (now - this.lastMinimapEmitAt < 120) return
    this.lastMinimapEmitAt = now

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const payload: MinimapPayload = {
      mapId: this.character.map_id,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      view: cameraWorldViewRect(this.cameras.main),
      localPlayer: { x: px, y: py },
      remotes: [],
      mobs: [],
    }

    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      payload.remotes.push({
        characterId: entity.lastPayload.characterId,
        x: c.x,
        y: c.y,
      })
    }

    for (const mob of this.mobs) {
      if (!mob.alive) continue
      payload.mobs.push({
        spawnIndex: mob.spawnIndex,
        x: mob.sprite.x,
        y: mob.sprite.y,
      })
    }

    emitGameEvent('minimap', payload)
  }

  private buildPlayerPresencePayload(): PlayerPresencePayload {
    if (!this.playerDisplay) {
      return {
        characterId: this.character.id,
        name: this.character.name,
        x: this.character.x,
        y: this.character.y,
        facing: 'down',
        anim: 'idle',
        walkFrame: 0,
        equipment: this.session.equipment,
        appearance: appearanceFromCharacterRow(this.character),
        guildTag: this.socialPresence.guildTag ?? null,
        isVending: Boolean(this.socialPresence.isVending),
        stallTitle: this.socialPresence.stallTitle ?? null,
      }
    }

    const body = this.getPlayerBody()
    const moving = body ? Math.hypot(body.velocity.x, body.velocity.y) > 8 : false
    let anim: PlayerPresencePayload['anim'] = 'idle'
    if (this.isSitting) anim = 'sit'
    else if (this.isJumping) anim = 'jump'
    else if (this.isAttacking) anim = 'attack'
    else if (moving) anim = 'walk'

    const walkFrame =
      anim === 'walk' ? ((Math.floor(this.time.now / 150) % 2) as 0 | 1) : 0

    return {
      characterId: this.character.id,
      name: this.character.name,
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      facing: this.facing,
      anim,
      walkFrame,
      equipment: this.session.equipment,
      appearance: appearanceFromCharacterRow(this.character),
      guildTag: this.socialPresence.guildTag ?? null,
      isVending: Boolean(this.socialPresence.isVending),
      stallTitle: this.socialPresence.stallTitle ?? null,
    }
  }

  private disposeRemotePlayers() {
    for (const entity of this.remotePlayers.values()) {
      destroyRemotePlayer(entity)
    }
    this.remotePlayers.clear()
  }

  private playerFeetY(): number {
    const jumpLift = this.isJumping ? -10 : 0
    return this.playerDisplay.container.y + PLAYER_FEET_OFFSET + jumpLift
  }

  private syncWorldDepth() {
    const playerFeet = this.playerFeetY()
    setDepthByFeet(this.playerShadow, playerFeet, -0.5)
    this.playerShadow.setPosition(
      this.playerDisplay.container.x,
      this.playerDisplay.container.y + PLAYER_FEET_OFFSET,
    )
    setDepthByFeet(this.playerDisplay.container, playerFeet)
    setDepthByFeet(this.playerLabel, playerFeet, 0.05)

    for (const mob of this.mobs) {
      if (!mob.alive) continue
      const feet = mob.sprite.y
      setDepthByFeet(mob.sprite, feet)
      setDepthByFeet(mob.hpBarBg, feet, 0.02)
      setDepthByFeet(mob.hpBarFill, feet, 0.03)
      setDepthByFeet(mob.label, feet, 0.04)
    }

    for (const npc of this.npcVisuals) {
      setDepthByFeet(npc.rect, npc.feetY)
      setDepthByFeet(npc.label, npc.feetY, 0.05)
    }

    for (const entity of this.remotePlayers.values()) {
      const feet = entity.display.container.y + PLAYER_FEET_OFFSET
      setDepthByFeet(entity.display.container, feet)
      setDepthByFeet(entity.label, feet, 0.05)
    }

    if (this.selectionRing && this.selectedMob?.alive) {
      const feet = this.selectedMob.sprite.y
      setDepthByFeet(this.selectionRing, feet, -0.1)
    }
  }

  private useSkillSlot(slot: number) {
    if (slot < 0 || slot > 8) return
    const skillId = this.session.skillBar[slot]
    if (!skillId) {
      emitGameEvent('status', 'Empty skill slot')
      return
    }
    if (skillId === 'basic_attack') {
      this.tryBasicAttack()
      return
    }
    const def = SKILLS[skillId]
    if (!def) return
    const level = this.session.skills[skillId] ?? 0
    if (level < 1) {
      emitGameEvent('status', `${def.name} not learned`)
      return
    }
    if (!skillUsableByJob(skillId, this.session.jobId)) {
      emitGameEvent('status', `${def.name} is not available for your job`)
      return
    }
    if (def.type === 'passive') {
      emitGameEvent('status', `${def.name} is passive`)
      return
    }
    if (skillId === 'bash') {
      this.tryBash(level, def.mpCost)
      return
    }
    if (skillId === 'sit') {
      this.toggleSit()
      return
    }
    emitGameEvent('status', `${def.name} (Lv ${level}) — not implemented yet`)
  }

  private standUp() {
    if (!this.isSitting) return
    this.isSitting = false
    setPlayerSitting(this.playerDisplay, false, this.facing)
    emitGameEvent('status', 'Stood up.')
    logActivity('character', 'Stood up.')
  }

  private toggleSit() {
    if (this.isSitting) {
      this.standUp()
      return
    }
    if (this.isAttacking || this.isJumping) return
    this.chaseMob = null
    this.setSelectedMob(null)
    clearMoveTarget(this.moveTarget)
    this.stopPlayerMotion()
    this.isSitting = true
    this.lastSitRegenAt = this.time.now
    setPlayerSitting(this.playerDisplay, true, this.facing)
    emitGameEvent('status', 'Sitting — recovering HP and SP.')
    logActivity('character', 'Sitting to recover HP and SP.')
  }

  private tickSitRegen(now: number, sheet: ReturnType<typeof toCharacterSheetPayload>) {
    if (now - this.lastSitRegenAt < SIT_REGEN_INTERVAL_MS) return
    this.lastSitRegenAt = now
    if (this.session.hp >= sheet.hpMax && this.session.mp >= sheet.mpMax) return

    const { hp, mp } = sitRegenAmounts(sheet.effectiveVit, sheet.effectiveInt)
    const nextHp = Math.min(sheet.hpMax, this.session.hp + hp)
    const nextMp = Math.min(sheet.mpMax, this.session.mp + mp)
    if (nextHp === this.session.hp && nextMp === this.session.mp) return

    this.session = { ...this.session, hp: nextHp, mp: nextMp }
    this.emitCharacterSheet()
    logActivity('character', `Resting… HP ${nextHp}/${sheet.hpMax}, SP ${nextMp}/${sheet.mpMax}.`)
  }

  private spendMp(cost: number): boolean {
    if (cost <= 0) return true
    if (this.session.mp < cost) {
      emitGameEvent('status', 'Not enough MP')
      return false
    }
    this.session = { ...this.session, mp: this.session.mp - cost }
    return true
  }

  private tryBash(skillLevel: number, mpCost: number) {
    if (this.isSitting) return
    const now = this.time.now
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS || this.isAttacking || this.isJumping) return
    if (!this.spendMp(mpCost)) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    this.broadcastPlayerAction('bash')
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'bash',
      onStrike: () => {
        const target = this.findMobInAttackCone()
        if (!target) {
          const pos = missTextPosition(
            this.playerDisplay.container.x,
            this.playerDisplay.container.y,
            this.facing,
          )
          showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastMobMissAt(undefined, pos.x, pos.y)
          logActivity('combat', 'Bash missed.')
          this.emitCharacterSheet()
          return
        }

        const def = MOB_DEFS[target.defId]
        if (!def) {
          this.emitCharacterSheet()
          return
        }
        const { damage: baseDamage, hit } = calcPlayerVsMobDamage(this.session, def)
        const damage =
          hit && baseDamage > 0
            ? Math.max(1, Math.floor(baseDamage * (1 + skillLevel * 0.15)) + skillLevel * 3)
            : 0
        if (!hit || damage <= 0) {
          showFloatingText(this, target.sprite.x, target.sprite.y - 40, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastMobMissAt(target.spawnIndex, target.sprite.x, target.sprite.y - 40)
          logActivity('combat', `Bash missed Lv ${target.level} ${target.name}.`)
          this.emitCharacterSheet()
          return
        }

        this.applyDamageToMob(target, damage, def, 'Bash')
        this.emitCharacterSheet()
      },
      onComplete: () => {
        this.isAttacking = false
      },
    })
  }

  private applyDamageToMob(
    target: MobInstance,
    damage: number,
    def: (typeof MOB_DEFS)[string],
    skillLabel: string,
  ) {
    target.hp -= damage
    playMobHitShake(this, target.sprite, def.color)
    this.sfx.playHit()
    showFloatingText(this, target.sprite.x, target.sprite.y - 40, `-${damage}`, 'hit')
    logActivity(
      'combat',
      `${skillLabel} dealt ${damage} damage to Lv ${target.level} ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHp}).`,
    )
    this.updateMobHpBar(target)
    if (this.selectedMob === target) {
      this.emitSelectedMobPayload(target)
    }
    this.broadcastMobHit(target, damage, skillLabel)
    if (target.hp <= 0) {
      if (this.selectedMob === target) this.setSelectedMob(null)
      this.chaseMob = null
      this.killMob(target)
    }
  }

  private faceToward(tx: number, ty: number) {
    const dx = tx - this.playerDisplay.container.x
    const dy = ty - this.playerDisplay.container.y
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left'
    } else {
      this.facing = dy > 0 ? 'down' : 'up'
    }
  }

  private setSelectedMob(mob: MobInstance | null) {
    this.selectedMob = mob?.alive ? mob : null
    if (!this.selectedMob) {
      this.selectionRing?.destroy()
      this.selectionRing = null
      emitGameEvent('selectedMob', null)
      return
    }
    if (!this.selectionRing) {
      this.selectionRing = this.add.ellipse(0, 0, 40, 28, 0xfbbf24, 0)
      this.selectionRing.setStrokeStyle(2, 0xfbbf24, 0.9)
      this.selectionRing.setDepth(5)
    }
    this.emitSelectedMobPayload(this.selectedMob)
    emitGameEvent('status', `Target: Lv ${this.selectedMob.level} ${this.selectedMob.name}`)
    logActivity(
      'target',
      `Target: Lv ${this.selectedMob.level} ${this.selectedMob.name} (HP ${this.selectedMob.hp}/${this.selectedMob.maxHp}).`,
    )
  }

  private emitSelectedMobPayload(mob: MobInstance) {
    emitGameEvent('selectedMob', {
      defId: mob.defId,
      name: mob.name,
      level: mob.level,
      hp: Math.max(0, mob.hp),
      hpMax: mob.maxHp,
    })
  }

  private syncSelectionRing() {
    if (!this.selectedMob?.alive) {
      if (this.selectedMob) this.setSelectedMob(null)
      return
    }
    if (this.selectionRing) {
      this.selectionRing.setPosition(this.selectedMob.sprite.x, this.selectedMob.sprite.y - 6)
    }
  }

  private setSelectedPlayer(entity: RemotePlayerEntity | null) {
    if (!entity) {
      this.selectedRemoteId = null
      this.playerSelectionRing?.destroy()
      this.playerSelectionRing = null
      emitGameEvent('selectedPlayer', null)
      emitGameEvent('selectedPlayerAnchor', null)
      return
    }
    this.selectedRemoteId = entity.lastPayload.characterId
    if (!this.playerSelectionRing) {
      this.playerSelectionRing = this.add.ellipse(0, 0, 40, 28, 0x60a5fa, 0)
      this.playerSelectionRing.setStrokeStyle(2, 0x60a5fa, 0.9)
      this.playerSelectionRing.setDepth(5)
    }
    const p = entity.lastPayload
    emitGameEvent('selectedPlayer', {
      characterId: p.characterId,
      name: p.name,
      isVending: p.isVending,
      stallTitle: p.stallTitle,
    })
    emitGameEvent('status', `Target: ${p.name}`)
  }

  private syncPlayerSelectionRing() {
    if (!this.selectedRemoteId) return
    const entity = this.remotePlayers.get(this.selectedRemoteId)
    if (!entity) {
      this.setSelectedPlayer(null)
      return
    }
    if (this.playerSelectionRing) {
      const c = entity.display.container
      this.playerSelectionRing.setPosition(c.x, c.y - 6)
    }
    this.emitSelectedPlayerAnchor(entity)
  }

  private emitSelectedPlayerAnchor(entity: RemotePlayerEntity) {
    const cam = this.cameras.main
    const c = entity.display.container
    const worldX = c.x
    const worldY = c.y - 56
    const sx = (worldX - cam.scrollX) * cam.zoom + cam.width * 0.5
    const sy = (worldY - cam.scrollY) * cam.zoom + cam.height * 0.5
    emitGameEvent('selectedPlayerAnchor', { x: sx, y: sy })
  }

  private findRemotePlayerAt(wx: number, wy: number): RemotePlayerEntity | null {
    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      if (Phaser.Math.Distance.Between(wx, wy, c.x, c.y) <= MOB_CLICK_RADIUS) {
        return entity
      }
    }
    return null
  }

  private findMobAt(wx: number, wy: number): MobInstance | null {
    for (const mob of this.mobs) {
      if (!mob.alive) continue
      if (Phaser.Math.Distance.Between(wx, wy, mob.sprite.x, mob.sprite.y) <= MOB_CLICK_RADIUS) {
        return mob
      }
    }
    return null
  }

  private findNpcAt(wx: number, wy: number): NpcRow | null {
    const hitRadius = 22
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i]
      if (Phaser.Math.Distance.Between(wx, wy, npc.x, npc.y) <= hitRadius) {
        return npc
      }
    }
    return null
  }

  private onMobHitPlayer(mob: MobInstance) {
    if (this.session.hp <= 0) return
    if (this.isSitting) this.standUp()
    const def = MOB_DEFS[mob.defId]
    const damage = def ? calcMobVsPlayerDamage(def, this.session) : 0
    if (damage <= 0) {
      const pos = missTextPosition(this.playerDisplay.container.x, this.playerDisplay.container.y, this.facing)
      showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
      this.sfx.playMiss()
      logActivity('combat', `${mob.name} missed you.`)
      return
    }
    this.session = { ...this.session, hp: Math.max(0, this.session.hp - damage) }
    showFloatingText(
      this,
      this.playerDisplay.container.x,
      this.playerDisplay.container.y - 36,
      `-${damage}`,
      'mobHitPlayer',
    )
    flashPlayerHit(this, this.playerDisplay)
    playPlayerFlinch(
      this,
      this.playerDisplay,
      this.facing,
      this.playerDisplay.container.x - mob.sprite.x,
      this.playerDisplay.container.y - mob.sprite.y,
    )
    this.sfx.playHit()
    if (def) {
      playMobAttackLunge(
        this,
        mob.sprite,
        this.playerDisplay.container.x,
        this.playerDisplay.container.y,
      )
      playMobHitShake(this, mob.sprite, def.color)
    }
    logActivity('combat', `Took ${damage} damage from Lv ${mob.level} ${mob.name}.`)
    this.emitCharacterSheet()
  }

  private spawnMapMobs() {
    const spawns = MOB_SPAWNS_BY_MAP[this.character.map_id] ?? []
    this.mobBySpawnIndex = []
    spawns.forEach((spawn, spawnIndex) => {
      const def = MOB_DEFS[spawn.defId]
      if (!def) return
      const mob = this.createMobInstance(spawnIndex, spawn.x, spawn.y, def)
      this.mobs.push(mob)
      this.mobBySpawnIndex[spawnIndex] = mob
    })
  }

  private createMobInstance(
    spawnIndex: number,
    x: number,
    y: number,
    def: (typeof MOB_DEFS)[string],
  ): MobInstance {
    const sprite = this.physics.add.sprite(x, y + MOB_FEET_ANCHOR_ADJUST, 'mob')
    sprite.setOrigin(0.5, 1)
    sprite.setTint(def.color)
    sprite.setCollideWorldBounds(true)
    if (this.collisionLayer) {
      this.physics.add.collider(sprite, this.collisionLayer)
    }
    colliderWithObstacles(this, this.obstacles, sprite)

    const feetY = sprite.y
    const label = this.add
      .text(x, feetY - 38, `Lv${def.level} ${def.name}`, { fontSize: '10px', color: '#fbcfe8' })
      .setOrigin(0.5)

    const barW = 32
    const hpBarBg = this.add.rectangle(x, feetY - 26, barW, 4, 0x1f2937).setOrigin(0.5)
    const hpBarFill = this.add.rectangle(x - barW / 2, feetY - 26, barW, 4, 0x22c55e).setOrigin(0, 0.5)

    const mob: MobInstance = {
      spawnIndex,
      sprite,
      hpBarBg,
      hpBarFill,
      label,
      defId: def.id,
      hp: def.maxHp,
      maxHp: def.maxHp,
      level: def.level,
      name: def.name,
      spawnX: x,
      spawnY: feetY,
      alive: true,
      state: 'wander',
      roamTargetX: x,
      roamTargetY: y,
      lastAttackAt: 0,
      lastWanderAt: 0,
    }
    initMobAiFields(mob, def)
    return mob
  }

  private getMobBySpawnIndex(spawnIndex: number): MobInstance | null {
    return this.mobBySpawnIndex[spawnIndex] ?? null
  }

  private listenerPosition(): { x: number; y: number } {
    return {
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
    }
  }

  private broadcastPlayerAction(skillId: MapCombatSkillId) {
    this.presence?.sendCombat({
      kind: 'player_action',
      characterId: this.character.id,
      facing: this.facing,
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      skillId,
    })
  }

  private broadcastMobHit(target: MobInstance, damage: number, skillLabel: string) {
    this.presence?.sendCombat({
      kind: 'mob_hit',
      characterId: this.character.id,
      spawnIndex: target.spawnIndex,
      damage,
      hpAfter: Math.max(0, target.hp),
      skillLabel,
    })
  }

  private broadcastMobMissAt(spawnIndex: number | undefined, x: number, y: number) {
    this.presence?.sendCombat({
      kind: 'mob_miss',
      characterId: this.character.id,
      spawnIndex,
      x,
      y,
    })
  }

  private broadcastMobDie(spawnIndex: number) {
    this.presence?.sendCombat({
      kind: 'mob_die',
      characterId: this.character.id,
      spawnIndex,
    })
  }

  private broadcastMobRespawn(spawnIndex: number) {
    this.presence?.sendCombat({ kind: 'mob_respawn', spawnIndex })
  }

  private handleRemoteCombat(payload: MapCombatPayload) {
    const listener = this.listenerPosition()

    if (payload.kind === 'player_action') {
      const entity = this.remotePlayers.get(payload.characterId)
      if (entity) {
        playRemotePlayerAction(
          this,
          entity,
          payload.facing,
          payload.skillId,
          listener.x,
          listener.y,
          this.sfx,
        )
      }
      return
    }

    if (payload.kind === 'mob_miss') {
      showFloatingText(this, payload.x, payload.y, 'MISS', 'miss')
      this.sfx.playMissNearby(listener.x, listener.y, payload.x, payload.y)
      return
    }

    if (payload.kind === 'mob_hit') {
      const mob = this.getMobBySpawnIndex(payload.spawnIndex)
      if (!mob || !mob.alive) return
      // Last hpAfter from any attacker wins for this spawn (client-trusted sync).
      mob.hp = Math.max(0, payload.hpAfter)
      const def = MOB_DEFS[mob.defId]
      if (def) playMobHitShake(this, mob.sprite, def.color)
      this.sfx.playHitNearby(listener.x, listener.y, mob.sprite.x, mob.sprite.y)
      showFloatingText(this, mob.sprite.x, mob.sprite.y - 40, `-${payload.damage}`, 'hit')
      this.updateMobHpBar(mob)
      if (this.selectedMob === mob) {
        this.emitSelectedMobPayload(mob)
      }
      if (mob.hp <= 0) {
        if (this.selectedMob === mob) this.setSelectedMob(null)
        if (this.chaseMob === mob) this.chaseMob = null
        this.killMobVisualOnly(mob)
      }
      return
    }

    if (payload.kind === 'mob_die') {
      const mob = this.getMobBySpawnIndex(payload.spawnIndex)
      if (!mob || !mob.alive) return
      if (this.selectedMob === mob) this.setSelectedMob(null)
      if (this.chaseMob === mob) this.chaseMob = null
      this.killMobVisualOnly(mob)
      return
    }

    if (payload.kind === 'mob_respawn') {
      const mob = this.getMobBySpawnIndex(payload.spawnIndex)
      if (!mob || mob.alive) return
      const def = MOB_DEFS[mob.defId]
      if (!def) return
      this.respawnMobInstance(mob, def)
    }
  }

  private updateMobHpBar(mob: MobInstance) {
    const barW = 32
    const ratio = Math.max(0, mob.hp / mob.maxHp)
    const feetY = mob.sprite.y
    mob.hpBarBg.setPosition(mob.sprite.x, feetY - 26)
    mob.hpBarFill.setPosition(mob.sprite.x - barW / 2, feetY - 26)
    mob.hpBarFill.width = barW * ratio
    mob.label.setPosition(mob.sprite.x, feetY - 38)
  }

  private tryBasicAttack() {
    if (this.isSitting) return
    const now = this.time.now
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS || this.isAttacking || this.isJumping) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    this.broadcastPlayerAction('basic_attack')
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      onStrike: () => {
        const target = this.findMobInAttackCone()
        if (!target) {
          const pos = missTextPosition(
            this.playerDisplay.container.x,
            this.playerDisplay.container.y,
            this.facing,
          )
          showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastMobMissAt(undefined, pos.x, pos.y)
          logActivity('combat', 'Attack missed.')
          return
        }

        const def = MOB_DEFS[target.defId]
        if (!def) return
        const { damage, hit } = calcPlayerVsMobDamage(this.session, def)
        if (!hit || damage <= 0) {
          showFloatingText(this, target.sprite.x, target.sprite.y - 40, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastMobMissAt(target.spawnIndex, target.sprite.x, target.sprite.y - 40)
          logActivity('combat', `Attack missed Lv ${target.level} ${target.name}.`)
          return
        }

        this.applyDamageToMob(target, damage, def, 'Attack')
      },
      onComplete: () => {
        this.isAttacking = false
      },
    })
  }

  private findMobInAttackCone(): MobInstance | null {
    let best: MobInstance | null = null
    let bestDist = ATTACK_RANGE

    for (const mob of this.mobs) {
      if (!mob.alive) continue
      const dx = mob.sprite.x - this.playerDisplay.container.x
      const dy = mob.sprite.y - this.playerDisplay.container.y
      const dist = Math.hypot(dx, dy)
      if (dist > ATTACK_RANGE) continue
      if (!this.isInFacingCone(dx, dy)) continue
      if (dist < bestDist) {
        bestDist = dist
        best = mob
      }
    }
    return best
  }

  private isInFacingCone(dx: number, dy: number): boolean {
    const len = Math.hypot(dx, dy)
    if (len < 1) return true
    const nx = dx / len
    const ny = dy / len
    switch (this.facing) {
      case 'right':
        return nx > 0
      case 'left':
        return nx < 0
      case 'up':
        return ny < 0
      case 'down':
        return ny > 0
      default:
        return true
    }
  }

  private killMob(mob: MobInstance) {
    const def = MOB_DEFS[mob.defId]
    if (def) {
      const loot = resolveMobKillLoot(def, LOOT_CONFIG)
      if (loot.zeny > 0) {
        logActivity('combat', `Obtained ${loot.zeny.toLocaleString()} zeny.`)
        emitGameEvent('zenyGain', { amount: loot.zeny })
      }
      if (loot.itemIds.length > 0) {
        this.session = {
          ...this.session,
          sessionInventory: addItemsToSessionInventory(this.session.sessionInventory, loot.itemIds),
        }
        for (const itemId of loot.itemIds) {
          logActivity('combat', `Obtained ${getItemDisplayName(itemId)}.`)
        }
      }

      const gained = scaleMobExp(def.wikiBaseExp, def.wikiJobExp)
      this.grantKillExperience(gained.baseExp, gained.jobExp, mob.sprite.x, mob.sprite.y)
      logActivity('combat', `Defeated Lv ${mob.level} ${mob.name}.`)
    }

    this.broadcastMobDie(mob.spawnIndex)
    this.killMobVisualOnly(mob, true)
  }

  /** Hide mob and respawn locally; no loot/EXP (remote observers). */
  private killMobVisualOnly(mob: MobInstance, broadcastRespawn = false) {
    if (!mob.alive) return
    const def = MOB_DEFS[mob.defId]

    mob.alive = false
    mob.state = 'wander'
    mob.sprite.body.enable = false
    mob.hpBarBg.setVisible(false)
    mob.hpBarFill.setVisible(false)
    mob.label.setVisible(false)

    const tint = def?.color ?? 0xffffff
    playMobDeath(this, mob.sprite, tint, () => {
      mob.sprite.setVisible(false)
    })

    this.time.delayedCall(MOB_RESPAWN_MS, () => {
      if (!def) return
      this.respawnMobInstance(mob, def)
      if (broadcastRespawn) {
        this.broadcastMobRespawn(mob.spawnIndex)
      }
    })
  }

  private respawnMobInstance(mob: MobInstance, def: (typeof MOB_DEFS)[string]) {
    mob.hp = def.maxHp
    mob.alive = true
    mob.sprite.setPosition(mob.spawnX, mob.spawnY)
    mob.sprite.setVisible(true)
    mob.sprite.body.enable = true
    mob.sprite.setTint(def.color)
    mob.hpBarBg.setVisible(true)
    mob.hpBarFill.setVisible(true)
    mob.label.setVisible(true)
    initMobAiFields(mob, def)
    this.updateMobHpBar(mob)
  }

  private countPartyExpEligible(kx: number, ky: number): number {
    const ids = this.partySync.memberCharacterIds
    if (ids.length === 0) return 1
    let count = 0
    for (const id of ids) {
      if (id === this.character.id) {
        count += 1
        continue
      }
      const remote = this.remotePlayers.get(id)
      if (!remote) continue
      const c = remote.display.container
      if (Phaser.Math.Distance.Between(kx, ky, c.x, c.y) <= PARTY_EXP_RANGE) count += 1
    }
    return Math.max(1, count)
  }

  private grantKillExperience(baseExp: number, jobExp: number, fx: number, fy: number) {
    const party = this.partySync
    const useShare =
      party.partyId &&
      party.expShare &&
      party.memberCharacterIds.includes(this.character.id)

    let shareBase = baseExp
    let shareJob = jobExp
    if (useShare) {
      const eligible = this.countPartyExpEligible(fx, fy)
      shareBase = Math.floor(baseExp / eligible)
      shareJob = Math.floor(jobExp / eligible)
      if (eligible > 1) {
        emitGameEvent('partyExpBroadcast', {
          killerCharacterId: this.character.id,
          baseExp: shareBase,
          jobExp: shareJob,
          mapId: this.character.map_id,
          x: fx,
          y: fy,
        })
      }
    }

    const beforeBase = this.session.progress.baseLevel
    const beforeJob = this.session.progress.jobLevel
    updateCharacterSession((s) => syncDerivedVitals(addExperience(s, shareBase, shareJob).state))
    showFloatingText(this, fx, fy - 52, `+${shareBase} Base EXP`, 'exp')
    showFloatingText(this, fx, fy - 68, `+${shareJob} Job EXP`, 'exp')
    logActivity('exp', `Gained ${shareBase} Base EXP and ${shareJob} Job EXP.`)
    if (this.session.progress.baseLevel > beforeBase) {
      emitGameEvent('status', `Base level up! Lv ${this.session.progress.baseLevel}`)
      logActivity('level', `Base level up! Now Lv ${this.session.progress.baseLevel}.`)
    }
    if (this.session.progress.jobLevel > beforeJob) {
      emitGameEvent('status', `Job level up! Job ${this.session.progress.jobLevel}`)
      logActivity('level', `Job level up! Now Job Lv ${this.session.progress.jobLevel}.`)
    }
    this.emitCharacterSheet()
  }

  private applyPartyExpGrant(payload: import('../events').PartyExpGrantPayload) {
    if (payload.killerCharacterId === this.character.id) return
    const party = this.partySync
    if (!party.partyId || !party.expShare || !party.memberCharacterIds.includes(this.character.id)) {
      return
    }
    if (payload.mapId !== this.character.map_id) return
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (Phaser.Math.Distance.Between(px, py, payload.x, payload.y) > PARTY_EXP_RANGE) return

    const beforeBase = this.session.progress.baseLevel
    const beforeJob = this.session.progress.jobLevel
    updateCharacterSession((s) =>
      syncDerivedVitals(addExperience(s, payload.baseExp, payload.jobExp).state),
    )
    showFloatingText(this, px, py - 52, `+${payload.baseExp} Party EXP`, 'exp')
    logActivity('exp', `Party share: ${payload.baseExp} Base / ${payload.jobExp} Job EXP.`)
    if (this.session.progress.baseLevel > beforeBase) {
      emitGameEvent('status', `Base level up! Lv ${this.session.progress.baseLevel}`)
    }
    if (this.session.progress.jobLevel > beforeJob) {
      emitGameEvent('status', `Job level up! Job ${this.session.progress.jobLevel}`)
    }
    this.emitCharacterSheet()
  }

  setVendingOpen(open: boolean) {
    this.vendingOpen = open
    this.socialPresence = { ...this.socialPresence, isVending: open }
  }

  private emitCharacterSheet() {
    const sheet = toCharacterSheetPayload(getCharacterSession())
    emitGameEvent('characterSheet', sheet)
    emitGameEvent('playerStats', {
      hp: sheet.hp,
      hpMax: sheet.hpMax,
      mp: sheet.mp,
      mpMax: sheet.mpMax,
      baseLevel: sheet.baseLevel,
      baseExp: sheet.baseExp,
      baseExpToNext: sheet.baseExpToNext,
      jobLevel: sheet.jobLevel,
      jobExp: sheet.jobExp,
      jobExpToNext: sheet.jobExpToNext,
    })
    this.scheduleProgressSave()
  }

  private scheduleProgressSave() {
    if (this.progressSaveTimer) window.clearTimeout(this.progressSaveTimer)
    this.progressSaveTimer = window.setTimeout(() => {
      this.progressSaveTimer = null
      void saveCharacterSession(this.character.id, getCharacterSession()).catch((err) => {
        console.warn('Progress save failed', err)
      })
    }, 2000)
  }

  private async persistWorldState() {
    await saveCharacterWorldPosition(this.character.id, this.getPlayerPosition())
  }

  getNearestNpc() {
    return this.nearestNpc
  }

  getPlayerPosition() {
    return {
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      mapId: this.character.map_id,
    }
  }

  shutdown() {
    this.eventUnsubs.forEach((u) => u())
    this.eventUnsubs = []
    if (this.persistTimer) window.clearInterval(this.persistTimer)
    if (this.progressSaveTimer) window.clearTimeout(this.progressSaveTimer)
    this.presence?.setCombatHandler(null)
    void this.presence?.leave()
    this.presence = null
    this.disposeRemotePlayers()
    void saveCharacterWorldPosition(this.character.id, this.getPlayerPosition()).catch((err) => {
      console.warn('Final position save failed', err)
    })
  }
}
