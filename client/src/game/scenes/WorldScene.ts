import Phaser from 'phaser'
import { syncDerivedVitals, toCharacterSheetPayload } from '../character/characterSheet'
import {
  addExperience,
  createInitialCharacterState,
  grantRolledGear,
  normalizeEquipment,
} from '../character/characterState'
import {
  getCharacterSession,
  setCharacterSession,
  updateCharacterSession,
} from '../character/characterSessionBridge'
import { SKILLS, selfBuffDurationMs, skillUsableByJob, type SkillDefinition } from '../character/skillsConfig'
import {
  applySelfBuff,
  buffsEqual,
  hasStatus,
  pruneExpired,
  toPlayerBuffPayloads,
  type PlayerStatusBuff,
} from '../character/statusEffects'
import {
  flashPlayerHit,
  missTextPosition,
  playMobAttackLunge,
  playMobDeath,
  playMobHitImpact,
  playMobHitShake,
  showFloatingText,
} from '../combat/combatFx'
import {
  colliderWithObstacles,
  obstacleRectsForMap,
  spawnObstacles,
  spawnObstaclesFromTilemap,
} from '../combat/mapObstacles'
import { initMobAiFields, provokeMob, updateMob } from '../combat/mobAi'
import { logActivity } from '../activityLog'
import { calcMobSkillVsPlayerDamage, calcMobVsPlayerDamage, calcPlayerVsMobDamage } from '../combat/damage'
import { resolveMobKillLoot } from '../combat/drops'
import { LOOT_CONFIG } from '../combat/lootConfig'
import { scaleMobExp } from '../combat/gameConfig'
import {
  ATTACK_COOLDOWN_MS,
  MOB_DEFS,
  MOB_RESPAWN_MS,
  MOB_SPAWNS_BY_MAP,
} from '../combat/mobConfig'
import {
  getEquippedWeaponClass,
  getPlayerAttackRangePx,
  resolvePlayerAttackTarget,
  usesTargetedAttack,
} from '../combat/playerAttackRange'
import { appearanceFromCharacterRow } from '../character/characterAppearance'
import { attackStyleForWeapon } from '../character/characterSpriteRegistry'
import { ensureMasterCharacterSheets } from '../character/characterSpriteAssets'
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
import { playPlayerDeath, playPlayerFlinch, startPlayerAttackAnim } from '../player/playerCombatAnim'
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
import { rollDungeonGear, rolledItemDisplayName } from '../items/rolledItem'
import type { BootDungeonState } from '../world/bootDungeon'
import { dungeonFloorByMapId, isDungeonMapId } from '../world/dungeonConfig'
import { findPortalAtPoint } from '../world/mapPortals'
import { decorFootprintRects } from '../../lib/mapDecor/decorFootprints'
import { preloadMapDecor, spawnMapDecor } from '../world/spawnMapDecor'
import { setDepthByFeet } from '../world/depthSort'
import {
  PLAYER_NAME_OFFSET_BELOW,
  positionPlayerNameLabel,
  styleWorldNameLabel,
} from '../world/worldNameLabel'
import { pointInRect, rectsIntersect } from '../world/minimapGeometry'
import type { MinimapPayload, MinimapWorldRect } from '../world/minimapTypes'
import {
  entityInView,
  setDecorViewportVisible,
  setMobViewportVisible,
  setNpcViewportVisible,
  setRemoteViewportVisible,
} from '../world/syncWorldViewport'
import { cameraWorldViewRect, viewBoundsWithMargin } from '../world/viewportCull'
import { cursorCss, type GameCursor } from '../world/gameCursor'
import {
  ensureMobParticleTexture,
  ensureMobTexture,
  ensureTilesTexture,
  registerMobDeathAnimation,
  TILESET_TILE_COUNT,
} from '../textures'
import { saveCharacterSession, saveCharacterWorldPosition } from '../../lib/characterProgress'
import { ensureNpcGuildTextures } from '../npc/npcGuildBadge'
import {
  createNpcWorldVisual,
  syncNpcGuildBadgePosition,
  type NpcWorldVisual,
} from '../npc/npcWorldVisual'
import type { CharacterRow, NpcRow } from '../../types/database'

