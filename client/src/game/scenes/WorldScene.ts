import Phaser from 'phaser'
import { syncDerivedVitals, toCharacterSheetPayload } from '../character/characterSheet'
import { getItemDisplayName } from '../character/itemCatalog'
import {
  findSessionStackIndex,
  isSkillBarConsumable,
} from '../character/skillBarEntry'
import {
  createInitialCharacterState,
  grantRolledGear,
  normalizeEquipment,
  useConsumableFromSession,
} from '../character/characterState'
import { applyProgressAfterExp, applyServerProgressUpdate } from '../character/progressApply'
import {
  getCharacterSession,
  setCharacterSession,
  updateCharacterSession,
} from '../character/characterSessionBridge'
import {
  SKILLS,
  isPlayerEnemyCastSkill,
  isPlayerGroundMagicSkill,
  isPlayerGroundMagicStub,
  isPlayerMagicEnemySkill,
  isPlayerMagicEnemyStub,
  selfBuffDurationMs,
  skillUsableByJob,
  type SkillDefinition,
} from '../character/skillsConfig'
import {
  applySelfBuff,
  buffsEqual,
  hasStatus,
  PECO_RIDE_STATUS_ID,
  pruneExpired,
  removeStatus,
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
  showDamageFloat,
  showFloatingText,
  type DamageFloatVariant,
} from '../combat/combatFx'
import {
  colliderWithObstacles,
  obstacleRectsForMap,
  spawnObstacles,
  spawnObstaclesFromTilemap,
} from '../combat/mapObstacles'
import { initMobAiFields, provokeMob, updateMob } from '../combat/mobAi'
import { logActivity } from '../activityLog'
import { isChatStripInputFocused } from '../chatInputFocus'
import {
  calcMobSkillVsPlayerDamage,
  calcMobVsPlayerDamage,
  calcPlayerMagicSkillSingleHit,
  magicSkillHitCount,
  calcPlayerSkillVsMobDamage,
  calcPlayerVsMobDamage,
  calcPlayerVsPlayerDamage,
} from '../combat/damage'
import { playLevelUpAudio, preloadLevelUpAudio } from '../combat/levelUpAudio'
import { playLevelUpWorldFx } from '../combat/levelUpFx'
import { buildLevelUpSteps, type LevelUpStep } from '../combat/levelUpSteps'
import { PlayerCastBarGfx, positionPlayerCastBar } from '../combat/castBarFx'
import {
  GroundAoECastMarker,
  groundAoERadiusPx,
  playGroundAoEImpactBurst,
} from '../combat/groundAoECastMarker'
import { calcPreRenewalCastTimeMsFromSession, skillCastStrikeDelayMs } from '../combat/castTime'
import { PlayerSpellChantGfx } from '../combat/spellChantFx'
import { buildRandomCastChant, shouldShowSpellChant } from '../combat/spellChants'
import { playSkillCastFx, playSkillImpactFx } from '../combat/skillFx'
import { resolveMobKillLoot } from '../combat/drops'
import { LOOT_CONFIG } from '../combat/lootConfig'
import { scaleMobExp } from '../combat/gameConfig'
import { MOB_DEFS, MOB_RESPAWN_MS, MOB_SPAWNS_BY_MAP } from '../combat/mobConfig'
import {
  autoAttackRotationHasSit,
  defaultAutoAttackConfig,
  normalizeAutoAttackConfig,
  type AutoAttackConfig,
} from '../combat/autoAttackConfig'
import { shouldStandFromAutoSit } from '../combat/autoAttackSitRegen'
import {
  pickAutoAttackTarget,
  pickPatrolChaseTarget,
  type AutoAttackMobCandidate,
} from '../combat/autoAttackTargeting'
import { playerAttackTiming } from '../combat/preRenewalAspd'
import {
  getEquippedWeaponClass,
  getPlayerAttackRangeCells,
  getPlayerAttackRangePx,
  isInFacingCone,
  isWithinPlayerAttackRange,
  resolvePlayerAttackTarget,
  usesTargetedAttack,
} from '../combat/playerAttackRange'
import { appearanceFromCharacterRow } from '../character/characterAppearance'
import { moveSpeedFromAgi } from '../character/statFormulas'
import { attackStyleForWeapon } from '../character/characterSpriteRegistry'
import { ensureMasterCharacterSheets } from '../character/characterSpriteAssets'
import { addItemsToSessionInventory, parseSessionInventory } from '../character/sessionInventory'
import type { MobInstance } from '../combat/mobTypes'
import { SfxPlayer } from '../combat/sfx'
import {
  emitGameEvent,
  onGameEvent,
  sessionSyncPayload,
  type DuelSyncPayload,
  type PartySyncPayload,
  type PlayerPresencePayload,
  type SocialPresencePayload,
} from '../events'
import { isDuelCombatPhase } from '../duel/duelSync'
import { combatSnapshotFromSession, type DuelCombatSnapshot } from '../duel/duelCombatSnapshot'
import { combatReport, duelAttack, vendorManage } from '../../lib/api'
import { progressFromLevels } from '../combat/exp'
import {
  CLICK_MOVE_ARRIVAL_THRESHOLD,
  clearMoveTarget,
  createMoveTarget,
  setMoveTarget,
  updateClickMove,
  type Facing,
  type MoveTarget,
} from '../movement/clickToMove'
import { buildWalkabilityGrid, findWorldPath, trimPathFromPlayer } from '../movement/gridPathfind'
import { tryJump } from '../movement/jump'
import { playWalkClickFx } from '../movement/walkClickFx'
import { toCombatAimPoint } from '../combat/rangedProjectileFx'
import {
  clearPlayerDeathVisual,
  playPlayerDeath,
  playPlayerFlinch,
  startPlayerAttackAnim,
} from '../player/playerCombatAnim'
import { isOnPecoMount } from '../player/mountState'
import {
  attachPecoMountToDisplay,
  createPecoMount,
  syncPecoMountGfx,
  type PecoMountGfx,
} from '../player/pecoMountVisual'
import {
  createPlayerDisplay,
  playPlayerAnim,
  setPlayerDeadFrame,
  setPlayerJobAvatar,
  setPlayerMounted,
  setPlayerSitting,
  setPlayerWalkFrame,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { capturePlayerHudPortrait } from '../player/playerHudPortrait'
import { resolveJobAvatarKey } from '../player/playerJobAvatar'
import {
  pvpPassiveRegenAmounts,
  pvpPassiveRegenIntervalMs,
  sitRegenAmounts,
  sitRegenIntervalMs,
} from '../character/sitRegen'
import {
  flushActiveMapPresenceLeave,
  registerActiveMapPresence,
} from '../realtime/activeMapPresence'
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
import { applyPickupToSession, MapDropManager } from '../world/mapDrops'
import { isPvpMap, PVP_KILL_STREAK_LABELS } from '../world/pvpConfig'
import { PvpKillStreakTracker } from '../world/pvpKillStreak'
import { decorFootprintRects } from '../../lib/mapDecor/decorFootprints'
import { preloadMapDecor, spawnMapDecor } from '../world/spawnMapDecor'
import { setDepthByFeet } from '../world/depthSort'
import {
  chatBubbleDurationMs,
  createPlayerChatBubble,
  positionPlayerChatBubbleAtFeet,
  type PlayerChatBubble,
} from '../world/playerChatBubble'
import {
  PLAYER_NAME_OFFSET_BELOW,
  positionPlayerNameLabel,
  positionSkillCalloutLabel,
  styleSkillCalloutLabel,
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
import { applyGameCursorToDom, cursorCss, type GameCursor } from '../world/gameCursor'
import {
  ensureMobParticleTexture,
  ensureMobTexture,
  ensureTilesTexture,
  registerMobDeathAnimation,
  TILESET_TILE_COUNT,
} from '../textures'
import {
  normalizeCharacterWorldPosition,
  saveCharacterSession,
  saveCharacterWorldPosition,
  type CharacterWorldPosition,
} from '../../lib/characterProgress'
import { ensureNpcGuildTextures } from '../npc/npcGuildBadge'
import {
  createNpcWorldVisual,
  syncNpcGuildBadgePosition,
  type NpcWorldVisual,
} from '../npc/npcWorldVisual'
import type { CharacterRow, NpcRow } from '../../types/database'
import {
  activeRentalAt,
  clearActiveRental,
  rentalCatalogEntry,
  rentalSpeedMultiplier,
} from '../character/rental'
import type { PlayerBuffPayload } from '../events'

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
  private pecoMountGfx!: PecoMountGfx
  private rentalCartGfx!: Phaser.GameObjects.Rectangle
  private rentalFalconGfx!: Phaser.GameObjects.Arc
  private rentalFalconAngle = 0
  private presence: MapPresenceChannel | null = null
  private remotePlayers = new Map<string, RemotePlayerEntity>()
  /** Hysteresis for presence walk vs idle (avoids flicker near velocity threshold). */
  private presenceWalkActive = false
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
  /** Walk to mob for a one-shot skill cast; do not select target or basic-attack chase. */
  private chaseMobForSkillOnly = false
  private chaseDuelOpponent: RemotePlayerEntity | null = null
  private chasePvpOpponent: RemotePlayerEntity | null = null
  /** Walk to player for a one-shot PVP skill; do not start basic-attack chase. */
  private chasePvpForSkillOnly = false
  private duelSync: DuelSyncPayload | null = null
  private mapDropManager: MapDropManager | null = null
  private pvpKillStreak = new PvpKillStreakTracker()
  private pvpDeadRemoteIds = new Set<string>()
  private chasePathGoalX = 0
  private chasePathGoalY = 0
  private lastChaseRepathAt = 0
  private selectedMob: MobInstance | null = null
  private selectionRing: Phaser.GameObjects.Ellipse | null = null
  private uiPointerLocked = false
  private uiKeyboardLocked = false
  private currentCursor: GameCursor = 'default'
  private lastMapDropHoverKey: string | null = null
  private pendingSkill: { skillId: string; level: number; def: SkillDefinition } | null = null
  private queuedSkillCast: {
    skillId: string
    level: number
    def: SkillDefinition
    mob: MobInstance
  } | null = null
  private queuedDuelSkillCast: {
    skillId: string
    level: number
    def: SkillDefinition
    remote: RemotePlayerEntity
  } | null = null
  private queuedPvpSkillCast: {
    skillId: string
    level: number
    def: SkillDefinition
    remote: RemotePlayerEntity
  } | null = null
  private skillCalloutTween: Phaser.Tweens.Tween | null = null
  private playerCastBar!: PlayerCastBarGfx
  private playerSpellChant!: PlayerSpellChantGfx
  private groundAoEMarker!: GroundAoECastMarker
  private groundAoECastDismissTimer: Phaser.Time.TimerEvent | null = null
  private castChantSeed = 0
  private levelUpQueue: LevelUpStep[] = []
  private levelUpDrainActive = false
  private static readonly LEVEL_UP_STEP_MS = 1400
  private lastAttackAt = 0
  private isAttacking = false
  private isJumping = false
  private isSitting = false
  private isPlayingDead = false
  private isPlayerDead = false
  private lastSitRegenAt = 0
  private lastPvpPassiveRegenAt = 0
  private activeBuffs: PlayerStatusBuff[] = []
  private mobs: MobInstance[] = []
  private mobBySpawnIndex: (MobInstance | undefined)[] = []
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer | null = null
  private portalWarpCooldownUntil = 0
  private worldPersistDisabled = false
  private lastPersistedWorld: CharacterWorldPosition | null = null
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
  private minimapExpanded = false
  private minimapObstacleRects: MinimapWorldRect[] = []
  private minimapBlockedTilesFull: MinimapWorldRect[] = []
  private walkGrid: Uint8Array | null = null
  private mapTileWidth = 32
  private mapTileHeight = 32
  private mapTilesWide = 0
  private mapTilesHigh = 0
  private dungeonBoot: BootDungeonState | null = null
  private killedSpawnSet = new Set<number>()
  private mvpMob: MobInstance | null = null
  private autoAttackConfig: AutoAttackConfig = defaultAutoAttackConfig()
  private autoAttackAnchorX = 0
  private autoAttackAnchorY = 0
  private autoAttackRotationIndex = 0
  private autoAttackChaseActive = false
  private autoSitForRegen = false
  private lastAutoRotationAt = 0
  private autoPatrolCircle: Phaser.GameObjects.Arc | null = null

  constructor() {
    super('WorldScene')
  }

  init(data: { character?: CharacterRow; npcs?: NpcRow[] }) {
    this.character = data.character ?? this.registry.get('bootCharacter')
    this.npcs = data.npcs ?? this.registry.get('bootNpcs') ?? []
  }

  preload() {
    preloadMapDecor(this)
    if (isPvpMap(this.character.map_id)) {
      this.load.image('map_drop_skull', '/items/etc/skull.svg')
    }
    this.load.tilemapTiledJSON('map', `/maps/${this.character.map_id}.tmj`)
    this.load.on('progress', (value: number) => {
      emitGameEvent('worldLoadProgress', { mapId: this.character.map_id, progress: value })
    })
  }

  create() {
    ensureTilesTexture(this)
    this.cameras.main.setRoundPixels(true)
    ensureMobTexture(this)
    ensureMobParticleTexture(this)
    registerMobDeathAnimation(this)
    ensureMasterCharacterSheets(this)
    preloadLevelUpAudio()

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

    this.playerDisplay = createPlayerDisplay(
      this,
      spawn.x,
      spawn.y,
      appearanceFromCharacterRow(this.character),
      resolveJobAvatarKey(this.session.jobId),
    )
    this.pecoMountGfx = createPecoMount(this)
    attachPecoMountToDisplay(this.playerDisplay, this.pecoMountGfx)
    this.rentalCartGfx = this.add.rectangle(spawn.x, spawn.y, 20, 14, 0x78716c, 1).setVisible(false)
    this.rentalFalconGfx = this.add.circle(spawn.x, spawn.y, 6, 0x1e293b, 1).setVisible(false)
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
    this.walkGrid = buildWalkabilityGrid(
      this.mapTilesWide,
      this.mapTilesHigh,
      (tx, ty) => {
        const tile = this.collisionLayer?.getTileAt(tx, ty)
        return Boolean(tile && tile.index > 0)
      },
      this.minimapObstacleRects,
      this.mapTileWidth,
      this.mapTileHeight,
    )
    this.minimapBlockedTilesFull = this.collectAllBlockedTiles()
    colliderWithObstacles(this, this.obstacles, this.playerDisplay.container)

    this.mapDropManager = new MapDropManager(this, (dropId, itemId) => {
      this.session = applyPickupToSession(this.session, itemId)
      this.mapDropManager?.removeDrop(dropId)
      this.presence?.sendCombat({ kind: 'map_pickup', dropId, characterId: this.character.id })
      logActivity('combat', `Picked up ${getItemDisplayName(itemId)}.`)
      this.emitCharacterSheet()
    })

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

    this.playerSkillCallout = this.add.text(spawn.x, spawn.y, '')
    styleSkillCalloutLabel(this.playerSkillCallout)
    positionSkillCalloutLabel(this.playerSkillCallout, spawn.x, spawn.y)
    this.playerSkillCallout.setVisible(false)
    this.playerSkillCallout.setAlpha(0)

    this.playerCastBar = new PlayerCastBarGfx(this)
    this.playerSpellChant = new PlayerSpellChantGfx(this)
    this.groundAoEMarker = new GroundAoECastMarker(this)

    this.playerChatBubble = createPlayerChatBubble(this)

    this.cameras.main.centerOn(spawn.x, spawn.y)
    this.cameras.main.startFollow(this.playerDisplay.container, true, 0.12, 0.12)
    this.cameras.main.setFollowOffset(0, 48)
    this.cameras.main.setZoom(1.35)

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.applyGameCursor('default')
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
        if (this.isSitting || this.isPlayingDead) {
          this.breakRestState()
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
        this.breakRestState()
        const px = this.playerDisplay.container.x
        const py = this.playerDisplay.container.y
        const rx = remote.display.container.x
        const ry = remote.display.container.y
        const inInteractRange = Phaser.Math.Distance.Between(px, py, rx, ry) <= INTERACT_RANGE
        const pvpTargetId = remote.lastPayload.characterId
        const canPvpAttack =
          this.isPvpActive() &&
          this.canAttackPlayer(pvpTargetId) &&
          !this.isRemotePlayerDead(pvpTargetId)

        if (canPvpAttack) {
          this.chaseMob = null
          this.setSelectedMob(null)
          this.beginChasePvpOpponent(remote)
          if (inInteractRange) {
            clearMoveTarget(this.moveTarget)
            this.stopPlayerMotion()
            this.setSelectedPlayer(remote)
            this.faceToward(rx, ry)
          } else {
            this.setSelectedPlayer(null)
          }
          return
        }

        if (!inInteractRange) {
          emitGameEvent('status', 'Too far from player — move closer.')
          return
        }
        this.chaseMob = null
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.setSelectedMob(null)
        this.setSelectedPlayer(remote)
        this.faceToward(rx, ry)
        if (
          this.isDuelCombatAllowed() &&
          this.duelSync &&
          remote.lastPayload.characterId === this.duelSync.opponentCharacterId
        ) {
          this.beginChaseDuelOpponent(remote)
        }
        return
      }
      const mob = this.findMobAt(wx, wy)
      if (mob) {
        this.breakRestState()
        this.beginChaseMob(mob)
      } else {
        if (this.isSitting || this.isPlayingDead) {
          this.breakRestState()
          return
        }
        this.disableAutoAttackFromManualInput()
        this.chaseMob = null
        this.chaseMobForSkillOnly = false
        this.queuedSkillCast = null
        this.stopPvpChase()
        this.setSelectedMob(null)
        this.setSelectedPlayer(null)
        this.playWalkClickMarker(wx, wy)
        this.requestWalkTo(wx, wy)
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
        const prevJobId = this.session.jobId
        setCharacterSession(structuredClone(payload.state))
        this.session = getCharacterSession()
        if (this.playerDisplay) {
          updatePlayerEquipmentLayers(this.playerDisplay, this.session.equipment)
          const nextAvatar = resolveJobAvatarKey(this.session.jobId)
          if (this.session.jobId !== prevJobId) {
            setPlayerJobAvatar(this.playerDisplay, nextAvatar)
          }
        }
        if (payload.persist !== false) {
          this.scheduleProgressSave()
        }
      }),
      onGameEvent('uiPointerLock', (locked) => {
        this.uiPointerLocked = locked
        this.refreshCursor()
      }),
      onGameEvent('uiKeyboardLock', (locked) => {
        this.uiKeyboardLocked = locked
        const kb = this.input.keyboard
        if (!kb) return
        kb.enabled = !locked
        kb.resetKeys()
      }),
      onGameEvent('chatBubble', ({ characterId, text }) => {
        this.showChatBubbleForCharacter(characterId, text)
      }),
      onGameEvent('minimapUi', ({ expanded }) => {
        this.minimapExpanded = expanded
      }),
      onGameEvent('minimapMove', ({ x, y }) => {
        if (this.uiPointerLocked || this.isPlayerDead || this.pendingSkill) return
        if (this.isSitting || this.isPlayingDead) {
          this.breakRestState()
          return
        }
        const wx = Phaser.Math.Clamp(x, 0, this.worldWidth)
        const wy = Phaser.Math.Clamp(y, 0, this.worldHeight)
        this.chaseMob = null
        this.setSelectedMob(null)
        this.setSelectedPlayer(null)
        this.playWalkClickMarker(wx, wy)
        this.requestWalkTo(wx, wy)
      }),
      onGameEvent('socialPresence', (payload) => {
        this.socialPresence = { ...this.socialPresence, ...payload }
        if (payload.isVending !== undefined) {
          this.vendingOpen = Boolean(payload.isVending)
          if (this.vendingOpen) this.disableAutoAttackFromManualInput()
        }
      }),
      onGameEvent('partySync', (payload) => {
        this.partySync = payload
      }),
      onGameEvent('duelSync', (payload) => {
        this.duelSync = payload
        if (!payload) {
          this.chaseDuelOpponent = null
          this.queuedDuelSkillCast = null
        }
      }),
      onGameEvent('duelHpSync', ({ hp }) => {
        if (hp < 0) return
        const prev = this.session.hp
        const damage = Math.max(0, prev - hp)
        this.session = { ...this.session, hp }
        if (damage > 0 && this.duelSync) {
          const enduring = hasStatus(this.activeBuffs, 'endure')
          if (!enduring) this.breakRestState()
          showFloatingText(
            this,
            this.playerDisplay.container.x,
            this.playerDisplay.container.y - 36,
            `-${damage}`,
            'mobHitPlayer',
          )
          flashPlayerHit(this, this.playerDisplay)
          this.sfx.playHit()
          logActivity('combat', `Took ${damage} damage in a duel.`)
        }
        if (hp <= 0) {
          this.endDuelAsLoser()
        } else {
          this.emitCharacterSheet()
        }
      }),
      onGameEvent('partyExpGrant', (payload) => {
        this.applyPartyExpGrant(payload)
      }),
      onGameEvent('playerRevived', ({ x, y }) => {
        this.isPlayerDead = false
        this.isPlayingDead = false
        if (this.playerDisplay) {
          clearPlayerDeathVisual(this.playerDisplay)
          this.playerDisplay.container.setPosition(x, y)
          playPlayerAnim(this.playerDisplay, 'idle', this.facing)
        }
        this.emitCharacterSheet()
        logActivity('character', 'Revived at save point.')
      }),
      onGameEvent('pvpAttackRequest', ({ characterId }) => {
        const entity = this.remotePlayers.get(characterId)
        if (entity && this.isPvpActive() && this.canAttackPlayer(characterId)) {
          this.beginChasePvpOpponent(entity)
        }
      }),
      onGameEvent('pvpRespawnInArena', ({ x, y }) => {
        if (this.progressSaveTimer) {
          window.clearTimeout(this.progressSaveTimer)
          this.progressSaveTimer = null
        }
        const sheet = toCharacterSheetPayload(this.session)
        this.session = { ...this.session, hp: sheet.hpMax, mp: sheet.mpMax }
        this.isPlayerDead = false
        this.isPlayingDead = false
        this.stopPvpChase()
        if (this.playerDisplay) {
          clearPlayerDeathVisual(this.playerDisplay)
          this.playerDisplay.container.setPosition(x, y)
          playPlayerAnim(this.playerDisplay, 'idle', this.facing)
        }
        this.emitCharacterSheet()
        void saveCharacterSession(this.character.id, getCharacterSession()).catch((err) => {
          console.warn('PVP respawn progress save failed', err)
        })
        logActivity('combat', 'Respawned in the PVP arena.')
        emitGameEvent('status', 'Respawned with full HP and SP.')
        emitGameEvent('pvpRespawned', { x, y })
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
      onGameEvent('autoAttackSync', (payload) => {
        this.applyAutoAttackSync(payload)
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
          if (remote.anim === 'dead') {
            this.pvpDeadRemoteIds.add(remote.characterId)
          } else {
            this.pvpDeadRemoteIds.delete(remote.characterId)
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
      registerActiveMapPresence(presenceChannel)
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
      this.isPvpActive()
        ? 'PVP enabled — party members cannot be attacked. Click players to fight.'
        : `Entered ${this.character.map_id} — click move, click NPCs, Space jump, 1–9 skills`,
    )
    emitGameEvent('worldReady', { mapId: this.character.map_id })
    if (this.autoAttackConfig.enabled && this.shouldAbortAutoAttack()) {
      emitGameEvent('autoAttackDisable', {})
    }

    if (this.session.hp <= 0) {
      this.enterPlayerDeath({ animate: false })
    }
  }

  private playerLabel!: Phaser.GameObjects.Text
  private playerSkillCallout!: Phaser.GameObjects.Text
  private playerChatBubble!: PlayerChatBubble

  private showChatBubbleForCharacter(characterId: string, text: string) {
    const duration = chatBubbleDurationMs(text)
    if (characterId === this.character.id) {
      this.playerChatBubble.show(text, duration)
      const bounds = viewBoundsWithMargin(this.cameras.main)
      const x = this.playerDisplay.container.x
      const y = this.playerDisplay.container.y
      positionPlayerChatBubbleAtFeet(this.playerChatBubble, x, this.playerFeetY())
      const inView = entityInView(bounds, x, y)
      this.playerChatBubble.container.setVisible(inView && !this.isPlayerDead)
      return
    }
    const entity = this.remotePlayers.get(characterId)
    if (!entity) return
    entity.chatBubble.show(text, duration)
    const c = entity.display.container
    positionPlayerChatBubbleAtFeet(entity.chatBubble, c.x, c.y + PLAYER_FEET_OFFSET)
    if (entity.inViewport) entity.chatBubble.container.setVisible(true)
  }

  private enterPlayerDeath(options?: { animate?: boolean }) {
    this.disableAutoAttackFromManualInput()
    if (this.isPlayerDead || this.session.hp > 0) return
    this.isPlayerDead = true
    this.clearGroundAoECastDismissTimer()
    this.cancelPlayerCastPresentation()
    this.groundAoEMarker.cancel()
    this.pendingSkill = null
    this.queuedSkillCast = null
    this.chaseMobForSkillOnly = false
    this.isPlayingDead = false
    if (this.isSitting) this.standUp()
    this.chaseMob = null
    this.stopPvpChase()
    this.chaseDuelOpponent = null
    this.queuedDuelSkillCast = null
    this.isAttacking = false
    clearMoveTarget(this.moveTarget)
    this.stopPlayerMotion()
    if (options?.animate !== false) {
      playPlayerDeath(this, this.playerDisplay, this.facing)
    } else {
      playPlayerAnim(this.playerDisplay, 'dead', this.facing)
      setPlayerDeadFrame(this.playerDisplay, 1)
    }
    logActivity('combat', 'You have been defeated.')
    if (isPvpMap(this.character.map_id)) {
      emitGameEvent('pvpDeath', { mapId: this.character.map_id })
    } else {
      emitGameEvent('playerDeath', {})
    }
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

  private playerAttackCooldownMs(): number {
    return playerAttackTiming(this.session).attackIntervalMs
  }

  update() {
    const sheet = toCharacterSheetPayload(this.session)
    const wallNow = Date.now()
    const speed = moveSpeedFromAgi(sheet.effectiveAgi) * rentalSpeedMultiplier(this.session, wallNow)
    const now = this.time.now

    this.tickActiveRental(wallNow)
    this.tickStatusEffects(wallNow)

    if (this.isPlayerDead) {
      const pose = this.playerDisplay.pose
      if (pose.anim !== 'flinch' && pose.anim !== 'dead') {
        playPlayerAnim(this.playerDisplay, 'dead', this.facing)
        setPlayerDeadFrame(this.playerDisplay, 1)
      }
      this.stopPlayerMotion()
      clearMoveTarget(this.moveTarget)
    } else if (this.isPlayingDead) {
      const pose = this.playerDisplay.pose
      if (pose.anim !== 'dead') {
        playPlayerAnim(this.playerDisplay, 'dead', this.facing)
        setPlayerDeadFrame(this.playerDisplay, 1)
      }
      this.stopPlayerMotion()
      clearMoveTarget(this.moveTarget)
    } else if (this.isSitting) {
      setPlayerSitting(this.playerDisplay, true, this.facing)
      this.stopPlayerMotion()
      clearMoveTarget(this.moveTarget)
      this.tickSitRegen(now, sheet)
      if (this.autoAttackConfig.enabled && this.autoSitForRegen) {
        this.tickAutoAttackWhileSitting(sheet)
      }
    } else if (!this.isAttacking && !this.isJumping) {
      this.tickPvpPassiveRegen(now, sheet)
      if (this.autoAttackConfig.enabled && !this.pendingSkill) {
        this.tickAutoAttack(now, sheet)
      }
      if (this.chaseMob?.alive) {
        this.tickChaseMob(now)
      } else if (this.chaseDuelOpponent) {
        this.tickChaseDuelOpponent(now)
      } else if (this.chasePvpOpponent) {
        this.tickChasePvpOpponent(now)
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

    if (
      !this.uiKeyboardLocked &&
      !isChatStripInputFocused() &&
      !this.isPlayerDead &&
      !this.isSitting &&
      !this.isPlayingDead &&
      Phaser.Input.Keyboard.JustDown(this.spaceKey)
    ) {
      const jumped = tryJump(this, this.playerDisplay.container, () => this.isJumping, (v) => {
        this.isJumping = v
      })
      if (jumped) playPlayerAnim(this.playerDisplay, 'jump', this.facing)
    }

    const playerAlive = this.session.hp > 0 && !this.isPlayingDead
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

    if (!this.isPlayerDead && this.isPvpActive()) {
      this.mapDropManager?.tickPlayerProximity(
        this.playerDisplay.container.x,
        this.playerDisplay.container.y,
      )
    }

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
    this.tickGroundAoEPreview()
    this.refreshCursor()
    this.refreshMapDropHover()
    this.emitMinimap(now)
  }

  private worldToCanvasScreen(worldX: number, worldY: number): { x: number; y: number } {
    const cam = this.cameras.main
    return {
      x: (worldX - cam.scrollX) * cam.zoom + cam.width * 0.5,
      y: (worldY - cam.scrollY) * cam.zoom + cam.height * 0.5,
    }
  }

  private refreshMapDropHover() {
    if (this.uiPointerLocked || this.isPlayerDead) {
      this.emitMapDropHoverIfChanged(null)
      return
    }
    const p = this.input.activePointer
    const hit = this.mapDropManager?.findDropAt(p.worldX, p.worldY)
    if (!hit) {
      this.emitMapDropHoverIfChanged(null)
      return
    }
    const screen = this.worldToCanvasScreen(hit.x, hit.y - 22)
    this.emitMapDropHoverIfChanged({
      itemId: hit.itemId,
      screenX: screen.x,
      screenY: screen.y,
    })
  }

  private emitMapDropHoverIfChanged(
    payload: { itemId: string; screenX: number; screenY: number } | null,
  ) {
    const key = payload
      ? `${payload.itemId}:${Math.round(payload.screenX)}:${Math.round(payload.screenY)}`
      : null
    if (key === this.lastMapDropHoverKey) return
    this.lastMapDropHoverKey = key
    emitGameEvent('mapDropHover', payload)
  }

  private refreshCursor() {
    if (!this.sys.isActive() || !this.input?.manager) return
    let next: GameCursor = 'default'
    if (!this.uiPointerLocked && !this.isPlayerDead) {
      const p = this.input.activePointer
      if (this.pendingSkill) {
        next = this.pendingSkill.def.target === 'ground' ? 'aoe' : 'skillTarget'
      } else if (this.findNpcAt(p.worldX, p.worldY)) {
        next = 'npc'
      } else if (this.mapDropManager?.findDropAt(p.worldX, p.worldY)) {
        next = 'loot'
      } else if (this.findAttackableRemotePlayerAt(p.worldX, p.worldY)) {
        next = 'mob'
      } else if (this.findMobAt(p.worldX, p.worldY)) {
        next = 'mob'
      }
    }
    const pendingCursor = Boolean(this.pendingSkill)
    if (next !== this.currentCursor) {
      this.currentCursor = next
      this.applyGameCursor(next)
    } else if (pendingCursor) {
      this.applyGameCursor(next)
    }
  }

  private applyGameCursor(cursor: GameCursor) {
    const css = cursorCss(cursor)
    this.input.setDefaultCursor(css)
    applyGameCursorToDom(this.game, css)
  }

  private refreshPlayerNameLabels() {
    const bounds = viewBoundsWithMargin(this.cameras.main)
    const px = this.input.activePointer.worldX
    const py = this.input.activePointer.worldY
    const localX = this.playerDisplay.container.x
    const localY = this.playerDisplay.container.y

    const localFeetY = this.playerFeetY()
    positionPlayerNameLabel(this.playerLabel, localX, localY)
    positionSkillCalloutLabel(this.playerSkillCallout, localX, localY)
    if (this.playerCastBar.isActive) {
      positionPlayerCastBar(this.playerCastBar.container, localX, localFeetY)
    }
    if (this.playerSpellChant.isActive) {
      this.playerSpellChant.setPosition(localX, localFeetY)
    }
    positionPlayerChatBubbleAtFeet(this.playerChatBubble, localX, localFeetY)
    const localInView = entityInView(bounds, localX, localY)
    this.playerLabel.setVisible(localInView && !this.isPlayerDead)
    if (!this.playerSkillCallout.visible || this.playerSkillCallout.alpha <= 0) {
      this.playerSkillCallout.setVisible(localInView && !this.isPlayerDead)
    }
    if (this.playerChatBubble.isShowing()) {
      this.playerChatBubble.container.setVisible(localInView && !this.isPlayerDead)
    } else {
      this.playerChatBubble.container.setVisible(false)
    }

    if (this.uiPointerLocked) {
      for (const entity of this.remotePlayers.values()) {
        entity.label.setVisible(false)
      }
      return
    }

    const hoveredRemote = this.findRemotePlayerAt(px, py)
    for (const entity of this.remotePlayers.values()) {
      const c = entity.display.container
      const feetY = c.y + PLAYER_FEET_OFFSET
      positionPlayerNameLabel(entity.label, c.x, c.y)
      positionPlayerChatBubbleAtFeet(entity.chatBubble, c.x, feetY)
      entity.label.setVisible(entity.inViewport && entity === hoveredRemote)
      if (entity.chatBubble.isShowing()) {
        entity.chatBubble.container.setVisible(entity.inViewport)
      }
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

  private beginChaseMob(mob: MobInstance, fromAuto = false) {
    if (!fromAuto) {
      this.disableAutoAttackFromManualInput()
    } else {
      this.autoAttackChaseActive = true
    }
    this.chaseMobForSkillOnly = false
    this.chaseDuelOpponent = null
    this.chaseMob = mob
    this.setSelectedMob(mob)
    this.setSelectedPlayer(null)
    this.lastChaseRepathAt = 0
    this.requestChaseMobPath(mob)
    this.faceToward(mob.sprite.x, mob.sprite.y)
  }

  private requestChaseMobPath(mob: MobInstance) {
    this.chasePathGoalX = mob.sprite.x
    this.chasePathGoalY = mob.sprite.y
    this.requestWalkTo(mob.sprite.x, mob.sprite.y)
  }

  private tickChaseMob(now: number) {
    const mob = this.chaseMob
    if (!mob?.alive || !this.playerDisplay) return

    const mx = mob.sprite.x
    const my = mob.sprite.y
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const dist = Phaser.Math.Distance.Between(px, py, mx, my)
    const inAttackRange = isWithinPlayerAttackRange(this.session.equipment, px, py, mx, my)

    const queued = this.queuedSkillCast
    if (queued) {
      if (!queued.mob.alive || queued.mob !== mob) {
        this.queuedSkillCast = null
        if (this.chaseMobForSkillOnly) {
          this.chaseMob = null
          this.chaseMobForSkillOnly = false
        }
        return
      }
      const skillRange = this.skillRangePx(queued.def)
      if (dist <= skillRange) {
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.faceToward(mx, my)
        const cast = this.queuedSkillCast
        this.queuedSkillCast = null
        if (cast) {
          this.executePlayerSkill(cast.skillId, cast.level, cast.def, cast.mob)
        }
        this.chaseMob = null
        this.chaseMobForSkillOnly = false
        return
      }
    } else if (inAttackRange && !this.chaseMobForSkillOnly) {
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
      this.faceToward(mx, my)
      this.tryBasicAttack()
      return
    }

    const mobShift = Math.hypot(mx - this.chasePathGoalX, my - this.chasePathGoalY)
    const outOfStrikeRange = queued ? dist > this.skillRangePx(queued.def) : !inAttackRange
    const needRepath =
      now - this.lastChaseRepathAt >= 350 ||
      mobShift >= 48 ||
      (!this.moveTarget.active && outOfStrikeRange)

    if (needRepath) {
      this.requestChaseMobPath(mob)
      this.lastChaseRepathAt = now
    }
  }

  private playWalkClickMarker(wx: number, wy: number) {
    if (!this.playerDisplay) return
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (Math.hypot(wx - px, wy - py) <= CLICK_MOVE_ARRIVAL_THRESHOLD) return
    playWalkClickFx(this, wx, wy)
  }

  private requestWalkTo(wx: number, wy: number) {
    if (!this.playerDisplay) return
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (Math.hypot(wx - px, wy - py) <= CLICK_MOVE_ARRIVAL_THRESHOLD) {
      return
    }
    if (!this.walkGrid) {
      setMoveTarget(this.moveTarget, wx, wy)
      return
    }
    const path = findWorldPath(
      this.walkGrid,
      this.mapTilesWide,
      this.mapTilesHigh,
      this.mapTileWidth,
      this.mapTileHeight,
      px,
      py,
      wx,
      wy,
    )
    if (!path || path.length === 0) {
      setMoveTarget(this.moveTarget, wx, wy)
      return
    }
    const trimmed = trimPathFromPlayer(path, px, py)
    if (trimmed.length === 0) {
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
      return
    }
    const goal = trimmed[trimmed.length - 1]
    if (
      trimmed.length === 1 &&
      Math.hypot(goal.x - px, goal.y - py) <= CLICK_MOVE_ARRIVAL_THRESHOLD
    ) {
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
      return
    }
    setMoveTarget(this.moveTarget, wx, wy, trimmed)
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

    return this.collectBlockedTilesInTileRange(layer, tw, th, tx0, ty0, tx1, ty1)
  }

  private collectAllBlockedTiles(): MinimapWorldRect[] {
    const layer = this.collisionLayer
    if (!layer || this.mapTilesWide <= 0 || this.mapTilesHigh <= 0) return []

    const tw = this.mapTileWidth
    const th = this.mapTileHeight
    const tileCount = this.mapTilesWide * this.mapTilesHigh
    if (tileCount > 12000) return []

    return this.collectBlockedTilesInTileRange(
      layer,
      tw,
      th,
      0,
      0,
      this.mapTilesWide - 1,
      this.mapTilesHigh - 1,
    )
  }

  private collectBlockedTilesInTileRange(
    layer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer,
    tw: number,
    th: number,
    tx0: number,
    ty0: number,
    tx1: number,
    ty1: number,
  ): MinimapWorldRect[] {
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
      npcs: [],
      obstacles: [],
      blockedTiles: [],
    }

    if (this.minimapExpanded) {
      payload.obstacles = this.minimapObstacleRects
      payload.blockedTiles = this.minimapBlockedTilesFull
      payload.npcs = this.npcs.map((npc) => ({
        npcId: npc.id,
        name: npc.label,
        x: npc.x,
        y: npc.y,
      }))
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
    } else {
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
    }

    emitGameEvent('minimap', payload)
  }

  private buildPlayerPresencePayload(): PlayerPresencePayload {
    if (!this.playerDisplay) {
      return {
        characterId: this.character.id,
        name: this.character.name,
        mapId: this.character.map_id,
        x: this.character.x,
        y: this.character.y,
        facing: 'down',
        anim: 'idle',
        walkFrame: 0,
        mounted: false,
        jobId: this.session.jobId,
        equipment: this.session.equipment,
        appearance: appearanceFromCharacterRow(this.character),
        guildTag: this.socialPresence.guildTag ?? null,
        isVending: Boolean(this.socialPresence.isVending),
        stallTitle: this.socialPresence.stallTitle ?? null,
      }
    }

    const body = this.getPlayerBody()
    const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0
    if (this.presenceWalkActive) {
      if (speed < 4) this.presenceWalkActive = false
    } else if (speed > 8) {
      this.presenceWalkActive = true
    }
    const moving = this.presenceWalkActive
    let anim: PlayerPresencePayload['anim'] = 'idle'
    if (this.isPlayerDead || this.isPlayingDead) anim = 'dead'
    else if (this.isSitting) anim = 'sit'
    else if (this.isJumping) anim = 'jump'
    else if (this.isAttacking) anim = 'attack'
    else if (moving) anim = 'walk'

    const walkFrame =
      anim === 'walk' ? ((Math.floor(this.time.now / 150) % 2) as 0 | 1) : 0

    return {
      characterId: this.character.id,
      name: this.character.name,
      mapId: this.character.map_id,
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      facing: this.facing,
      anim,
      walkFrame,
      mounted: isOnPecoMount(this.session, this.activeBuffs),
      jobId: this.session.jobId,
      equipment: this.session.equipment,
      appearance: appearanceFromCharacterRow(this.character),
      guildTag: this.socialPresence.guildTag ?? null,
      isVending: Boolean(this.socialPresence.isVending),
      stallTitle: this.socialPresence.stallTitle ?? null,
      pvpSnapshot: this.isPvpActive() ? combatSnapshotFromSession(this.session) : undefined,
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
    setDepthByFeet(this.playerSkillCallout, playerFeet, 0.06)
    setDepthByFeet(this.playerCastBar.container, playerFeet, 0.065)
    if (this.playerSpellChant.isActive) {
      setDepthByFeet(this.playerSpellChant.text, playerFeet, 0.061)
    }
    if (this.groundAoEMarker.isActive) {
      this.groundAoEMarker.syncDepth()
    }
    setDepthByFeet(this.playerChatBubble.container, playerFeet, 0.07)
    this.syncMountVisuals(playerFeet)

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
      setDepthByFeet(entity.chatBubble.container, feet, 0.07)
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
    this.disableAutoAttackFromManualInput()
    this.tryUseSkillId(skillId)
  }

  private tryUseSkillId(
    skillId: string,
    opts?: { fromAuto?: boolean; mob?: MobInstance },
  ): boolean {
    const fromAuto = opts?.fromAuto === true
    const targetMob = opts?.mob
    if (isSkillBarConsumable(skillId)) {
      return this.tryUseConsumableItemId(skillId)
    }
    if (skillId === 'basic_attack') {
      if (targetMob?.alive) {
        this.chaseMob = targetMob
        this.setSelectedMob(targetMob)
      }
      this.tryBasicAttack()
      return true
    }
    const def = SKILLS[skillId]
    if (!def) return false
    const level = this.session.skills[skillId] ?? 0
    if (level < 1) {
      if (!fromAuto) emitGameEvent('status', `${def.name} not learned`)
      return false
    }
    if (!skillUsableByJob(skillId, this.session.jobId)) {
      if (!fromAuto) emitGameEvent('status', `${def.name} is not available for your job`)
      return false
    }
    if (def.type === 'passive') {
      if (!fromAuto) emitGameEvent('status', `${def.name} is passive`)
      return false
    }
    if (skillId === 'sit') {
      if (!fromAuto) this.toggleSit()
      return !fromAuto
    }
    if (skillId === 'play_dead') {
      if (!fromAuto) this.togglePlayDead()
      return !fromAuto
    }
    if (def.selfBuff) {
      this.trySelfBuffSkill(skillId, level, def)
      return true
    }
    if (def.target === 'ground') {
      if (!fromAuto) this.beginSkillTargeting(skillId, level, def)
      return false
    }
    if (def.target === 'enemy') {
      const mob = targetMob?.alive ? targetMob : this.resolveAttackTargetMob()
      if (!mob) return false
      const px = this.playerDisplay.container.x
      const py = this.playerDisplay.container.y
      const dist = Phaser.Math.Distance.Between(px, py, mob.sprite.x, mob.sprite.y)
      const skillRange = this.skillRangePx(def)
      if (dist <= skillRange) {
        this.executePlayerSkill(skillId, level, def, mob)
        return true
      }
      this.queuedSkillCast = { skillId, level, def, mob }
      this.chaseMobForSkillOnly = true
      this.autoAttackChaseActive = fromAuto
      this.chaseMob = mob
      this.setSelectedMob(mob)
      this.lastChaseRepathAt = 0
      this.chasePathGoalX = mob.sprite.x
      this.chasePathGoalY = mob.sprite.y
      this.requestWalkTo(mob.sprite.x, mob.sprite.y)
      this.faceToward(mob.sprite.x, mob.sprite.y)
      return true
    }
    if (!fromAuto) emitGameEvent('status', `${def.name} (Lv ${level}) — not implemented yet`)
    return false
  }

  private tryUseConsumableItemId(itemId: string): boolean {
    const idx = findSessionStackIndex(this.session, itemId)
    if (idx < 0) return false
    const result = useConsumableFromSession(this.session, idx)
    if (result.ok === false) return false
    setCharacterSession(syncDerivedVitals(result.state))
    this.session = getCharacterSession()
    this.emitCharacterSheet()
    emitGameEvent('sessionSync', sessionSyncPayload(structuredClone(this.session)))
    this.scheduleProgressSave()
    logActivity('character', `Used ${getItemDisplayName(itemId)}.`)
    return true
  }

  private beginSkillTargeting(skillId: string, level: number, def: SkillDefinition) {
    this.disableAutoAttackFromManualInput()
    this.queuedSkillCast = null
    this.pendingSkill = { skillId, level, def }
    if (def.target === 'ground' && (isPlayerGroundMagicSkill(skillId) || isPlayerGroundMagicStub(skillId))) {
      this.groundAoEMarker.showPreview(skillId, def)
    }
    emitGameEvent('status', `Select target for ${def.name} (Esc or right-click to cancel).`)
    this.refreshCursor()
  }

  private cancelSkillTargeting() {
    const hadPending = Boolean(this.pendingSkill)
    const hadGroundMarker = this.groundAoEMarker.isActive
    if (!hadPending && !hadGroundMarker) return

    this.pendingSkill = null
    this.queuedSkillCast = null
    if (this.chaseMobForSkillOnly) {
      this.chaseMob = null
      this.chaseMobForSkillOnly = false
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
    }
    if (this.chasePvpForSkillOnly) {
      this.chasePvpOpponent = null
      this.chasePvpForSkillOnly = false
      this.queuedPvpSkillCast = null
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
    }
    this.clearGroundAoECastDismissTimer()
    this.cancelPlayerCastPresentation()
    this.groundAoEMarker.cancel()
    emitGameEvent('status', 'Skill cancelled.')
    this.refreshCursor()
  }

  private clearGroundAoECastDismissTimer() {
    this.groundAoECastDismissTimer?.remove()
    this.groundAoECastDismissTimer = null
  }

  /** Hide rotating ground preview when variable cast time ends (before projectile travel). */
  private scheduleGroundAoECastPreviewDismiss(strikeDelayMs: number) {
    this.clearGroundAoECastDismissTimer()
    this.groundAoECastDismissTimer = this.time.delayedCall(strikeDelayMs, () => {
      this.groundAoECastDismissTimer = null
      this.groundAoEMarker.cancel()
    })
  }

  private tickGroundAoEPreview() {
    const pending = this.pendingSkill
    if (!pending || pending.def.target !== 'ground' || this.uiPointerLocked || this.isPlayerDead) return
    const p = this.input.activePointer
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const inRange =
      Phaser.Math.Distance.Between(px, py, p.worldX, p.worldY) <= this.skillRangePx(pending.def)
    this.groundAoEMarker.setPreviewPosition(p.worldX, p.worldY, inRange)
  }

  private beginPlayerCastPresentation(
    def: SkillDefinition,
    _skillId: string,
  ): { castMs: number; strikeDelay: number } {
    const castMs = calcPreRenewalCastTimeMsFromSession(def.castTimeMs, this.session)
    const strikeDelay = skillCastStrikeDelayMs(def.castTimeMs, this.session)
    const feetX = this.playerDisplay.container.x
    const feetY = this.playerFeetY()

    if (shouldShowSpellChant(strikeDelay)) {
      const seed = (this.castChantSeed += 1)
      const phrase = buildRandomCastChant(strikeDelay, seed)
      this.playerSpellChant.play(phrase, strikeDelay, feetX, feetY)
    } else {
      this.playerSpellChant.cancel()
    }

    this.playerCastBar.cancel()

    return { castMs, strikeDelay }
  }

  private cancelPlayerCastPresentation() {
    this.playerSpellChant.cancel()
    this.playerCastBar.cancel()
  }

  private showSkillCallout(name: string, durationMs = 1200) {
    this.skillCalloutTween?.stop()
    this.playerSkillCallout.setText(name)
    this.playerSkillCallout.setVisible(true)
    this.playerSkillCallout.setAlpha(0)
    this.tweens.add({
      targets: this.playerSkillCallout,
      alpha: 1,
      duration: 120,
      ease: 'Sine.easeOut',
    })
    this.skillCalloutTween = this.tweens.add({
      targets: this.playerSkillCallout,
      alpha: 0,
      delay: durationMs - 280,
      duration: 280,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.playerSkillCallout.setVisible(false)
        this.skillCalloutTween = null
      },
    })
  }

  private confirmSkillTargeting(wx: number, wy: number) {
    const pending = this.pendingSkill
    if (!pending) return
    const { skillId, level, def } = pending

    if (def.target === 'ground') {
      if (isPlayerGroundMagicSkill(skillId) || isPlayerGroundMagicStub(skillId)) {
        const px = this.playerDisplay.container.x
        const py = this.playerDisplay.container.y
        if (Phaser.Math.Distance.Between(px, py, wx, wy) > this.skillRangePx(def)) {
          emitGameEvent('status', 'Target out of range.')
          this.refreshCursor()
          return
        }
        this.pendingSkill = null
        this.executePlayerGroundSkill(skillId, level, def, wx, wy)
      } else {
        this.pendingSkill = null
        emitGameEvent(
          'status',
          `${def.name} — ground target (${Math.round(wx)}, ${Math.round(wy)}) not implemented yet`,
        )
      }
      this.refreshCursor()
      return
    }

    const remote = this.findRemotePlayerAt(wx, wy)
    if (
      remote &&
      this.isPvpActive() &&
      this.canAttackPlayer(remote.lastPayload.characterId)
    ) {
      this.pendingSkill = null
      this.breakRestState()
      const rx = remote.display.container.x
      const ry = remote.display.container.y
      const skillRange = this.skillRangePx(def)
      const distToRemote = Phaser.Math.Distance.Between(
        this.playerDisplay.container.x,
        this.playerDisplay.container.y,
        rx,
        ry,
      )
      const inSkillRange =
        distToRemote <= skillRange && this.duelOpponentInStrikeRange(remote, skillRange)
      if (inSkillRange) {
        this.executePlayerSkillOnRemotePlayer(skillId, level, def, remote)
      } else {
        this.queuedPvpSkillCast = { skillId, level, def, remote }
        this.chasePvpForSkillOnly = true
        this.chasePvpOpponent = remote
        this.chaseDuelOpponent = null
        this.chaseMob = null
        this.setSelectedMob(null)
        this.lastChaseRepathAt = 0
        this.chasePathGoalX = rx
        this.chasePathGoalY = ry
        this.requestWalkTo(rx, ry)
        this.faceToward(rx, ry)
      }
      this.refreshCursor()
      return
    }
    if (
      remote &&
      this.isDuelCombatAllowed() &&
      this.duelSync &&
      remote.lastPayload.characterId === this.duelSync.opponentCharacterId
    ) {
      this.pendingSkill = null
      this.breakRestState()
      this.queuedDuelSkillCast = { skillId, level, def, remote }
      this.beginChaseDuelOpponent(remote)
      const rx = remote.display.container.x
      const ry = remote.display.container.y
      if (
        Phaser.Math.Distance.Between(
          this.playerDisplay.container.x,
          this.playerDisplay.container.y,
          rx,
          ry,
        ) <= this.skillRangePx(def) &&
        this.duelOpponentInStrikeRange(remote, this.skillRangePx(def))
      ) {
        const cast = this.queuedDuelSkillCast
        this.queuedDuelSkillCast = null
        if (cast) {
          this.executePlayerSkillOnDuelOpponent(cast.skillId, cast.level, cast.def, cast.remote)
        }
      }
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
    this.breakRestState()
    const skillRange = this.skillRangePx(def)
    const distToMob = Phaser.Math.Distance.Between(
      this.playerDisplay.container.x,
      this.playerDisplay.container.y,
      mob.sprite.x,
      mob.sprite.y,
    )
    if (distToMob <= skillRange) {
      this.executePlayerSkill(skillId, level, def, mob)
    } else {
      this.queuedSkillCast = { skillId, level, def, mob }
      this.chaseMobForSkillOnly = true
      this.chaseDuelOpponent = null
      this.chaseMob = mob
      this.setSelectedPlayer(null)
      this.lastChaseRepathAt = 0
      this.requestChaseMobPath(mob)
      this.faceToward(mob.sprite.x, mob.sprite.y)
    }
    this.refreshCursor()
  }

  private skillRangePx(def: SkillDefinition): number {
    return def.range > 0 ? def.range : getPlayerAttackRangePx(this.session.equipment)
  }

  private mobsInAoERadius(cx: number, cy: number, radius: number): MobInstance[] {
    const hits: MobInstance[] = []
    for (const mob of this.mobs) {
      if (!mob.alive) continue
      if (Phaser.Math.Distance.Between(cx, cy, mob.sprite.x, mob.sprite.y) <= radius) {
        hits.push(mob)
      }
    }
    return hits
  }

  private executePlayerSkill(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    primaryMob: MobInstance,
  ) {
    if (isPlayerMagicEnemySkill(skillId)) {
      this.runPlayerMagicSkill(skillId, skillLevel, def, primaryMob)
      return
    }
    if (isPlayerMagicEnemyStub(skillId)) {
      this.executeDispellStub(skillLevel, def, primaryMob)
      return
    }
    if (!isPlayerEnemyCastSkill(skillId)) {
      emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — not implemented yet`)
      return
    }

    if (skillId === 'provoke') {
      this.executeProvokeSkill(skillLevel, def, primaryMob)
      return
    }

    this.runPlayerMeleeSkill(skillId, skillLevel, def, primaryMob)
  }

  private executeProvokeSkill(skillLevel: number, def: SkillDefinition, target: MobInstance) {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return
    if (!target.alive) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (
      Phaser.Math.Distance.Between(px, py, target.sprite.x, target.sprite.y) > this.skillRangePx(def)
    ) {
      emitGameEvent('status', 'Target out of range.')
      return
    }

    this.lastAttackAt = now
    this.faceToward(target.sprite.x, target.sprite.y)
    this.showSkillCallout(def.name)
    playSkillCastFx(this, 'provoke', {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth: this.playerDisplay.container.depth + 0.1,
      targetX: target.sprite.x,
      targetY: target.sprite.y,
    })
    provokeMob(target)
    emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — target enraged.`)
    logActivity('combat', `${def.name} Lv ${skillLevel} on Lv ${target.level} ${target.name}.`)
    this.emitCharacterSheet()
  }

  private executeDispellStub(skillLevel: number, def: SkillDefinition, target: MobInstance) {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return
    if (!target.alive) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (
      Phaser.Math.Distance.Between(px, py, target.sprite.x, target.sprite.y) > this.skillRangePx(def)
    ) {
      emitGameEvent('status', 'Target out of range.')
      return
    }

    this.lastAttackAt = now
    this.isAttacking = true
    this.faceToward(target.sprite.x, target.sprite.y)
    const { castMs, strikeDelay } = this.beginPlayerCastPresentation(def, 'dispell')
    this.showSkillCallout(def.name, Math.max(1200, castMs + 500))
    const depth = this.playerDisplay.container.depth + 0.1
    playSkillCastFx(this, 'dispell', {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth,
      targetX: px,
      targetY: py,
    })
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      attackStyle: 'cast',
      strikeDelayMs: strikeDelay,
      getAimTarget: () => toCombatAimPoint(target.sprite.x, target.sprite.y),
      magicSkillId: 'dispell',
      magicHitCount: 1,
      onMagicHit: () => {
        const aim = toCombatAimPoint(target.sprite.x, target.sprite.y)
        playSkillImpactFx(this, 'dispell', aim.x, aim.y, depth)
        emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — buff removal not implemented yet.`)
        logActivity('combat', `${def.name} Lv ${skillLevel} on Lv ${target.level} ${target.name} (stub).`)
      },
      onMagicVolleyComplete: () => this.emitCharacterSheet(),
      onComplete: () => {
        this.cancelPlayerCastPresentation()
        this.isAttacking = false
      },
    })
  }

  private applyMagicSingleHitToMob(
    mob: MobInstance,
    skillId: string,
    skillLevel: number,
    skillLabel: string,
    mobDef: (typeof MOB_DEFS)[string],
  ) {
    const { damage, critical } = calcPlayerMagicSkillSingleHit(this.session, mobDef, skillId, skillLevel)
    if (damage <= 0 || !mob.alive) return
    this.applyDamageToMob(mob, damage, mobDef, skillLabel, { critical, criticalMagic: critical })
  }

  private runPlayerMagicSkill(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    primaryMob: MobInstance,
  ) {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return
    if (!primaryMob.alive) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (
      Phaser.Math.Distance.Between(px, py, primaryMob.sprite.x, primaryMob.sprite.y) >
      this.skillRangePx(def)
    ) {
      emitGameEvent('status', 'Target out of range.')
      return
    }

    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)
    this.faceToward(primaryMob.sprite.x, primaryMob.sprite.y)
    const { castMs, strikeDelay } = this.beginPlayerCastPresentation(def, skillId)
    this.showSkillCallout(def.name, Math.max(1200, castMs + 500))

    const skillLabel = def.name
    const depth = this.playerDisplay.container.depth + 0.1
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth,
      targetX: px,
      targetY: py,
    })

    this.sfx.playAttack()
    this.broadcastPlayerAction('basic_attack')

    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      attackStyle: 'cast',
      strikeDelayMs: strikeDelay,
      getAimTarget: () => toCombatAimPoint(primaryMob.sprite.x, primaryMob.sprite.y),
      magicSkillId: skillId,
      magicHitCount: magicSkillHitCount(def, skillLevel),
      onMagicHit: () => {
        const mobDef = MOB_DEFS[primaryMob.defId]
        if (!mobDef || !primaryMob.alive) return
        const aim = toCombatAimPoint(primaryMob.sprite.x, primaryMob.sprite.y)
        playSkillImpactFx(this, skillId, aim.x, aim.y, depth)
        this.applyMagicSingleHitToMob(primaryMob, skillId, skillLevel, skillLabel, mobDef)
        if (skillId === 'stone_curse') {
          emitGameEvent('status', `${skillLabel} — petrify not implemented yet.`)
        }
      },
      onMagicVolleyComplete: () => {
        this.emitCharacterSheet()
      },
      onComplete: () => {
        this.cancelPlayerCastPresentation()
        this.isAttacking = false
      },
    })
  }

  private executePlayerGroundSkill(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    wx: number,
    wy: number,
  ) {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (Phaser.Math.Distance.Between(px, py, wx, wy) > this.skillRangePx(def)) {
      emitGameEvent('status', 'Target out of range.')
      return
    }

    this.lastAttackAt = now
    this.breakRestState()
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)
    this.faceToward(wx, wy)
    this.groundAoEMarker.lockCast(wx, wy)
    const { castMs, strikeDelay } = this.beginPlayerCastPresentation(def, skillId)
    this.showSkillCallout(def.name, Math.max(1200, castMs + 500))

    const depth = this.playerDisplay.container.depth + 0.1
    const aoeRadius = groundAoERadiusPx(def, skillId)
    this.scheduleGroundAoECastPreviewDismiss(strikeDelay)
    const aim = toCombatAimPoint(wx, wy)

    if (isPlayerGroundMagicStub(skillId)) {
      this.isAttacking = true
      playSkillCastFx(this, skillId, {
        playerX: px,
        playerY: py,
        facing: this.facing,
        depth,
        targetX: px,
        targetY: py,
      })
      startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
        variant: 'basic',
        attackStyle: 'cast',
        strikeDelayMs: strikeDelay,
        getAimTarget: () => aim,
        magicSkillId: skillId,
        magicHitCount: 1,
        onMagicHit: () => {
          playGroundAoEImpactBurst(this, wx, wy, skillId, aoeRadius)
          emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — tile effect not implemented yet.`)
          logActivity('combat', `${def.name} Lv ${skillLevel} at (${Math.round(wx)}, ${Math.round(wy)}).`)
        },
        onMagicVolleyComplete: () => this.emitCharacterSheet(),
        onComplete: () => {
          this.clearGroundAoECastDismissTimer()
          this.groundAoEMarker.cancel()
          this.cancelPlayerCastPresentation()
          this.isAttacking = false
        },
      })
      return
    }

    this.isAttacking = true
    this.sfx.playAttack()
    this.broadcastPlayerAction('basic_attack')
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth,
      targetX: px,
      targetY: py,
    })
    const skillLabel = def.name
    const radius = def.magic?.aoeRadius ?? 64
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      attackStyle: 'cast',
      strikeDelayMs: strikeDelay,
      getAimTarget: () => aim,
      magicSkillId: skillId,
      magicHitCount: 1,
      onMagicHit: () => {
        playGroundAoEImpactBurst(this, wx, wy, skillId, aoeRadius)
      },
      onMagicVolleyComplete: () => {
        const victims = this.mobsInAoERadius(wx, wy, radius)
        if (victims.length === 0) {
          emitGameEvent('status', `${skillLabel} — no targets in area.`)
        } else {
          for (const mob of victims) {
            const mobDef = MOB_DEFS[mob.defId]
            if (!mobDef || !mob.alive) continue
            this.applyMagicSingleHitToMob(mob, skillId, skillLevel, skillLabel, mobDef)
          }
        }
        this.emitCharacterSheet()
      },
      onComplete: () => {
        this.clearGroundAoECastDismissTimer()
        this.groundAoEMarker.cancel()
        this.cancelPlayerCastPresentation()
        this.isAttacking = false
      },
    })
  }

  private runPlayerMeleeSkill(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    primaryMob: MobInstance,
  ) {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return
    if (!primaryMob.alive) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    if (
      Phaser.Math.Distance.Between(px, py, primaryMob.sprite.x, primaryMob.sprite.y) >
      this.skillRangePx(def)
    ) {
      emitGameEvent('status', 'Target out of range.')
      return
    }

    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)
    this.faceToward(primaryMob.sprite.x, primaryMob.sprite.y)
    this.showSkillCallout(def.name)

    const skillLabel = def.name
    const depth = this.playerDisplay.container.depth + 0.1
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth,
      targetX: primaryMob.sprite.x,
      targetY: primaryMob.sprite.y,
    })

    this.sfx.playAttack()
    this.broadcastPlayerAction(skillId === 'bash' ? 'bash' : 'basic_attack')
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    const attackStyle =
      skillId === 'pierce' || skillId === 'spear_stab' || skillId === 'spear_boomerang'
        ? 'thrust'
        : attackStyleForWeapon(weaponClass)

    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: skillId === 'bash' || skillId === 'bowling_bash' ? 'bash' : 'basic',
      attackStyle,
      onStrike: () => {
        const applyHit = (mob: MobInstance) => {
          const mobDef = MOB_DEFS[mob.defId]
          if (!mobDef) return
          const base = this.calcPlayerVsMobDamageForSession(mobDef)
          const { damage, hit, critical } = calcPlayerSkillVsMobDamage(base, skillId, skillLevel)
          if (!hit || damage <= 0) {
            showFloatingText(this, mob.sprite.x, mob.sprite.y - 40, 'MISS', 'miss')
            this.sfx.playMiss()
            this.broadcastMobMissAt(mob.spawnIndex, mob.sprite.x, mob.sprite.y - 40)
            logActivity('combat', `${skillLabel} missed Lv ${mob.level} ${mob.name}.`)
            return
          }
          this.applyDamageToMob(mob, damage, mobDef, skillLabel, { critical })
        }

        if (skillId === 'brandish_spear' || skillId === 'bowling_bash') {
          const radius = skillId === 'bowling_bash' ? 64 : 56
          const centerX = primaryMob.sprite.x
          const centerY = primaryMob.sprite.y
          const victims = this.mobsInAoERadius(centerX, centerY, radius)
          if (victims.length === 0) {
            applyHit(primaryMob)
          } else {
            for (const mob of victims) applyHit(mob)
          }
        } else {
          if (!primaryMob.alive) {
            const pos = missTextPosition(px, py, this.facing)
            showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
            this.sfx.playMiss()
            logActivity('combat', `${skillLabel} missed.`)
            this.emitCharacterSheet()
            return
          }
          applyHit(primaryMob)
        }
        this.emitCharacterSheet()
      },
      onComplete: () => {
        this.isAttacking = false
      },
    })
  }

  private executePlayerSkillOnRemotePlayer(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    remote: RemotePlayerEntity,
  ) {
    if (skillId === 'provoke') {
      emitGameEvent('status', `${def.name} cannot be used on players.`)
      return
    }
    if (isPlayerMagicEnemySkill(skillId) || isPlayerMagicEnemyStub(skillId)) {
      emitGameEvent('status', `${def.name} is not available on players yet.`)
      return
    }
    if (!isPlayerEnemyCastSkill(skillId)) {
      emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — not implemented yet`)
      return
    }
    this.runPlayerMeleeSkillOnRemotePlayer(skillId, skillLevel, def, remote)
  }

  private executePlayerSkillOnDuelOpponent(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    remote: RemotePlayerEntity,
  ) {
    this.executePlayerSkillOnRemotePlayer(skillId, skillLevel, def, remote)
  }

  private resolveRemoteCombatSnapshot(remote: RemotePlayerEntity): DuelCombatSnapshot | null {
    if (
      this.isDuelCombatAllowed() &&
      this.duelSync &&
      remote.lastPayload.characterId === this.duelSync.opponentCharacterId
    ) {
      return this.getDuelOpponentSnapshot()
    }
    if (this.isPvpActive() && this.canAttackPlayer(remote.lastPayload.characterId)) {
      return this.getRemotePvpSnapshot(remote)
    }
    return null
  }

  private runPlayerMeleeSkillOnRemotePlayer(
    skillId: string,
    skillLevel: number,
    def: SkillDefinition,
    remote: RemotePlayerEntity,
  ) {
    const snapshot = this.resolveRemoteCombatSnapshot(remote)
    if (!snapshot) return
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const tx = remote.display.container.x
    const ty = remote.display.container.y
    const skillRange = this.skillRangePx(def)
    if (Phaser.Math.Distance.Between(px, py, tx, ty) > skillRange) {
      emitGameEvent('status', 'Target out of range.')
      return
    }
    if (!this.duelOpponentInStrikeRange(remote, skillRange)) {
      emitGameEvent('status', 'Target not in range.')
      return
    }

    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)
    this.faceToward(tx, ty)
    this.showSkillCallout(def.name)

    const skillLabel = def.name
    const depth = this.playerDisplay.container.depth + 0.1
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth,
      targetX: tx,
      targetY: ty,
    })

    this.sfx.playAttack()
    this.broadcastPlayerAction(skillId === 'bash' ? 'bash' : 'basic_attack')
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    const attackStyle =
      skillId === 'pierce' || skillId === 'spear_stab' || skillId === 'spear_boomerang'
        ? 'thrust'
        : attackStyleForWeapon(weaponClass)

    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: skillId === 'bash' || skillId === 'bowling_bash' ? 'bash' : 'basic',
      attackStyle,
      onStrike: () => {
        if (!this.duelOpponentInStrikeRange(remote, skillRange)) {
          const pos = missTextPosition(px, py, this.facing)
          showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
          this.sfx.playMiss()
          logActivity('combat', `${skillLabel} missed.`)
          this.emitCharacterSheet()
          return
        }
        if (this.isPvpActive() && this.canAttackPlayer(remote.lastPayload.characterId)) {
          this.strikePvpOpponent(remote, snapshot, skillLabel, skillId, skillLevel)
        } else {
          this.strikeDuelOpponent(remote, snapshot, skillLabel, skillId, skillLevel)
        }
        this.emitCharacterSheet()
      },
      onComplete: () => {
        this.isAttacking = false
      },
    })
  }

  private tickActiveRental(wallNow: number) {
    if (!this.session.activeRental) return
    if (activeRentalAt(this.session, wallNow)) return
    this.session = clearActiveRental(this.session)
    emitGameEvent('sessionSync', sessionSyncPayload(structuredClone(this.session)))
    this.scheduleProgressSave()
    this.emitPlayerBuffs()
    logActivity('character', 'Equipment rental expired.')
  }

  private rentalHudBuffs(wallNow: number): PlayerBuffPayload[] {
    const active = activeRentalAt(this.session, wallNow)
    if (!active) return []
    const entry = rentalCatalogEntry(active.kind)
    const iconSkillId =
      active.kind === 'cart' ? 'pushcart' : active.kind === 'falcon' ? 'falcon_mastery' : 'peco_peco_ride'
    const durationMs = Math.max(1, entry.durationMs)
    return [
      {
        statusId: `rental_${active.kind}`,
        name: entry.name,
        iconSkillId,
        skillLevel: 1,
        expiresAt: active.expiresAt,
        durationMs,
        displayKind: 'status',
      },
    ]
  }

  private tickStatusEffects(now: number) {
    const pruned = pruneExpired(this.activeBuffs, now)
    if (!buffsEqual(pruned, this.activeBuffs)) {
      this.activeBuffs = pruned
      this.emitPlayerBuffs()
    }
  }

  private emitPlayerBuffs() {
    const wallNow = Date.now()
    const rental = activeRentalAt(this.session, wallNow)
    let buffPayloads = toPlayerBuffPayloads(this.activeBuffs)
    if (rental?.kind === 'peco_peco' && hasStatus(this.activeBuffs, PECO_RIDE_STATUS_ID)) {
      buffPayloads = buffPayloads.filter((b) => b.statusId !== PECO_RIDE_STATUS_ID)
    }
    emitGameEvent('playerBuffs', [...buffPayloads, ...this.rentalHudBuffs(wallNow)])
  }

  private syncMountVisuals(playerFeet: number) {
    const active = activeRentalAt(this.session, Date.now())
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const onPeco = isOnPecoMount(this.session, this.activeBuffs)
    const showCart = active?.kind === 'cart'
    const showFalcon = active?.kind === 'falcon'

    setPlayerMounted(this.playerDisplay, onPeco)
    const pose = this.playerDisplay.pose
    syncPecoMountGfx(this.pecoMountGfx, onPeco, pose.facing, pose.anim, pose.walkFrame)

    this.rentalCartGfx.setVisible(showCart)
    this.rentalFalconGfx.setVisible(showFalcon)

    if (showCart) {
      const backX = this.facing === 'left' ? px + 14 : this.facing === 'right' ? px - 14 : px
      const backY = this.facing === 'up' ? py + 12 : this.facing === 'down' ? py - 10 : py
      this.rentalCartGfx.setPosition(backX, backY)
      setDepthByFeet(this.rentalCartGfx, playerFeet, -0.35)
    }
    if (showFalcon) {
      this.rentalFalconAngle += 0.04
      const orbit = 28
      const fx = px + Math.cos(this.rentalFalconAngle) * orbit
      const fy = py - 18 + Math.sin(this.rentalFalconAngle) * 8
      this.rentalFalconGfx.setPosition(fx, fy)
      setDepthByFeet(this.rentalFalconGfx, playerFeet, 0.06)
    }
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
    if (skillId === 'peco_peco_ride') {
      this.tryPecoRideSkill(skillId, skillLevel, def)
      return
    }
    if (this.isAttacking || this.isJumping) return
    if (!this.spendMp(def.mpCost)) return

    const wallNow = Date.now()
    const durationMs = selfBuffDurationMs(def.selfBuff, skillLevel)
    this.activeBuffs = applySelfBuff(this.activeBuffs, {
      statusId: def.selfBuff.statusId,
      name: def.name,
      iconSkillId: skillId,
      skillLevel,
      now: wallNow,
      durationMs,
    })
    const seconds = Math.ceil(durationMs / 1000)
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    this.showSkillCallout(def.name)
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth: this.playerDisplay.container.depth + 0.1,
    })
    emitGameEvent('status', `${def.name} (Lv ${skillLevel}) — ${seconds}s`)
    logActivity('character', `${def.name} Lv ${skillLevel} (${seconds}s).`)
    this.emitPlayerBuffs()
    this.emitCharacterSheet()
  }

  private tryPecoRideSkill(skillId: string, skillLevel: number, def: SkillDefinition) {
    if (!def.selfBuff) return
    if (this.isAttacking || this.isJumping) return

    const wallNow = Date.now()
    if (hasStatus(this.activeBuffs, PECO_RIDE_STATUS_ID)) {
      this.activeBuffs = removeStatus(this.activeBuffs, PECO_RIDE_STATUS_ID)
      emitGameEvent('status', 'Dismounted.')
      logActivity('character', 'Dismounted from Peco Peco.')
      this.emitPlayerBuffs()
      this.emitCharacterSheet()
      return
    }

    if (!this.spendMp(def.mpCost)) return
    this.activeBuffs = applySelfBuff(this.activeBuffs, {
      statusId: def.selfBuff.statusId,
      name: def.name,
      iconSkillId: skillId,
      skillLevel,
      now: wallNow,
      expiresAt: Number.POSITIVE_INFINITY,
    })
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    this.showSkillCallout(def.name)
    playSkillCastFx(this, skillId, {
      playerX: px,
      playerY: py,
      facing: this.facing,
      depth: this.playerDisplay.container.depth + 0.1,
    })
    emitGameEvent('status', 'Riding Peco Peco.')
    logActivity('character', `${def.name} Lv ${skillLevel} — mounted.`)
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

  private standFromPlayDead() {
    if (!this.isPlayingDead) return
    this.isPlayingDead = false
    playPlayerAnim(this.playerDisplay, 'idle', this.facing)
    emitGameEvent('status', 'Stood up.')
    logActivity('character', 'Stopped playing dead.')
  }

  private breakRestState() {
    if (this.isSitting) this.standUp()
    if (this.isPlayingDead) this.standFromPlayDead()
  }

  private toggleSit() {
    if (this.isPlayerDead) return
    if (this.isSitting) {
      this.standUp()
      return
    }
    if (this.isPlayingDead) this.standFromPlayDead()
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

  private togglePlayDead() {
    if (this.isPlayerDead) return
    if (this.isPlayingDead) {
      this.standFromPlayDead()
      return
    }
    if (this.isSitting) this.standUp()
    if (this.isAttacking || this.isJumping) return
    this.chaseMob = null
    this.setSelectedMob(null)
    clearMoveTarget(this.moveTarget)
    this.stopPlayerMotion()
    this.isPlayingDead = true
    playPlayerAnim(this.playerDisplay, 'dead', this.facing)
    setPlayerDeadFrame(this.playerDisplay, 1)
    emitGameEvent('status', 'Playing dead — monsters will ignore you.')
    logActivity('character', 'Playing dead.')
  }

  private applyHpSpRegen(
    sheet: ReturnType<typeof toCharacterSheetPayload>,
    logPrefix: string,
    amounts: { hp: number; mp: number },
  ): boolean {
    if (this.session.hp >= sheet.hpMax && this.session.mp >= sheet.mpMax) return false

    const { hp, mp } = amounts
    const nextHp = Math.min(sheet.hpMax, this.session.hp + hp)
    const nextMp = Math.min(sheet.mpMax, this.session.mp + mp)
    if (nextHp === this.session.hp && nextMp === this.session.mp) return false

    this.session = { ...this.session, hp: nextHp, mp: nextMp }
    this.emitCharacterSheet()
    logActivity('character', `${logPrefix} HP ${nextHp}/${sheet.hpMax}, SP ${nextMp}/${sheet.mpMax}.`)
    return true
  }

  private tickSitRegen(now: number, sheet: ReturnType<typeof toCharacterSheetPayload>) {
    const interval = sitRegenIntervalMs()
    if (now - this.lastSitRegenAt < interval) return
    this.lastSitRegenAt = now
    this.applyHpSpRegen(sheet, 'Resting…', sitRegenAmounts(sheet.hpMax, sheet.mpMax))
  }

  /** In PVP, slow passive HP/SP recovery while standing idle (not sitting). */
  private tickPvpPassiveRegen(now: number, sheet: ReturnType<typeof toCharacterSheetPayload>) {
    if (!isPvpMap(this.character.map_id)) return
    if (this.chasePvpOpponent || this.chaseMob?.alive || this.chaseDuelOpponent) return
    const interval = pvpPassiveRegenIntervalMs()
    if (now - this.lastPvpPassiveRegenAt < interval) return
    this.lastPvpPassiveRegenAt = now
    this.applyHpSpRegen(
      sheet,
      'Recovering…',
      pvpPassiveRegenAmounts(sheet.hpMax, sheet.mpMax),
    )
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

  private applyDamageToMob(
    target: MobInstance,
    damage: number,
    def: (typeof MOB_DEFS)[string],
    skillLabel: string,
    options?: { critical?: boolean; criticalMagic?: boolean },
  ) {
    const critical = options?.critical === true
    const criticalMagic = options?.criticalMagic === true
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
    const floatVariant = critical
      ? criticalMagic
        ? 'critMagic'
        : 'critPhysical'
      : 'hit'
    showDamageFloat(this, target.sprite.x, target.sprite.y - 40, damage, floatVariant)
    const critNote = critical ? ' (critical)' : ''
    logActivity(
      'combat',
      `${skillLabel} dealt ${damage} damage${critNote} to Lv ${target.level} ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHp}).`,
    )
    this.updateMobHpBar(target)
    if (this.selectedMob === target) {
      this.emitSelectedMobPayload(target)
    }
    this.broadcastMobHit(target, damage, skillLabel, critical, criticalMagic)
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

  private isRemotePlayerDead(characterId: string): boolean {
    if (this.pvpDeadRemoteIds.has(characterId)) return true
    const entity = this.remotePlayers.get(characterId)
    return entity?.lastPayload.anim === 'dead'
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

  private findAttackableRemotePlayerAt(wx: number, wy: number): RemotePlayerEntity | null {
    if (!this.isPvpActive()) return null
    const entity = this.findRemotePlayerAt(wx, wy)
    if (!entity || !this.canAttackPlayer(entity.lastPayload.characterId)) return null
    return entity
  }

  private stopPvpChase() {
    this.chasePvpOpponent = null
    this.chasePvpForSkillOnly = false
    this.queuedPvpSkillCast = null
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
    if (!enduring) this.breakRestState()
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
    if (!enduring) this.breakRestState()
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
      const mob = this.createMobInstance(spawnIndex, spawn.x, spawn.y, def, undefined, spawn)
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
    logActivity('combat', `Obtained ${label}.`, rolled.id)
    emitGameEvent('sessionSync', sessionSyncPayload(structuredClone(this.session)))
    this.scheduleProgressSave()
  }

  private createMobInstance(
    spawnIndex: number,
    x: number,
    y: number,
    def: (typeof MOB_DEFS)[string],
    visual?: { labelPrefix?: string; scale?: number; barWidth?: number; labelColor?: string },
    spawnMeta?: (typeof MOB_SPAWNS_BY_MAP)[string][number],
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
      respawnMs: spawnMeta?.respawnMs ?? MOB_RESPAWN_MS,
      canLure: spawnMeta?.canLure ?? true,
      lureRadius: spawnMeta?.lureRadius ?? def.roamRadius * 2.5,
      spotCenterX: spawnMeta?.spotCenterX ?? x,
      spotCenterY: spawnMeta?.spotCenterY ?? feetY,
      spotRect: spawnMeta?.spotRect ?? null,
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

  private broadcastMobHit(
    target: MobInstance,
    damage: number,
    skillLabel: string,
    critical?: boolean,
    criticalMagic?: boolean,
  ) {
    this.presence?.sendCombat({
      kind: 'mob_hit',
      characterId: this.character.id,
      spawnIndex: target.spawnIndex,
      damage,
      hpAfter: Math.max(0, target.hp),
      skillLabel,
      critical: critical ? true : undefined,
      criticalMagic: critical && criticalMagic ? true : undefined,
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
      const remoteCrit = payload.critical === true
      const remoteVariant = remoteCrit
        ? payload.criticalMagic
          ? 'critMagic'
          : 'critPhysical'
        : 'hit'
      showDamageFloat(this, mob.sprite.x, mob.sprite.y - 40, payload.damage, remoteVariant)
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
      return
    }

    if (payload.kind === 'player_miss') {
      const target = this.remotePlayers.get(payload.targetCharacterId)
      const x = target?.display.container.x ?? payload.x
      const y = (target?.display.container.y ?? payload.y) - 40
      showFloatingText(this, x, y, 'MISS', 'miss')
      this.sfx.playMissNearby(listener.x, listener.y, x, y)
      return
    }

    if (payload.kind === 'player_hit') {
      const targetEntity = this.remotePlayers.get(payload.targetCharacterId)
      const tx = targetEntity?.display.container.x ?? listener.x
      const ty = (targetEntity?.display.container.y ?? listener.y) - 40
      const remoteCrit = payload.critical === true
      const pvpFloat = this.isPvpActive()
        ? remoteCrit
          ? 'bloodCrit'
          : 'blood'
        : remoteCrit
          ? 'critPhysical'
          : 'hit'
      showDamageFloat(this, tx, ty, payload.damage, pvpFloat)
      this.sfx.playHitNearby(listener.x, listener.y, tx, ty)
      if (payload.targetCharacterId === this.character.id && this.isPvpActive()) {
        this.applyIncomingPvpDamage(payload.damage, payload.characterId)
      }
      return
    }

    if (payload.kind === 'player_die') {
      this.pvpDeadRemoteIds.add(payload.characterId)
      if (this.chasePvpOpponent?.lastPayload.characterId === payload.characterId) {
        this.chasePvpOpponent = null
        this.chasePvpForSkillOnly = false
        this.queuedPvpSkillCast = null
      }
      const entity = this.remotePlayers.get(payload.characterId)
      if (entity) {
        entity.lastPayload = { ...entity.lastPayload, anim: 'dead' }
        playPlayerDeath(this, entity.display, entity.lastPayload.facing)
      }
      if (payload.characterId !== this.character.id) {
        const dropId = `skull_${payload.characterId}_${Math.round(payload.x)}_${Math.round(payload.y)}`
        this.mapDropManager?.spawnDrop(dropId, 'skull', payload.x, payload.y)
      }
      if (payload.killerCharacterId === this.character.id) {
        const victimName = entity?.lastPayload.name ?? 'Unknown'
        const streak = this.pvpKillStreak.onLocalKill()
        this.broadcastPvpAnnounce(streak, this.character.name, victimName)
      }
      return
    }

    if (payload.kind === 'map_drop') {
      this.mapDropManager?.spawnDrop(payload.dropId, payload.itemId, payload.x, payload.y)
      return
    }

    if (payload.kind === 'map_pickup') {
      this.mapDropManager?.removeDrop(payload.dropId)
      return
    }

    if (payload.kind === 'pvp_announce') {
      if (payload.streak === 'first_blood') {
        this.pvpKillStreak.noteFirstBloodTaken()
      }
      this.showPvpKillAnnounce(payload)
      return
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

  private isDuelCombatAllowed(): boolean {
    return isDuelCombatPhase(this.duelSync)
  }

  private isPvpActive(): boolean {
    return isPvpMap(this.character.map_id)
  }

  private canAttackPlayer(targetCharacterId: string): boolean {
    if (this.isPlayerDead) return false
    if (targetCharacterId === this.character.id) return false
    if (this.partySync.memberCharacterIds.includes(targetCharacterId)) return false
    if (this.isRemotePlayerDead(targetCharacterId)) return false
    return true
  }

  private getRemotePvpSnapshot(entity: RemotePlayerEntity): DuelCombatSnapshot | null {
    return entity.lastPayload.pvpSnapshot ?? null
  }

  private getPvpStrikeTarget(): RemotePlayerEntity | null {
    if (!this.isPvpActive()) return null
    const chase =
      this.chasePvpOpponent && this.canAttackPlayer(this.chasePvpOpponent.lastPayload.characterId)
        ? this.chasePvpOpponent
        : null
    if (!chase) return null
    if (this.duelOpponentInStrikeRange(chase)) return chase
    return chase
  }

  private beginChasePvpOpponent(entity: RemotePlayerEntity) {
    if (!this.canAttackPlayer(entity.lastPayload.characterId)) return
    this.chasePvpForSkillOnly = false
    this.chasePvpOpponent = entity
    this.chaseDuelOpponent = null
    this.chaseMob = null
    this.setSelectedMob(null)
    this.lastChaseRepathAt = 0
    const cx = entity.display.container.x
    const cy = entity.display.container.y
    this.chasePathGoalX = cx
    this.chasePathGoalY = cy
    this.requestWalkTo(cx, cy)
    this.faceToward(cx, cy)
  }

  private tickChasePvpOpponent(now: number) {
    const remote = this.chasePvpOpponent
    if (!remote || !this.playerDisplay) return
    if (!this.isPvpActive() || !this.canAttackPlayer(remote.lastPayload.characterId)) {
      this.chasePvpOpponent = null
      return
    }

    const mx = remote.display.container.x
    const my = remote.display.container.y
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const dist = Phaser.Math.Distance.Between(px, py, mx, my)
    const inAttackRange = this.duelOpponentInStrikeRange(remote)

    const queued = this.queuedPvpSkillCast
    if (queued) {
      if (queued.remote !== remote) {
        this.queuedPvpSkillCast = null
        if (this.chasePvpForSkillOnly) {
          this.chasePvpOpponent = null
          this.chasePvpForSkillOnly = false
        }
        return
      }
      const skillRange = this.skillRangePx(queued.def)
      if (dist <= skillRange && this.duelOpponentInStrikeRange(remote, skillRange)) {
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.faceToward(mx, my)
        const cast = this.queuedPvpSkillCast
        this.queuedPvpSkillCast = null
        if (cast) {
          this.executePlayerSkillOnRemotePlayer(cast.skillId, cast.level, cast.def, cast.remote)
        }
        this.chasePvpOpponent = null
        this.chasePvpForSkillOnly = false
        return
      }
    } else if (inAttackRange && !this.chasePvpForSkillOnly) {
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
      this.faceToward(mx, my)
      this.tryBasicAttack()
      return
    }

    const mobShift = Math.hypot(mx - this.chasePathGoalX, my - this.chasePathGoalY)
    const outOfStrikeRange = queued
      ? dist > this.skillRangePx(queued.def)
      : !inAttackRange
    const needRepath =
      now - this.lastChaseRepathAt >= 350 ||
      mobShift >= 48 ||
      (!this.moveTarget.active && outOfStrikeRange)

    if (needRepath) {
      this.chasePathGoalX = mx
      this.chasePathGoalY = my
      this.requestWalkTo(mx, my)
      this.lastChaseRepathAt = now
    }
  }

  private broadcastPvpAnnounce(
    streak: import('../world/pvpConfig').PvpKillStreakKind | null,
    killerName: string,
    victimName: string,
  ) {
    const announceId = Date.now()
    const payload = {
      kind: 'pvp_announce' as const,
      announceId,
      streak,
      killerCharacterId: this.character.id,
      killerName,
      victimName,
    }
    this.presence?.sendCombat(payload)
    this.showPvpKillAnnounce(payload)
  }

  private showPvpKillAnnounce(payload: {
    announceId: number
    streak: import('../world/pvpConfig').PvpKillStreakKind | null
    killerCharacterId: string
    killerName: string
    victimName: string
  }) {
    emitGameEvent('pvpAnnounce', payload)
    this.sfx.playKillStreak(payload.streak)
    const streakLabel = payload.streak ? PVP_KILL_STREAK_LABELS[payload.streak] : null
    logActivity(
      'combat',
      streakLabel
        ? `${streakLabel} ${payload.killerName} defeated ${payload.victimName}.`
        : `${payload.killerName} defeated ${payload.victimName}.`,
    )
  }

  private broadcastPlayerDeath(killerCharacterId: string | null, x: number, y: number) {
    this.presence?.sendCombat({
      kind: 'player_die',
      characterId: this.character.id,
      killerCharacterId: killerCharacterId ?? undefined,
      x,
      y,
    })
  }

  private broadcastSkullDrop(x: number, y: number) {
    const dropId = `skull_${this.character.id}_${Date.now()}`
    this.presence?.sendCombat({
      kind: 'map_drop',
      dropId,
      itemId: 'skull',
      x,
      y,
      fromCharacterId: this.character.id,
    })
    this.mapDropManager?.spawnDrop(dropId, 'skull', x, y)
  }

  private handlePvpDeathFromDamage(killerCharacterId: string) {
    const x = this.playerDisplay.container.x
    const y = this.playerDisplay.container.y
    this.broadcastPlayerDeath(killerCharacterId, x, y)
    this.broadcastSkullDrop(x, y)
    this.chasePvpOpponent = null
    this.chasePvpForSkillOnly = false
    this.queuedPvpSkillCast = null
    this.isAttacking = false
    this.enterPlayerDeath()
  }

  private applyIncomingPvpDamage(damage: number, fromCharacterId: string) {
    if (!this.isPvpActive() || !this.canAttackPlayer(fromCharacterId)) return
    if (this.session.hp <= 0) return
    const enduring = hasStatus(this.activeBuffs, 'endure')
    if (!enduring) this.breakRestState()
    if (damage <= 0) return

    this.session = { ...this.session, hp: Math.max(0, this.session.hp - damage) }
    showFloatingText(
      this,
      this.playerDisplay.container.x,
      this.playerDisplay.container.y - 36,
      `-${damage}`,
      'mobHitPlayer',
    )
    flashPlayerHit(this, this.playerDisplay)
    if (this.session.hp > 0 && !enduring) {
      this.isAttacking = false
      const entity = this.remotePlayers.get(fromCharacterId)
      if (entity) {
        playPlayerFlinch(
          this,
          this.playerDisplay,
          this.facing,
          this.playerDisplay.container.x - entity.display.container.x,
          this.playerDisplay.container.y - entity.display.container.y,
        )
      }
    }
    this.sfx.playHit()
    logActivity('combat', `Took ${damage} damage in PVP.`)
    if (this.session.hp <= 0) {
      this.handlePvpDeathFromDamage(fromCharacterId)
    } else {
      this.emitCharacterSheet()
    }
  }

  private getDuelOpponentSnapshot(): DuelCombatSnapshot | null {
    return this.duelSync?.opponentSnapshot ?? null
  }

  private duelOpponentInStrikeRange(
    entity: RemotePlayerEntity,
    rangePx?: number,
  ): boolean {
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const tx = entity.display.container.x
    const ty = entity.display.container.y
    const range = rangePx ?? getPlayerAttackRangePx(this.session.equipment)
    if (Phaser.Math.Distance.Between(px, py, tx, ty) > range) return false
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    if (usesTargetedAttack(weaponClass)) return true
    const dx = tx - px
    const dy = ty - py
    return isInFacingCone(this.facing, dx, dy)
  }

  private getDuelStrikeTarget(): RemotePlayerEntity | null {
    if (!this.isDuelCombatAllowed() || !this.duelSync) return null
    const opponentId = this.duelSync.opponentCharacterId
    const chase =
      this.chaseDuelOpponent?.lastPayload.characterId === opponentId ? this.chaseDuelOpponent : null
    const selected =
      this.selectedRemoteId === opponentId ? this.remotePlayers.get(opponentId) ?? null : null
    const candidate = chase ?? selected ?? this.remotePlayers.get(opponentId) ?? null
    if (!candidate) return null
    if (this.duelOpponentInStrikeRange(candidate)) return candidate
    if (chase || selected) return candidate
    return null
  }

  private beginChaseDuelOpponent(entity: RemotePlayerEntity) {
    this.chaseDuelOpponent = entity
    this.chaseMob = null
    this.setSelectedMob(null)
    this.lastChaseRepathAt = 0
    const cx = entity.display.container.x
    const cy = entity.display.container.y
    this.chasePathGoalX = cx
    this.chasePathGoalY = cy
    this.requestWalkTo(cx, cy)
    this.faceToward(cx, cy)
  }

  private tickChaseDuelOpponent(now: number) {
    const remote = this.chaseDuelOpponent
    if (!remote || !this.playerDisplay) return
    if (!this.isDuelCombatAllowed()) {
      this.chaseDuelOpponent = null
      return
    }

    const mx = remote.display.container.x
    const my = remote.display.container.y
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const dist = Phaser.Math.Distance.Between(px, py, mx, my)
    const inAttackRange = this.duelOpponentInStrikeRange(remote)

    const queued = this.queuedDuelSkillCast
    if (queued) {
      if (queued.remote !== remote) {
        this.queuedDuelSkillCast = null
        return
      }
      const skillRange = this.skillRangePx(queued.def)
      if (dist <= skillRange && this.duelOpponentInStrikeRange(remote, skillRange)) {
        clearMoveTarget(this.moveTarget)
        this.stopPlayerMotion()
        this.faceToward(mx, my)
        const cast = this.queuedDuelSkillCast
        this.queuedDuelSkillCast = null
        if (cast) {
          this.executePlayerSkillOnDuelOpponent(cast.skillId, cast.level, cast.def, cast.remote)
        }
        return
      }
    } else if (inAttackRange) {
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
      this.faceToward(mx, my)
      this.tryBasicAttack()
      return
    }

    const mobShift = Math.hypot(mx - this.chasePathGoalX, my - this.chasePathGoalY)
    const outOfStrikeRange = queued
      ? dist > this.skillRangePx(queued.def)
      : !inAttackRange
    const needRepath =
      now - this.lastChaseRepathAt >= 350 ||
      mobShift >= 48 ||
      (!this.moveTarget.active && outOfStrikeRange)

    if (needRepath) {
      this.chasePathGoalX = mx
      this.chasePathGoalY = my
      this.requestWalkTo(mx, my)
      this.lastChaseRepathAt = now
    }
  }

  private broadcastPlayerHit(
    targetCharacterId: string,
    damage: number,
    skillLabel: string,
    critical?: boolean,
  ) {
    this.presence?.sendCombat({
      kind: 'player_hit',
      characterId: this.character.id,
      targetCharacterId,
      damage,
      skillLabel,
      critical: critical ? true : undefined,
    })
  }

  private broadcastPlayerMiss(targetCharacterId: string, x: number, y: number) {
    this.presence?.sendCombat({
      kind: 'player_miss',
      characterId: this.character.id,
      targetCharacterId,
      x,
      y,
    })
  }

  private restoreVitalsAfterDuel() {
    const sheet = toCharacterSheetPayload(this.session)
    this.session = { ...this.session, hp: sheet.hpMax, mp: sheet.mpMax }
    this.emitCharacterSheet()
  }

  private endDuelAsLoser() {
    if (!this.duelSync) return
    emitGameEvent('duelCompleteRequest', {
      duelSessionId: this.duelSync.duelSessionId,
      winnerCharacterId: this.duelSync.opponentCharacterId,
    })
    this.chaseDuelOpponent = null
    this.queuedDuelSkillCast = null
    this.isAttacking = false
    this.restoreVitalsAfterDuel()
    logActivity('combat', 'You were defeated in the duel.')
    emitGameEvent('status', 'Duel lost.')
  }

  private pvpDamageFloatVariant(critical: boolean): DamageFloatVariant {
    return critical ? 'bloodCrit' : 'blood'
  }

  private strikePvpOpponent(
    target: RemotePlayerEntity,
    snapshot: DuelCombatSnapshot,
    skillLabel: string,
    skillId?: string,
    skillLevel?: number,
  ) {
    const tx = target.display.container.x
    const ty = target.display.container.y - 40
    let result = calcPlayerVsPlayerDamage(this.session, snapshot)
    if (skillId && skillLevel != null) {
      result = calcPlayerSkillVsMobDamage(result, skillId, skillLevel)
    }
    const { damage, hit, critical } = result
    if (!hit || damage <= 0) {
      showFloatingText(this, tx, ty, 'MISS', 'miss')
      this.sfx.playMiss()
      this.broadcastPlayerMiss(target.lastPayload.characterId, tx, ty)
      logActivity('combat', `${skillLabel} missed ${target.lastPayload.name} in PVP.`)
      return
    }
    showDamageFloat(this, tx, ty, damage, this.pvpDamageFloatVariant(critical))
    this.sfx.playHit()
    this.broadcastPlayerHit(target.lastPayload.characterId, damage, skillLabel, critical)
    logActivity('combat', `${skillLabel} hit ${target.lastPayload.name} for ${damage} in PVP.`)
  }

  private strikeDuelOpponent(
    target: RemotePlayerEntity,
    _snapshot: DuelCombatSnapshot,
    skillLabel: string,
    skillId?: string,
    skillLevel?: number,
  ) {
    const tx = target.display.container.x
    const ty = target.display.container.y
    if (!this.duelSync) return

    void duelAttack({
      action: 'attack',
      characterId: this.character.id,
      duelSessionId: this.duelSync.duelSessionId,
      targetCharacterId: target.lastPayload.characterId,
      skillId,
      skillLevel,
    })
      .then((res) => {
        if (!res.hit || res.damage <= 0) {
          showFloatingText(this, tx, ty - 40, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastPlayerMiss(target.lastPayload.characterId, tx, ty - 40)
          logActivity('combat', `${skillLabel} missed ${target.lastPayload.name} in a duel.`)
          return
        }
        const critical = res.critical === true
        showDamageFloat(this, tx, ty - 40, res.damage, critical ? 'critPhysical' : 'hit')
        this.sfx.playHit()
        this.broadcastPlayerHit(target.lastPayload.characterId, res.damage, skillLabel, critical)
        logActivity('combat', `${skillLabel} hit ${target.lastPayload.name} for ${res.damage} in a duel.`)
        if (res.duel?.state === 'completed' && res.duel.winner_character_id === this.character.id) {
          emitGameEvent('status', 'Duel won!')
        }
      })
      .catch(() => {
        emitGameEvent('status', 'Duel attack failed.')
      })
  }

  private tryBasicAttack() {
    if (this.isPlayerDead || this.isSitting || this.isPlayingDead) return
    if (this.isPvpActive() && this.chasePvpOpponent) {
      const id = this.chasePvpOpponent.lastPayload.characterId
      if (this.isRemotePlayerDead(id)) {
        this.chasePvpOpponent = null
        return
      }
    }
    const now = this.time.now
    if (now - this.lastAttackAt < this.playerAttackCooldownMs() || this.isAttacking || this.isJumping) return
    const duelSnapshot = this.getDuelOpponentSnapshot()
    const duelMode =
      this.isDuelCombatAllowed() &&
      Boolean(duelSnapshot) &&
      Boolean(this.duelSync) &&
      (Boolean(this.chaseDuelOpponent) ||
        this.selectedRemoteId === this.duelSync!.opponentCharacterId ||
        Boolean(this.getDuelStrikeTarget()))
    const pvpTarget = this.getPvpStrikeTarget()
    const pvpSnapshot = pvpTarget ? this.getRemotePvpSnapshot(pvpTarget) : null
    const pvpMode =
      this.isPvpActive() &&
      Boolean(this.chasePvpOpponent) &&
      Boolean(pvpSnapshot) &&
      Boolean(pvpTarget)
    if (!duelMode && !pvpMode && this.hasFocusedMobTarget() && !this.resolveAttackTargetMob()) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.stopPlayerMotion()
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    this.broadcastPlayerAction('basic_attack')
    const weaponClass = getEquippedWeaponClass(this.session.equipment)
    const duelPre = this.getDuelStrikeTarget()
    const pvpPre = pvpMode ? this.getPvpStrikeTarget() : null
    const preTarget = this.chaseMob ?? this.selectedMob
    if (duelPre) {
      this.faceToward(duelPre.display.container.x, duelPre.display.container.y)
    } else if (pvpPre) {
      this.faceToward(pvpPre.display.container.x, pvpPre.display.container.y)
    } else if (preTarget?.alive) {
      this.faceToward(preTarget.sprite.x, preTarget.sprite.y)
    }
    const rangedBasic = weaponClass === 'bow' || weaponClass === 'staff'
    startPlayerAttackAnim(this, this.playerDisplay, this.facing, {
      variant: 'basic',
      attackStyle: attackStyleForWeapon(weaponClass),
      getAimTarget: rangedBasic
        ? () => {
            const duel = this.getDuelStrikeTarget()
            if (duel) {
              return toCombatAimPoint(duel.display.container.x, duel.display.container.y)
            }
            const pvp = pvpMode ? this.getPvpStrikeTarget() : null
            if (pvp) {
              return toCombatAimPoint(pvp.display.container.x, pvp.display.container.y)
            }
            const mob = this.resolveAttackTargetMob()
            if (mob) return toCombatAimPoint(mob.sprite.x, mob.sprite.y)
            return null
          }
        : undefined,
      onStrike: () => {
        if (duelMode && duelSnapshot) {
          const target = this.getDuelStrikeTarget()
          if (!target || !this.duelOpponentInStrikeRange(target)) {
            const pos = missTextPosition(
              this.playerDisplay.container.x,
              this.playerDisplay.container.y,
              this.facing,
            )
            showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
            this.sfx.playMiss()
            if (this.duelSync) {
              this.broadcastPlayerMiss(this.duelSync.opponentCharacterId, pos.x, pos.y)
            }
            logActivity('combat', 'Attack missed.')
            return
          }
          this.strikeDuelOpponent(target, duelSnapshot, 'Attack')
          return
        }

        if (pvpMode && pvpSnapshot) {
          const target = this.getPvpStrikeTarget()
          const snap = target ? this.getRemotePvpSnapshot(target) : null
          if (!target || !snap || !this.duelOpponentInStrikeRange(target)) {
            const pos = missTextPosition(
              this.playerDisplay.container.x,
              this.playerDisplay.container.y,
              this.facing,
            )
            showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
            this.sfx.playMiss()
            if (target) {
              this.broadcastPlayerMiss(target.lastPayload.characterId, pos.x, pos.y)
            }
            logActivity('combat', 'Attack missed.')
            return
          }
          this.strikePvpOpponent(target, snap, 'Attack')
          return
        }

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
        const { damage, hit, critical } = this.calcPlayerVsMobDamageForSession(def)
        if (!hit || damage <= 0) {
          showFloatingText(this, target.sprite.x, target.sprite.y - 40, 'MISS', 'miss')
          this.sfx.playMiss()
          this.broadcastMobMissAt(target.spawnIndex, target.sprite.x, target.sprite.y - 40)
          logActivity('combat', `Attack missed Lv ${target.level} ${target.name}.`)
          return
        }

        this.applyDamageToMob(target, damage, def, 'Attack', { critical })
      },
      onComplete: () => {
        this.isAttacking = false
      },
    })
  }

  private hasFocusedMobTarget(): boolean {
    return Boolean(this.chaseMob?.alive || this.selectedMob?.alive)
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
      rangeCells: getPlayerAttackRangeCells(this.session.equipment),
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
    const useServerFieldRewards = def && !this.dungeonBoot && !isDungeonMapId(this.character.map_id)
    if (useServerFieldRewards) {
      void this.grantFieldMobKillFromServer(mob, def)
      logActivity('combat', `Defeated Lv ${mob.level} ${mob.name}.`)
    } else if (def) {
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
          logActivity('combat', `Obtained ${getItemDisplayName(itemId)}.`, itemId)
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

  private setMobPhysicsEnabled(mob: MobInstance, enabled: boolean) {
    const sprite = mob.sprite
    if (!sprite.scene) return
    if (enabled) {
      if (!sprite.body) {
        this.physics.world.enable(sprite)
      } else {
        sprite.body.enable = true
      }
      return
    }
    sprite.setVelocity(0, 0)
    if (sprite.body) {
      sprite.body.enable = false
    }
  }

  /** Hide mob and respawn locally; no loot/EXP (remote observers). */
  private killMobVisualOnly(mob: MobInstance, broadcastRespawn = false) {
    if (!mob.alive) return
    if (!mob.sprite.scene) {
      mob.alive = false
      return
    }
    const def = MOB_DEFS[mob.defId]

    mob.alive = false
    mob.state = 'wander'
    this.setMobPhysicsEnabled(mob, false)
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

    this.time.delayedCall(mob.respawnMs, () => {
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
    this.setMobPhysicsEnabled(mob, true)
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

  private grantFieldMobKillFromServer(mob: MobInstance, _def: (typeof MOB_DEFS)[string]) {
    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    combatReport({
      characterId: this.character.id,
      mapId: this.character.map_id,
      spawnIndex: mob.spawnIndex,
      mobDefId: mob.defId,
      x: px,
      y: py,
    })
      .then((result) => {
        if (result.zeny > 0) {
          logActivity('combat', `Obtained ${result.zeny.toLocaleString()} zeny.`)
          emitGameEvent('characterZenySync', { zeny: result.zenyTotal })
        }
        if (result.itemIds.length > 0) {
          this.session = {
            ...this.session,
            sessionInventory: addItemsToSessionInventory(
              this.session.sessionInventory,
              result.itemIds,
            ),
          }
          for (const itemId of result.itemIds) {
            logActivity('combat', `Obtained ${getItemDisplayName(itemId)}.`, itemId)
          }
        }
        const beforeBase = this.session.progress.baseLevel
        const beforeJob = this.session.progress.jobLevel
        let baseGained = 0
        let jobGained = 0
        updateCharacterSession((s) => {
          const progress = progressFromLevels(
            result.progress.baseLevel,
            result.progress.baseExp,
            result.progress.jobLevel,
            result.progress.jobExp,
            s.jobId,
          )
          const applied = applyServerProgressUpdate(
            {
              ...s,
              sessionInventory: Array.isArray(result.sessionInventory)
                ? parseSessionInventory(result.sessionInventory)
                : s.sessionInventory,
            },
            progress,
          )
          baseGained = applied.baseGained
          jobGained = applied.jobGained
          return applied.state
        })
        logActivity('exp', `Gained ${result.baseExp} Base EXP and ${result.jobExp} Job EXP.`)
        this.enqueueLevelUps(baseGained, jobGained, beforeBase, beforeJob)
        this.emitCharacterSheet()
      })
      .catch((err) => {
        console.warn('combat-report failed', err)
        emitGameEvent('status', 'Could not claim mob rewards (server).')
      })
  }

  private logLevelUpStatus(kind: 'base' | 'job', level: number) {
    if (kind === 'base') {
      emitGameEvent('status', `Base level up! Lv ${level}`)
      logActivity('level', `Base level up! Now Lv ${level}.`)
    } else {
      emitGameEvent('status', `Job level up! Job ${level}`)
      logActivity('level', `Job level up! Now Job Lv ${level}.`)
    }
  }

  private enqueueLevelUps(baseGained: number, jobGained: number, beforeBase: number, beforeJob: number) {
    if (baseGained <= 0 && jobGained <= 0) return
    this.levelUpQueue.push(...buildLevelUpSteps(baseGained, jobGained, beforeBase, beforeJob))
    this.drainLevelUpQueue()
  }

  private drainLevelUpQueue() {
    if (this.levelUpDrainActive || this.levelUpQueue.length === 0) return
    this.levelUpDrainActive = true

    const step = () => {
      const next = this.levelUpQueue.shift()
      if (!next) {
        this.levelUpDrainActive = false
        return
      }
      const x = this.playerDisplay.container.x
      const y = this.playerDisplay.container.y
      playLevelUpWorldFx(this, x, y, next.kind, next.level, this.playerDisplay)
      playLevelUpAudio(next.kind)
      this.logLevelUpStatus(next.kind, next.level)

      if (this.levelUpQueue.length > 0) {
        this.time.delayedCall(WorldScene.LEVEL_UP_STEP_MS, step)
      } else {
        this.levelUpDrainActive = false
      }
    }

    step()
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
    let baseGained = 0
    let jobGained = 0
    updateCharacterSession((s) => {
      const r = applyProgressAfterExp(s, shareBase, shareJob)
      baseGained = r.baseLeveled
      jobGained = r.jobLeveled
      return r.state
    })
    logActivity('exp', `Gained ${shareBase} Base EXP and ${shareJob} Job EXP.`)
    this.enqueueLevelUps(baseGained, jobGained, beforeBase, beforeJob)
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
    let baseGained = 0
    let jobGained = 0
    updateCharacterSession((s) => {
      const r = applyProgressAfterExp(s, payload.baseExp, payload.jobExp)
      baseGained = r.baseLeveled
      jobGained = r.jobLeveled
      return r.state
    })
    logActivity('exp', `Party share: ${payload.baseExp} Base / ${payload.jobExp} Job EXP.`)
    this.enqueueLevelUps(baseGained, jobGained, beforeBase, beforeJob)
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

  private worldPersistBaseline(): CharacterWorldPosition {
    if (this.lastPersistedWorld) return this.lastPersistedWorld
    return {
      x: this.character.x,
      y: this.character.y,
      mapId: this.character.map_id,
    }
  }

  private async persistWorldState() {
    if (this.worldPersistDisabled || !this.sys.isActive()) return
    const world = this.getPlayerPosition()
    try {
      await saveCharacterWorldPosition(this.character.id, world, this.worldPersistBaseline())
      if (this.worldPersistDisabled || !this.sys.isActive()) return
      const normalized = normalizeCharacterWorldPosition(world)
      this.lastPersistedWorld = normalized
      this.character.x = normalized.x
      this.character.y = normalized.y
      this.character.map_id = normalized.mapId
    } catch (err) {
      console.warn('World position save failed', err)
    }
  }

  getNearestNpc() {
    return this.nearestNpc
  }

  private shouldAbortAutoAttack(): boolean {
    return (
      this.isPlayerDead ||
      this.vendingOpen ||
      isPvpMap(this.character.map_id) ||
      Boolean(this.duelSync && isDuelCombatPhase(this.duelSync))
    )
  }

  private disableAutoAttackFromManualInput() {
    if (!this.autoAttackConfig.enabled) return
    emitGameEvent('autoAttackDisable', {})
    this.teardownAutoAttackRuntime()
  }

  private applyAutoAttackSync(payload: AutoAttackConfig) {
    const prev = this.autoAttackConfig.enabled
    this.autoAttackConfig = normalizeAutoAttackConfig(payload)
    if (this.autoAttackConfig.enabled && !prev && this.playerDisplay) {
      this.autoAttackAnchorX = this.playerDisplay.container.x
      this.autoAttackAnchorY = this.playerDisplay.container.y
      this.autoAttackRotationIndex = 0
      this.lastAutoRotationAt = 0
    }
    if (!this.autoAttackConfig.enabled) {
      this.teardownAutoAttackRuntime()
    } else if (!autoAttackRotationHasSit(this.autoAttackConfig) && this.autoSitForRegen) {
      this.autoSitForRegen = false
      if (this.isSitting) this.standUp()
    }
    this.refreshAutoPatrolCircle()
    if (this.autoAttackConfig.enabled && this.shouldAbortAutoAttack()) {
      emitGameEvent('autoAttackDisable', {})
    }
  }

  private teardownAutoAttackRuntime() {
    if (this.autoSitForRegen && this.isSitting) {
      this.autoSitForRegen = false
      this.standUp()
    }
    if (this.autoAttackChaseActive) {
      this.autoAttackChaseActive = false
      this.chaseMob = null
      this.chaseMobForSkillOnly = false
      this.queuedSkillCast = null
      clearMoveTarget(this.moveTarget)
      this.stopPlayerMotion()
    }
    this.autoPatrolCircle?.setVisible(false)
  }

  private ensureAutoPatrolCircle() {
    if (this.autoPatrolCircle) return
    if (!this.sys.isActive() || !this.add) return
    this.autoPatrolCircle = this.add
      .circle(0, 0, 100, 0x3b82f6, 0.1)
      .setStrokeStyle(2, 0x60a5fa, 0.55)
      .setDepth(0.5)
      .setVisible(false)
  }

  private refreshAutoPatrolCircle() {
    this.ensureAutoPatrolCircle()
    const circle = this.autoPatrolCircle
    if (!circle) return
    if (
      !this.autoAttackConfig.enabled ||
      this.autoAttackConfig.movementMode !== 'patrol_range' ||
      !this.playerDisplay
    ) {
      circle.setVisible(false)
      return
    }
    circle.setPosition(this.autoAttackAnchorX, this.autoAttackAnchorY)
    circle.setRadius(this.autoAttackConfig.patrolRadiusPx)
    circle.setVisible(true)
  }

  private autoAttackMobCandidates(): AutoAttackMobCandidate[] {
    return this.mobs.map((mob) => ({
      defId: mob.defId,
      spawnIndex: mob.spawnIndex,
      alive: mob.alive,
      x: mob.sprite.x,
      y: mob.sprite.y,
    }))
  }

  private mobFromCandidate(candidate: AutoAttackMobCandidate): MobInstance | null {
    const mob = this.mobBySpawnIndex[candidate.spawnIndex]
    return mob?.alive ? mob : null
  }

  private skillRangeForSkillId(skillId: string): number {
    const def = SKILLS[skillId]
    if (!def) return getPlayerAttackRangePx(this.session.equipment)
    return this.skillRangePx(def)
  }

  private currentRotationSkillId(): string | null {
    const rot = this.autoAttackConfig.rotation
    for (let i = 0; i < rot.length; i++) {
      const idx = (this.autoAttackRotationIndex + i) % rot.length
      const id = rot[idx]
      if (id && id !== 'sit') return id
    }
    return null
  }

  private advanceAutoRotation() {
    const rot = this.autoAttackConfig.rotation
    if (rot.length === 0) return
    let idx = this.autoAttackRotationIndex
    for (let step = 0; step < rot.length; step++) {
      idx = (idx + 1) % rot.length
      const id = rot[idx]
      if (id && id !== 'sit') {
        this.autoAttackRotationIndex = idx
        return
      }
    }
  }

  private tickAutoAttackWhileSitting(sheet: ReturnType<typeof toCharacterSheetPayload>) {
    if (!shouldStandFromAutoSit(sheet.mp, sheet.mpMax)) return
    this.autoSitForRegen = false
    this.standUp()
  }

  private tickAutoAttack(now: number, sheet: ReturnType<typeof toCharacterSheetPayload>) {
    if (this.shouldAbortAutoAttack()) {
      emitGameEvent('autoAttackDisable', {})
      return
    }
    if (!this.playerDisplay) return

    this.refreshAutoPatrolCircle()

    const hpPct = sheet.hpMax > 0 ? (sheet.hp / sheet.hpMax) * 100 : 100
    const spPct = sheet.mpMax > 0 ? (sheet.mp / sheet.mpMax) * 100 : 100

    if (
      autoAttackRotationHasSit(this.autoAttackConfig) &&
      spPct <= this.autoAttackConfig.sitSpPercent &&
      sheet.mp < sheet.mpMax &&
      !this.isPlayingDead
    ) {
      if (!this.isSitting) {
        this.autoSitForRegen = true
        this.toggleSit()
      }
      return
    }

    if (this.autoAttackConfig.redPotionEnabled && hpPct <= this.autoAttackConfig.redPotionHpPercent) {
      if (this.tryUseConsumableItemId('red_potion')) return
    }
    if (
      !this.isSitting &&
      this.autoAttackConfig.bluePotionEnabled &&
      spPct <= this.autoAttackConfig.bluePotionSpPercent &&
      spPct > this.autoAttackConfig.sitSpPercent
    ) {
      if (this.tryUseConsumableItemId('blue_potion')) return
    }

    const px = this.playerDisplay.container.x
    const py = this.playerDisplay.container.y
    const attackRangePx = getPlayerAttackRangePx(this.session.equipment)
    const rotSkill = this.currentRotationSkillId()
    const skillRangePx = rotSkill ? this.skillRangeForSkillId(rotSkill) : attackRangePx
    const candidates = this.autoAttackMobCandidates()

    const target = pickAutoAttackTarget({
      playerX: px,
      playerY: py,
      anchorX: this.autoAttackAnchorX,
      anchorY: this.autoAttackAnchorY,
      mobs: candidates,
      filter: this.autoAttackConfig.mobFilter,
      movementMode: this.autoAttackConfig.movementMode,
      patrolRadiusPx: this.autoAttackConfig.patrolRadiusPx,
      attackRangePx,
      skillRangePx,
    })

    if (!target) {
      if (this.autoAttackConfig.movementMode === 'patrol_range' && !this.chaseMob?.alive) {
        const chaseTarget = pickPatrolChaseTarget({
          playerX: px,
          playerY: py,
          anchorX: this.autoAttackAnchorX,
          anchorY: this.autoAttackAnchorY,
          mobs: candidates,
          filter: this.autoAttackConfig.mobFilter,
          patrolRadiusPx: this.autoAttackConfig.patrolRadiusPx,
        })
        const mob = chaseTarget ? this.mobFromCandidate(chaseTarget) : null
        if (mob) this.beginChaseMob(mob, true)
      }
      return
    }

    const mob = this.mobFromCandidate(target)
    if (!mob) return

    const dist = Phaser.Math.Distance.Between(px, py, mob.sprite.x, mob.sprite.y)
    const inStrikeRange = dist <= skillRangePx

    if (!inStrikeRange) {
      if (this.autoAttackConfig.movementMode === 'patrol_range') {
        this.beginChaseMob(mob, true)
      }
      return
    }

    this.setSelectedMob(mob)
    if (!rotSkill) return
    if (now - this.lastAutoRotationAt < 200) return
    if (this.isAttacking) return

    const used = this.tryUseSkillId(rotSkill, { fromAuto: true, mob })
    if (used) {
      this.lastAutoRotationAt = now
      this.advanceAutoRotation()
    }
  }

  getPlayerPosition() {
    return {
      x: this.playerDisplay.container.x,
      y: this.playerDisplay.container.y,
      mapId: this.character.map_id,
    }
  }

  captureHudPortrait(): string | null {
    if (!this.playerDisplay) return null
    return capturePlayerHudPortrait(this, this.playerDisplay)
  }

  shutdown() {
    this.autoPatrolCircle?.destroy()
    this.autoPatrolCircle = null
    this.worldPersistDisabled = true
    this.minimapExpanded = false
    this.eventUnsubs.forEach((u) => u())
    this.eventUnsubs = []
    if (this.persistTimer) window.clearInterval(this.persistTimer)
    if (this.progressSaveTimer) window.clearTimeout(this.progressSaveTimer)
    const presence = this.presence
    this.presence = null
    presence?.setCombatHandler(null)
    void (async () => {
      await flushActiveMapPresenceLeave()
      await presence?.leave()
    })()
    this.disposeRemotePlayers()
    // Do not save world position here: this.character.map_id is from scene boot and can be
    // stale when React remounts the game after NPC/portal warp, overwriting the new map in DB.
  }
}
