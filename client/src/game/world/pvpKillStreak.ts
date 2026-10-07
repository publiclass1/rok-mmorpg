import {
  PVP_KILL_STREAK_WINDOW_MS,
  streakKindForKillCount,
  type PvpKillStreakKind,
} from './pvpConfig'

export class PvpKillStreakTracker {
  private killCount = 0
  private lastKillAt = 0
  private firstBloodAvailable = true

  noteFirstBloodTaken() {
    this.firstBloodAvailable = false
  }

  /** Call when local player gets a kill; returns announce streak or null. */
  onLocalKill(): PvpKillStreakKind | null {
    const now = Date.now()
    if (now - this.lastKillAt > PVP_KILL_STREAK_WINDOW_MS) {
      this.killCount = 0
    }
    this.killCount += 1
    this.lastKillAt = now
    const streak = streakKindForKillCount(this.killCount, this.firstBloodAvailable)
    if (streak === 'first_blood') {
      this.firstBloodAvailable = false
    }
    return streak
  }
}