const INTERACT_RANGE = 64
const MOB_CLICK_RADIUS = 24
const PARTY_EXP_RANGE = 120
const PLAYER_FEET_OFFSET = 2
const MOB_FEET_ANCHOR_ADJUST = 14

export class WorldScene extends Phaser.Scene {
  private character!: CharacterRow
  private playerDisplay!: PlayerDisplay
  private spaceKey!: Phaser.Input.Keyboard.Key
  private eventUnsubs: Array<() => void> = []

  private npcs: NpcRow[] = []
  private npcVisuals: NpcWorldVisual[] = []
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
  private currentCursor: GameCursor = 'default'
  private pendingSkill: { skillId: string; level: number; def: SkillDefinition } | null = null
  private lastAttackAt = 0
  private isAttacking = false
  private isJumping = false
  private isSitting = false
  private isPlayerDead = false
  private lastSitRegenAt = 0
  private activeBuffs: PlayerStatusBuff[] = []
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
  private minimapObstacleRects: MinimapWorldRect[] = []
  private mapTileWidth = 32
  private mapTileHeight = 32
  private mapTilesWide = 0
  private mapTilesHigh = 0
  private dungeonBoot: BootDungeonState | null = null
  private killedSpawnSet = new Set<number>()
  private mvpMob: MobInstance | null = null

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
    ensureMobParticleTexture(this)
    registerMobDeathAnimation(this)
    ensureMasterCharacterSheets(this)

