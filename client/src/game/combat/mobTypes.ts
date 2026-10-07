import Phaser from 'phaser'

export type MobState = 'wander' | 'chase' | 'attack'

export type MobInstance = {
  /** Index in MOB_SPAWNS_BY_MAP[mapId]; used for cross-client combat sync. */
  spawnIndex: number
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  hpBarBg: Phaser.GameObjects.Rectangle
  hpBarFill: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  defId: string
  hp: number
  maxHp: number
  level: number
  name: string
  spawnX: number
  spawnY: number
  alive: boolean
  state: MobState
  roamTargetX: number
  roamTargetY: number
  lastAttackAt: number
  lastWanderAt: number
  provokedByPlayer: boolean
  skillCooldownUntil: Record<string, number>
  respawnMs: number
  canLure: boolean
  lureRadius: number
  spotCenterX: number
  spotCenterY: number
  spotRect: { x: number; y: number; width: number; height: number } | null
}
