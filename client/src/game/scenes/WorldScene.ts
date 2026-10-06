import Phaser from 'phaser'
import { syncDerivedVitals, toCharacterSheetPayload } from '../character/characterSheet'
import {
  addExperience,
  createInitialCharacterState,
  normalizeEquipment,
  type CharacterSessionState,
} from '../character/characterState'
import { SKILLS } from '../character/skillsConfig'
import {
  flashPlayer,
  missTextPosition,
  playMobHitShake,
  playPlayerAttack,
  showFloatingText,
} from '../combat/combatFx'
import { colliderWithObstacles, spawnObstacles } from '../combat/mapObstacles'
import { initMobAiFields, updateMob } from '../combat/mobAi'
import { logActivity } from '../activityLog'
import { scaleMobExp } from '../combat/gameConfig'
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_RANGE,
  MOB_DEFS,
  MOB_RESPAWN_MS,
  MOB_SPAWNS_BY_MAP,
} from '../combat/mobConfig'
import type { MobInstance } from '../combat/mobTypes'
import { SfxPlayer } from '../combat/sfx'
import { emitGameEvent, onGameEvent } from '../events'
import {
  clearMoveTarget,
  createMoveTarget,
  setMoveTarget,
  updateClickMove,
  type Facing,
  type MoveTarget,
} from '../movement/clickToMove'
import { tryJump } from '../movement/jump'
import {
  createPlayerDisplay,
  playPlayerAnim,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'
import { MapPresenceChannel } from '../realtime/mapChannel'
import { ensureMobTexture, ensureTilesTexture } from '../textures'
import { supabase } from '../../lib/supabase'
import { saveCharacterSession } from '../../lib/characterProgress'
import type { CharacterRow, NpcRow } from '../../types/database'

const INTERACT_RANGE = 64
const MOB_CLICK_RADIUS = 24

export class WorldScene extends Phaser.Scene {
  private character!: CharacterRow
  private playerDisplay!: PlayerDisplay
  private spaceKey!: Phaser.Input.Keyboard.Key
  private eventUnsubs: Array<() => void> = []

  private npcs: NpcRow[] = []
  private npcSprites: Phaser.GameObjects.Rectangle[] = []
  private presence: MapPresenceChannel | null = null
  private remoteSprites = new Map<string, Phaser.GameObjects.Container>()
  private facing: Facing = 'down'
  private persistTimer: number | null = null
  private progressSaveTimer: number | null = null
  private nearestNpc: NpcRow | null = null

  private session: CharacterSessionState = createInitialCharacterState()
  private moveTarget: MoveTarget = createMoveTarget()
  private chaseMob: MobInstance | null = null
  private selectedMob: MobInstance | null = null
  private selectionRing: Phaser.GameObjects.Ellipse | null = null
  private uiPointerLocked = false
  private lastAttackAt = 0
  private isAttacking = false
  private isJumping = false
  private mobs: MobInstance[] = []
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer | null = null
  private sfx = new SfxPlayer()

  constructor() {
    super('WorldScene')
  }

  init(data: { character?: CharacterRow; npcs?: NpcRow[] }) {
    this.character = data.character ?? this.registry.get('bootCharacter')
    this.npcs = data.npcs ?? this.registry.get('bootNpcs') ?? []
  }

  preload() {
    this.load.tilemapTiledJSON('map', `/maps/${this.character.map_id}.tmj`)
  }

  create() {
    ensureTilesTexture(this)
    ensureMobTexture(this)

    const map = this.make.tilemap({ key: 'map' })
    const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0)
    if (!tileset) throw new Error('Failed to load tileset')

    map.createLayer('ground', tileset, 0, 0)
    const collision = map.createLayer('collision', tileset, 0, 0)
    collision?.setVisible(false)
    collision?.setCollisionByExclusion([-1, 0])
    this.collisionLayer = collision

    const worldW = map.widthInPixels
    const worldH = map.heightInPixels
    this.physics.world.setBounds(0, 0, worldW, worldH)
    this.cameras.main.setBounds(0, 0, worldW, worldH)

    this.playerDisplay = createPlayerDisplay(this, this.character.x, this.character.y)
    const playerBody = this.playerDisplay.container.body as Phaser.Physics.Arcade.Body
    playerBody.setCollideWorldBounds(true)
    if (collision) {
      this.physics.add.collider(this.playerDisplay.container, collision)
    }

    this.obstacles = spawnObstacles(this, this.character.map_id)
    colliderWithObstacles(this, this.obstacles, this.playerDisplay.container)

    const boot = this.registry.get('bootSession') as CharacterSessionState | undefined
    this.session = syncDerivedVitals(
      boot
        ? { ...boot, equipment: normalizeEquipment(boot.equipment) }
        : createInitialCharacterState(),
    )
    if (!boot) {
      const initialSheet = toCharacterSheetPayload(this.session)
      this.session = { ...this.session, hp: initialSheet.hpMax, mp: initialSheet.mpMax }
    }
    updatePlayerEquipmentLayers(this.playerDisplay, this.session.equipment)

    this.playerLabel = this.add
      .text(this.character.x, this.character.y - 28, this.character.name, {
        fontSize: '11px',
        color: '#bfdbfe',
      })
      .setOrigin(0.5)

    this.cameras.main.startFollow(this.playerDisplay.container, true, 0.12, 0.12)
    this.cameras.main.setZoom(1)

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiPointerLocked || !pointer.leftButtonDown()) return
      const wx = pointer.worldX
      const wy = pointer.worldY
      const mob = this.findMobAt(wx, wy)
      if (mob) {
        this.chaseMob = mob
        this.setSelectedMob(mob)
        setMoveTarget(this.moveTarget, mob.sprite.x, mob.sprite.y)
        this.faceToward(mob.sprite.x, mob.sprite.y)
      } else {
        this.chaseMob = null
        this.setSelectedMob(null)
        setMoveTarget(this.moveTarget, wx, wy)
      }
    })

    for (const npc of this.npcs) {
      const rect = this.add.rectangle(npc.x, npc.y, 28, 36, 0xf59e0b)
      rect.setStrokeStyle(2, 0xffffff)
      this.add.text(npc.x, npc.y - 28, npc.label, { fontSize: '11px', color: '#fff' }).setOrigin(0.5)
      this.npcSprites.push(rect)
    }

    this.spawnMapMobs()

    this.eventUnsubs.push(
      onGameEvent('useSkillSlot', ({ slot }) => this.useSkillSlot(slot)),
      onGameEvent('sessionSync', (payload) => {
        this.session = syncDerivedVitals(structuredClone(payload))
        if (this.playerDisplay) {
          updatePlayerEquipmentLayers(this.playerDisplay, this.session.equipment)
        }
        this.scheduleProgressSave()
      }),
      onGameEvent('uiPointerLock', (locked) => {
        this.uiPointerLocked = locked
      }),
    )

    this.presence = new MapPresenceChannel(
      this.character.map_id,
      {
        characterId: this.character.id,
        name: this.character.name,
        x: this.playerDisplay.container.x,
        y: this.playerDisplay.container.y,
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
        x: this.playerDisplay.container.x,
        y: this.playerDisplay.container.y,
        facing: this.facing,
      }))
    })

    this.persistTimer = window.setInterval(() => {
      void this.persistWorldState()
    }, 3000)

    this.emitCharacterSheet()
    logActivity('system', `Entered ${this.character.map_id}.`)
    emitGameEvent(
      'status',
      `Entered ${this.character.map_id} — click move, Space jump, 1 attack, Alt+S/I/K/E`,
    )
  }

  private playerLabel!: Phaser.GameObjects.Text

  private getPlayerBody() {
    return this.playerDisplay.container.body as Phaser.Physics.Arcade.Body
  }

  update() {
    const sheet = toCharacterSheetPayload(this.session)
    const speed = 140 + Math.min(sheet.effectiveAgi, 99)

    if (!this.isAttacking && !this.isJumping) {
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
          this.getPlayerBody().setVelocity(0, 0)
          this.faceToward(this.chaseMob.sprite.x, this.chaseMob.sprite.y)
          this.tryBasicAttack()
        }
      }

      const move = updateClickMove(
        this.getPlayerBody(),
        this.playerDisplay.container.x,
        this.playerDisplay.container.y,
        this.moveTarget,
        speed,
      )
      if (move.facing) this.facing = move.facing
      if (move.moving) {
        playPlayerAnim(this.playerDisplay, 'walk', this.facing)
      } else if (!this.isAttacking) {
        playPlayerAnim(this.playerDisplay, 'idle', this.facing)
      }
    }

    this.playerLabel.setPosition(this.playerDisplay.container.x, this.playerDisplay.container.y - 28)

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const jumped = tryJump(this, this.playerDisplay.body, () => this.isJumping, (v) => {
        this.isJumping = v
      })
      if (jumped) playPlayerAnim(this.playerDisplay, 'jump', this.facing)
    }

    const now = this.time.now
    const playerAlive = this.session.hp > 0
    for (const mob of this.mobs) {
      if (!mob.alive) continue
      const def = MOB_DEFS[mob.defId]
      if (def) {
        updateMob(mob, def, this.playerDisplay.container.x, this.playerDisplay.container.y, playerAlive, now, {
          onMobHitPlayer: (damage, m) => this.onMobHitPlayer(damage, m),
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
    emitGameEvent('status', `${def.name} (Lv ${level}) — not implemented yet`)
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
      this.selectionRing.setPosition(this.selectedMob.sprite.x, this.selectedMob.sprite.y)
    }
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

  private onMobHitPlayer(damage: number, mob: MobInstance) {
    if (this.session.hp <= 0) return
    const def = MOB_DEFS[mob.defId]
    this.session = { ...this.session, hp: Math.max(0, this.session.hp - damage) }
    showFloatingText(
      this,
      this.playerDisplay.container.x,
      this.playerDisplay.container.y - 36,
      `-${damage}`,
      'mobHitPlayer',
    )
    flashPlayer(this, this.playerDisplay.body)
    this.sfx.playHit()
    if (def) playMobHitShake(this, mob.sprite, def.color)
    logActivity('combat', `Took ${damage} damage from Lv ${mob.level} ${mob.name}.`)
    this.emitCharacterSheet()
  }

  private spawnMapMobs() {
    const spawns = MOB_SPAWNS_BY_MAP[this.character.map_id] ?? []
    for (const spawn of spawns) {
      const def = MOB_DEFS[spawn.defId]
      if (!def) continue
      this.mobs.push(this.createMobInstance(spawn.x, spawn.y, def))
    }
  }

  private createMobInstance(x: number, y: number, def: (typeof MOB_DEFS)[string]): MobInstance {
    const sprite = this.physics.add.sprite(x, y, 'mob')
    sprite.setTint(def.color)
    sprite.setCollideWorldBounds(true)
    if (this.collisionLayer) {
      this.physics.add.collider(sprite, this.collisionLayer)
    }
    colliderWithObstacles(this, this.obstacles, sprite)

    const label = this.add
      .text(x, y - 32, `Lv${def.level} ${def.name}`, { fontSize: '10px', color: '#fbcfe8' })
      .setOrigin(0.5)

    const barW = 32
    const hpBarBg = this.add.rectangle(x, y - 22, barW, 4, 0x1f2937).setOrigin(0.5)
    const hpBarFill = this.add.rectangle(x - barW / 2, y - 22, barW, 4, 0x22c55e).setOrigin(0, 0.5)

    const mob: MobInstance = {
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
      spawnY: y,
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

  private updateMobHpBar(mob: MobInstance) {
    const barW = 32
    const ratio = Math.max(0, mob.hp / mob.maxHp)
    mob.hpBarBg.setPosition(mob.sprite.x, mob.sprite.y - 22)
    mob.hpBarFill.setPosition(mob.sprite.x - barW / 2, mob.sprite.y - 22)
    mob.hpBarFill.width = barW * ratio
    mob.label.setPosition(mob.sprite.x, mob.sprite.y - 32)
  }

  private getAttackDamage(): number {
    return toCharacterSheetPayload(this.session).attackDamage
  }

  private tryBasicAttack() {
    const now = this.time.now
    if (now - this.lastAttackAt < ATTACK_COOLDOWN_MS || this.isAttacking || this.isJumping) return
    this.lastAttackAt = now
    this.isAttacking = true
    this.getPlayerBody().setVelocity(0, 0)
    clearMoveTarget(this.moveTarget)

    this.sfx.playAttack()
    playPlayerAnim(this.playerDisplay, 'attack', this.facing)
    playPlayerAttack(this, this.playerDisplay.body, this.facing, () => {
      this.isAttacking = false
      playPlayerAnim(this.playerDisplay, 'idle', this.facing)
    })

    const target = this.findMobInAttackCone()
    const damage = this.getAttackDamage()
    if (!target) {
      const pos = missTextPosition(this.playerDisplay.container.x, this.playerDisplay.container.y, this.facing)
      showFloatingText(this, pos.x, pos.y, 'MISS', 'miss')
      this.sfx.playMiss()
      logActivity('combat', 'Attack missed.')
      return
    }

    const def = MOB_DEFS[target.defId]
    target.hp -= damage
    if (def) playMobHitShake(this, target.sprite, def.color)
    this.sfx.playHit()
    showFloatingText(this, target.sprite.x, target.sprite.y - 40, `-${damage}`, 'hit')
    logActivity('combat', `Dealt ${damage} damage to Lv ${target.level} ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHp}).`)
    this.updateMobHpBar(target)
    if (this.selectedMob === target) {
      this.emitSelectedMobPayload(target)
    }

    if (target.hp <= 0) {
      if (this.selectedMob === target) this.setSelectedMob(null)
      this.chaseMob = null
      this.killMob(target)
    }
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
      const beforeBase = this.session.progress.baseLevel
      const beforeJob = this.session.progress.jobLevel
      const gained = scaleMobExp(def.baseExp, def.jobExp)
      const result = addExperience(this.session, gained.baseExp, gained.jobExp)
      this.session = syncDerivedVitals(result.state)
      showFloatingText(this, mob.sprite.x, mob.sprite.y - 52, `+${gained.baseExp} Base EXP`, 'exp')
      showFloatingText(this, mob.sprite.x, mob.sprite.y - 68, `+${gained.jobExp} Job EXP`, 'exp')
      logActivity('combat', `Defeated Lv ${mob.level} ${mob.name}.`)
      logActivity('exp', `Gained ${gained.baseExp} Base EXP and ${gained.jobExp} Job EXP.`)
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

    mob.alive = false
    mob.state = 'wander'
    mob.sprite.setVisible(false)
    mob.sprite.body.enable = false
    mob.hpBarBg.setVisible(false)
    mob.hpBarFill.setVisible(false)
    mob.label.setVisible(false)

    this.time.delayedCall(MOB_RESPAWN_MS, () => {
      if (!def) return
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
    })
  }

  private emitCharacterSheet() {
    const sheet = toCharacterSheetPayload(this.session)
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
      void saveCharacterSession(this.character.id, this.session).catch((err) => {
        console.warn('Progress save failed', err)
      })
    }, 2000)
  }

  private async persistWorldState() {
    await Promise.all([
      supabase
        .from('characters')
        .update({
          x: this.playerDisplay.container.x,
          y: this.playerDisplay.container.y,
          map_id: this.character.map_id,
        })
        .eq('id', this.character.id),
      saveCharacterSession(this.character.id, this.session),
    ])
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
    void this.presence?.leave()
    void this.persistWorldState()
  }
}