    const map = this.make.tilemap({ key: 'map' })
    const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0, TILESET_TILE_COUNT)
    if (!tileset) throw new Error('Failed to load tileset')

    const ground = map.createLayer('ground', tileset, 0, 0)
    ground?.setDepth(0)
    const decorTiles = map.createLayer('decor', tileset, 0, 0)
    decorTiles?.setDepth(2)
    const mapDecor = spawnMapDecor(this, map)
    this.mapDecorSprites = mapDecor.sprites
    const collision = map.createLayer('collision', tileset, 0, 0)
    collision?.setVisible(false)
    collision?.setCollisionByExclusion([-1, 0])
    this.collisionLayer = collision

    const worldW = map.widthInPixels
    const worldH = map.heightInPixels
    this.worldWidth = worldW
    this.worldHeight = worldH
    this.mapTileWidth = map.tileWidth
    this.mapTileHeight = map.tileHeight
    this.mapTilesWide = map.width
    this.mapTilesHigh = map.height
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
    const baseObstacles = fromTmj.length > 0 ? fromTmj : spawnObstacles(this, this.character.map_id)
    this.obstacles = [...baseObstacles, ...mapDecor.blockers]
    const decorLayer = map.getObjectLayer('decor')
    const decorFootprints =
      decorLayer?.objects?.length
        ? decorFootprintRects(decorLayer.objects as import('../../lib/tmj/types').TmjMapObject[])
        : []
    this.minimapObstacleRects = [...obstacleRectsForMap(this.character.map_id, map), ...decorFootprints]
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
    this.dungeonBoot = (this.registry.get('bootDungeon') as BootDungeonState | null) ?? null
    if (this.dungeonBoot) {
      this.killedSpawnSet = new Set(this.dungeonBoot.killedSpawns)
    }
    updatePlayerEquipmentLayers(this.playerDisplay, this.session.equipment)

    this.playerLabel = this.add.text(spawn.x, spawn.y, this.character.name)
    styleWorldNameLabel(this.playerLabel)
    positionPlayerNameLabel(this.playerLabel, spawn.x, spawn.y)
    this.playerLabel.setVisible(true)

    this.cameras.main.centerOn(spawn.x, spawn.y)
    this.cameras.main.startFollow(this.playerDisplay.container, true, 0.12, 0.12)
    this.cameras.main.setFollowOffset(0, 48)
    this.cameras.main.setZoom(1.35)

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.input.setDefaultCursor(cursorCss('default'))
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    escKey.on('down', () => this.cancelSkillTargeting())

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiPointerLocked || this.isPlayerDead) return
      if (this.pendingSkill && pointer.rightButtonDown()) {
        this.cancelSkillTargeting()
        return
      }
      if (!pointer.leftButtonDown()) return
      const wx = pointer.worldX
      const wy = pointer.worldY
      if (this.pendingSkill) {
        this.confirmSkillTargeting(wx, wy)
        return
      }
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

    ensureNpcGuildTextures(this)
    for (const npc of this.npcs) {
      this.npcVisuals.push(createNpcWorldVisual(this, npc))
    }

    this.spawnMapMobs()
    this.applyDungeonKillState()
    if (this.dungeonBoot?.mvpAlive) {
      this.spawnDungeonMvp()
    }

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
      onGameEvent('playerRevived', ({ x, y }) => {
        this.isPlayerDead = false
        if (this.playerDisplay) {
          this.playerDisplay.container.setPosition(x, y)
          playPlayerAnim(this.playerDisplay, 'idle', this.facing)
        }
        this.emitCharacterSheet()
        logActivity('character', 'Revived at save point.')
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
      onGameEvent('dungeonSync', (payload) => {
        this.dungeonBoot = payload
        this.killedSpawnSet = new Set(payload.killedSpawns)
        this.applyDungeonKillState()
        if (payload.mvpAlive) {
          this.spawnDungeonMvp()
        }
      }),
    )

    this.partySync.myCharacterId = this.character.id

    const presenceChannelKey =
      this.dungeonBoot?.instanceId
        ? `map:${this.character.map_id}:${this.dungeonBoot.instanceId}`
        : undefined

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
      presenceChannelKey,
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

    // Avoid instant portal warp when spawn tile overlaps a portal (e.g. culvert entrance).
    this.portalWarpCooldownUntil = this.time.now + 2500

    this.emitCharacterSheet()
    this.emitPlayerBuffs()
    logActivity('system', `Entered ${this.character.map_id}.`)
    emitGameEvent(
      'status',
      `Entered ${this.character.map_id} — click move, click NPCs, Space jump, 1–9 skills`,
    )
    emitGameEvent('worldReady', { mapId: this.character.map_id })

    if (this.session.hp <= 0) {
      this.enterPlayerDeath({ animate: false })
    }
  }

  private playerLabel!: Phaser.GameObjects.Text

  private enterPlayerDeath(options?: { animate?: boolean }) {
    if (this.isPlayerDead || this.session.hp > 0) return
    this.isPlayerDead = true
    this.pendingSkill = null
    if (this.isSitting) this.standUp()
    this.chaseMob = null
    this.isAttacking = false
    clearMoveTarget(this.moveTarget)
    this.stopPlayerMotion()
    if (options?.animate !== false) {
      playPlayerDeath(this, this.playerDisplay, this.facing)
    } else {
      playPlayerAnim(this.playerDisplay, 'dead', this.facing)
    }
    logActivity('combat', 'You have been defeated.')
    emitGameEvent('playerDeath', {})
    this.emitCharacterSheet()
    this.scheduleProgressSave()
  }

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

    this.tickStatusEffects(now)

    if (this.isPlayerDead) {
      playPlayerAnim(this.playerDisplay, 'dead', this.facing)
      this.stopPlayerMotion()
      clearMoveTarget(this.moveTarget)
    } else if (this.isSitting) {
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
        if (dist <= this.playerAttackRangePx()) {
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

    if (!this.isPlayerDead && !this.isSitting && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
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
          onMobUseSkill: (m, skillId, level) => this.onMobSkillOnPlayer(m, skillId, level),
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
    this.refreshPlayerNameLabels()
    this.refreshCursor()
    this.emitMinimap(now)
  }

  private refreshCursor() {
    let next: GameCursor = 'default'
    if (!this.uiPointerLocked && !this.isPlayerDead) {
      const p = this.input.activePointer
      if (this.pendingSkill) {
        next = this.pendingSkill.def.target === 'ground' ? 'aoe' : 'skillTarget'
      } else if (this.findNpcAt(p.worldX, p.worldY)) {
        next = 'npc'
      } else if (this.findMobAt(p.worldX, p.worldY)) {
        next = 'mob'
      }
    }
    if (next !== this.currentCursor) {
      this.currentCursor = next
      this.input.setDefaultCursor(cursorCss(next))
    }
  }

  private refreshPlayerNameLabels() {
    const bounds = viewBoundsWithMargin(this.cameras.main)
    const px = this.input.activePointer.worldX
    const py = this.input.activePointer.worldY
    const localX = this.playerDisplay.container.x
    const localY = this.playerDisplay.container.y

    positionPlayerNameLabel(this.playerLabel, localX, localY)
    const localInView = entityInView(bounds, localX, localY)
    this.playerLabel.setVisible(localInView && !this.isPlayerDead)

    if (this.uiPointerLocked) {
      for (const entity of this.remotePlayers.values()) {
        entity.label.setVisible(false)
      }
      return
    }

    const hoveredRemote = this.findRemotePlayerAt(px, py)
    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      positionPlayerNameLabel(entity.label, c.x, c.y)
      entity.label.setVisible(entity.inViewport && entity === hoveredRemote)
    }
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
      const x = npc.sprite.x
      setNpcViewportVisible(npc, entityInView(bounds, x, npc.feetY))
    }

    for (const decor of this.mapDecorSprites) {
      setDecorViewportVisible(decor, entityInView(bounds, decor.x, decor.y))
    }
  }

  private collectBlockedTilesInView(view: MinimapWorldRect): MinimapWorldRect[] {
    const layer = this.collisionLayer
    if (!layer || view.width <= 0 || view.height <= 0) return []

    const tw = this.mapTileWidth
    const th = this.mapTileHeight
    const tx0 = Math.max(0, Math.floor(view.x / tw))
    const ty0 = Math.max(0, Math.floor(view.y / th))
    const tx1 = Math.min(this.mapTilesWide - 1, Math.floor((view.x + view.width) / tw))
    const ty1 = Math.min(this.mapTilesHigh - 1, Math.floor((view.y + view.height) / th))
    const tileCount = (tx1 - tx0 + 1) * (ty1 - ty0 + 1)
    if (tileCount <= 0 || tileCount > 500) return []

    const tiles: MinimapWorldRect[] = []
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const tile = layer.getTileAt(tx, ty)
        if (!tile || tile.index <= 0) continue
        tiles.push({ x: tx * tw, y: ty * th, width: tw, height: th })
      }
    }
    return tiles
  }

  private emitMinimap(now: number) {
    if (now - this.lastMinimapEmitAt < 120) return
    this.lastMinimapEmitAt = now

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const view = cameraWorldViewRect(this.cameras.main)
    const payload: MinimapPayload = {
      mapId: this.character.map_id,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      view,
      localPlayer: { x: px, y: py },
      remotes: [],
      mobs: [],
      obstacles: [],
      blockedTiles: [],
    }

    for (const rect of this.minimapObstacleRects) {
      if (rectsIntersect(rect, view)) payload.obstacles.push(rect)
    }
    payload.blockedTiles = this.collectBlockedTilesInView(view)

    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      if (!pointInRect(c.x, c.y, view)) continue
      payload.remotes.push({
        characterId: entity.lastPayload.characterId,
        x: c.x,
        y: c.y,
      })
    }

    for (const mob of this.mobs) {
      if (!mob.alive) continue
      if (!pointInRect(mob.sprite.x, mob.sprite.y, view)) continue
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
    if (this.isPlayerDead) anim = 'dead'
    else if (this.isSitting) anim = 'sit'
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
    setDepthByFeet(this.playerLabel, playerFeet + PLAYER_NAME_OFFSET_BELOW, 0.05)

    for (const mob of this.mobs) {
      if (!mob.alive) continue
      const feet = mob.sprite.y
      setDepthByFeet(mob.sprite, feet)
      setDepthByFeet(mob.hpBarBg, feet, 0.02)
      setDepthByFeet(mob.hpBarFill, feet, 0.03)
      setDepthByFeet(mob.label, feet, 0.04)
    }

    for (const npc of this.npcVisuals) {
      syncNpcGuildBadgePosition(npc)
      npc.label.setPosition(npc.sprite.x, npc.feetY - 46)
      setDepthByFeet(npc.sprite, npc.feetY)
      setDepthByFeet(npc.guildIcon, npc.feetY + 2, 0.02)
      setDepthByFeet(npc.guildLabel, npc.feetY + 2, 0.03)
      setDepthByFeet(npc.label, npc.feetY, 0.05)
    }

    for (const entity of this.remotePlayers.values()) {
      const feet = entity.display.container.y + PLAYER_FEET_OFFSET
      setDepthByFeet(entity.display.container, feet)
      setDepthByFeet(entity.label, feet + PLAYER_NAME_OFFSET_BELOW, 0.05)
    }

    if (this.selectionRing && this.selectedMob?.alive) {
      const feet = this.selectedMob.sprite.y
      setDepthByFeet(this.selectionRing, feet, -0.1)
    }
  }

  private useSkillSlot(slot: number) {
    if (this.isPlayerDead) return
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
    if (skillId === 'sit') {
      this.toggleSit()
      return
    }
    if (def.selfBuff) {
      this.trySelfBuffSkill(skillId, level, def)
      return
    }
    if (def.target === 'enemy' && !this.hasAliveMobTarget()) {
      this.beginSkillTargeting(skillId, level, def)
      return
    }
    if (def.target === 'ground') {
      this.beginSkillTargeting(skillId, level, def)
      return
    }
    if (skillId === 'bash') {
      this.tryBash(level, def.mpCost)
      return
    }
    emitGameEvent('status', `${def.name} (Lv ${level}) — not implemented yet`)
  }

  private hasAliveMobTarget(): boolean {
    const mob = this.chaseMob ?? this.selectedMob
    return mob != null && mob.alive
  }

  private beginSkillTargeting(skillId: string, level: number, def: SkillDefinition) {
    this.pendingSkill = { skillId, level, def }
    emitGameEvent('status', `Select target for ${def.name} (Esc or right-click to cancel).`)
    this.refreshCursor()
  }

  private cancelSkillTargeting() {
    if (!this.pendingSkill) return
    this.pendingSkill = null
    emitGameEvent('status', 'Skill cancelled.')
    this.refreshCursor()
  }

  private confirmSkillTargeting(wx: number, wy: number) {
    const pending = this.pendingSkill
    if (!pending) return
    const { skillId, level, def } = pending

    if (def.target === 'ground') {
      this.pendingSkill = null
      emitGameEvent(
        'status',
        `${def.name} — ground target (${Math.round(wx)}, ${Math.round(wy)}) not implemented yet`,
      )
      this.refreshCursor()
      return
    }

    const mob = this.findMobAt(wx, wy)
    this.pendingSkill = null
    if (!mob) {
      emitGameEvent('status', 'No target.')
      this.refreshCursor()
      return
    }
    if (this.isSitting) this.standUp()
    this.chaseMob = mob
    this.setSelectedMob(mob)
    this.setSelectedPlayer(null)
    setMoveTarget(this.moveTarget, mob.sprite.x, mob.sprite.y)
    this.faceToward(mob.sprite.x, mob.sprite.y)
    this.castSkillById(skillId, level, def)
    this.refreshCursor()
  }

  private castSkillById(skillId: string, level: number, def: SkillDefinition) {
    if (skillId === 'bash') {
      this.tryBash(level, def.mpCost)
      return
    }
    emitGameEvent('status', `${def.name} (Lv ${level}) — not implemented yet`)
  }

  private tickStatusEffects(now: number) {
    const pruned = pruneExpired(this.activeBuffs, now)
    if (!buffsEqual(pruned, this.activeBuffs)) {
      this.activeBuffs = pruned
      this.emitPlayerBuffs()
    }
  }

  private emitPlayerBuffs() {
    emitGameEvent('playerBuffs', toPlayerBuffPayloads(this.activeBuffs))
  }

  private playerAttackElementOverride(): string | undefined {
    if (hasStatus(this.activeBuffs, 'magnum_break')) return 'fire'
    return undefined
  }

  private calcPlayerVsMobDamageForSession(def: (typeof MOB_DEFS)[string]) {
    const override = this.playerAttackElementOverride()
    return calcPlayerVsMobDamage(
      this.session,
      def,
      override ? { attackElementOverride: override } : undefined,
    )
  }

  private trySelfBuffSkill(skillId: string, skillLevel: number, def: SkillDefinition) {
    if (!def.selfBuff) return
    if (this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return

    const durationMs = selfBuffDurationMs(def.selfBuff, skillLevel)
    this.activeBuffs = applySelfBuff(this.activeBuffs, {
      statusId: def.selfBuff.statusId,
      name: def.name,
      iconSkillId: skillId,
      skillLevel,
      now: this.time.now,
      durationMs,
    })
    const seconds = Math.ceil(durationMs / 1000)
    emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — ${seconds}s`)
    logActivity('character', `${def.name} Lv ${skillLevel} (${seconds}s).`)
    this.emitPlayerBuffs()
    this.emitCharacterSheet()
  }

  private standUp() {
    if (!this.isSitting) return
    this.isSitting = false
    setPlayerSitting(this.playerDisplay, false, this.facing)
    emitGameEvent('status', 'Stood up.')
    logActivity('character', 'Stood up.')
  }

  private toggleSit() {
    if (this.isPlayerDead) return
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
    if (this.isPlayerDead || this.isSitting) return
    const now = this.time.now
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS || this.isAttacking || this.isJumping) return
    if (!this.spendMp(mpCost)) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    this.broadcastPlayerAction('bash')
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    if (usesTargetedAttack(weaponClass)) {
      const preTarget = this.chaseMob ?? this.selectedMob
      if (preTarget?.alive) this.faceToward(preTarget.sprite.x, preTarget.sprite.y)
    }
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'bash',
      attackStyle: attackStyleForWeapon(weaponClass),
      onStrike: () => {
        const target = this.resolveAttackTargetMob()
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
        const { damage: baseDamage, hit } = this.calcPlayerVsMobDamageForSession(def)
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
    provokeMob(target)
    playMobHitImpact(
      this,
      target.sprite,
      def.color,
      this.playerDisplay.container.x,
      this.playerDisplay.container.y,
    )
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
    const enduring = hasStatus(this.activeBuffs, 'endure')
    if (this.isSitting && !enduring) this.standUp()
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
    const lethal = this.session.hp <= 0
    if (!lethal && !enduring) {
      this.isAttacking = false
      playPlayerFlinch(
        this,
        this.playerDisplay,
        this.facing,
        this.playerDisplay.container.x - mob.sprite.x,
        this.playerDisplay.container.y - mob.sprite.y,
      )
    }
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
    if (lethal) {
      this.enterPlayerDeath()
    } else {
      this.emitCharacterSheet()
    }
  }

  private onMobSkillOnPlayer(mob: MobInstance, skillId: string, skillLevel: number) {
    if (this.session.hp <= 0) return
    const skillDef = SKILLS[skillId]
    const skillLabel = skillDef?.name ?? skillId
    const enduring = hasStatus(this.activeBuffs, 'endure')
    if (this.isSitting && !enduring) this.standUp()
    const def = MOB_DEFS[mob.defId]
    const damage = def ? calcMobSkillVsPlayerDamage(def, skillId, skillLevel, this.session) : 0
    if (damage <= 0) {
      const pos = missTextPosition(this.playerDisplay.container.x, this.playerDisplay.container.y, this.facing)
      showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
      this.sfx.playMiss()
      logActivity('combat', `${mob.name}'s ${skillLabel} missed you.`)
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
    const lethal = this.session.hp <= 0
    if (!lethal && !enduring) {
      this.isAttacking = false
      playPlayerFlinch(
        this,
        this.playerDisplay,
        this.facing,
        this.playerDisplay.container.x - mob.sprite.x,
        this.playerDisplay.container.y - mob.sprite.y,
      )
    }
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
    logActivity(
      'combat',
      `Took ${damage} damage from Lv ${mob.level} ${mob.name}'s ${skillLabel}.`,
    )
    if (lethal) {
      this.enterPlayerDeath()
    } else {
      this.emitCharacterSheet()
    }
  }

  private spawnMapMobs() {
    const spawns = MOB_SPAWNS_BY_MAP[this.character.map_id] ?? []
    this.mobBySpawnIndex = []
    spawns.forEach((spawn, spawnIndex) => {
      if (this.killedSpawnSet.has(spawnIndex)) return
      const def = MOB_DEFS[spawn.defId]
      if (!def) return
      const mob = this.createMobInstance(spawnIndex, spawn.x, spawn.y, def)
      this.mobs.push(mob)
      this.mobBySpawnIndex[spawnIndex] = mob
    })
  }

  private applyDungeonKillState() {
    if (!isDungeonMapId(this.character.map_id)) return
    for (const mob of this.mobs) {
      if (this.killedSpawnSet.has(mob.spawnIndex) && mob.alive) {
        this.killMobVisualOnly(mob, false)
      }
    }
  }

  private spawnDungeonMvp() {
    if (this.mvpMob?.alive) return
    const floor = dungeonFloorByMapId(this.character.map_id)
    if (!floor || !this.dungeonBoot) return
    const def = MOB_DEFS[floor.mvpDefId]
    if (!def) return
    const spawnIndex = (MOB_SPAWNS_BY_MAP[this.character.map_id] ?? []).length
    const mob = this.createMobInstance(spawnIndex, floor.mvpSpawn.x, floor.mvpSpawn.y, def, {
      labelPrefix: 'MVP',
      scale: 1.8,
      barWidth: 48,
      labelColor: '#fbbf24',
    })
    this.mvpMob = mob
    this.mobs.push(mob)
    this.mobBySpawnIndex[spawnIndex] = mob
    emitGameEvent('status', 'The MVP has appeared!')
  }

  private rollAndGrantDungeonGear(isMvp: boolean) {
    const floor = dungeonFloorByMapId(this.character.map_id)
    if (!floor) return
    const rolled = rollDungeonGear(floor, isMvp)
    if (!rolled) return
    this.session = grantRolledGear(this.session, rolled)
    const label = rolledItemDisplayName(rolled)
    logActivity('combat', `Obtained ${label}.`)
    emitGameEvent('sessionSync', structuredClone(this.session))
    this.scheduleProgressSave()
  }

  private createMobInstance(
    spawnIndex: number,
    x: number,
    y: number,
    def: (typeof MOB_DEFS)[string],
    visual?: { labelPrefix?: string; scale?: number; barWidth?: number; labelColor?: string },
  ): MobInstance {
    const sprite = this.physics.add.sprite(x, y + MOB_FEET_ANCHOR_ADJUST, 'mob', 0)
    sprite.setOrigin(0.5, 1)
    sprite.setTint(def.color)
    if (visual?.scale) sprite.setScale(visual.scale)
    sprite.setCollideWorldBounds(true)
    if (this.collisionLayer) {
      this.physics.add.collider(sprite, this.collisionLayer)
    }
    colliderWithObstacles(this, this.obstacles, sprite)

    const feetY = sprite.y
    const prefix = visual?.labelPrefix ? `${visual.labelPrefix} ` : ''
    const label = this.add
      .text(x, feetY - 38, `${prefix}Lv${def.level} ${def.name}`, {
        fontSize: '10px',
        color: visual?.labelColor ?? '#fbcfe8',
      })
      .setOrigin(0.5)

    const barW = visual?.barWidth ?? 32
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
      provokedByPlayer: false,
      skillCooldownUntil: {},
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
      if (def) playMobHitImpact(this, mob.sprite, def.color)
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
    if (this.isPlayerDead || this.isSitting) return
    const now = this.time.now
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS || this.isAttacking || this.isJumping) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    this.broadcastPlayerAction('basic_attack')
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    if (usesTargetedAttack(weaponClass)) {
      const preTarget = this.chaseMob ?? this.selectedMob
      if (preTarget?.alive) this.faceToward(preTarget.sprite.x, preTarget.sprite.y)
    }
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      attackStyle: attackStyleForWeapon(weaponClass),
      onStrike: () => {
        const target = this.resolveAttackTargetMob()
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
        const { damage, hit } = this.calcPlayerVsMobDamageForSession(def)
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

  private playerAttackRangePx(): number {
    return getPlayerAttackRangePx(this.session.equipment)
  }

  private resolveAttackTargetMob(): MobInstance | null {
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    const mobs = this.mobs.map((mob) => ({
      mob,
      alive: mob.alive,
      x: mob.sprite.x,
      y: mob.sprite.y,
    }))
    const chase = this.chaseMob
      ? { mob: this.chaseMob, alive: this.chaseMob.alive, x: this.chaseMob.sprite.x, y: this.chaseMob.sprite.y }
      : null
    const selected = this.selectedMob
      ? {
          mob: this.selectedMob,
          alive: this.selectedMob.alive,
          x: this.selectedMob.sprite.x,
          y: this.selectedMob.sprite.y,
        }
      : null
    const hit = resolvePlayerAttackTarget({
      playerX: px,
      playerY: py,
      facing: this.facing,
      rangePx: this.playerAttackRangePx(),
      weaponClass,
      mobs,
      chaseMob: chase,
      selectedMob: selected,
    })
    return hit?.mob ?? null
  }

  private killMob(mob: MobInstance) {
    const def = MOB_DEFS[mob.defId]
    const isMvpKill = this.mvpMob === mob
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

    if (this.dungeonBoot) {
      if (isMvpKill) {
        emitGameEvent('dungeonMvpKilled', { instanceId: this.dungeonBoot.instanceId })
        this.rollAndGrantDungeonGear(true)
        emitGameEvent('status', 'Dungeon cleared!')
      } else {
        emitGameEvent('dungeonMobKilled', {
          instanceId: this.dungeonBoot.instanceId,
          spawnIndex: mob.spawnIndex,
        })
        this.rollAndGrantDungeonGear(false)
      }
    }

    this.broadcastMobDie(mob.spawnIndex)
    this.killMobVisualOnly(mob, !isDungeonMapId(this.character.map_id))
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

    if (isDungeonMapId(this.character.map_id)) {
      return
    }

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
    mob.sprite.setFrame(0)
    mob.sprite.setAlpha(1)
    mob.sprite.setScale(1, 1)
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
    // Do not save world position here: this.character.map_id is from scene boot and can be
    // stale when React remounts the game after NPC/portal warp, overwriting the new map in DB.
  }
}
