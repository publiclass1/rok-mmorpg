const NEARBY_COMBAT_AUDIO_RANGE = 480

export function isWithinCombatAudioRange(
  listenerX: number,
  listenerY: number,
  sourceX: number,
  sourceY: number,
): boolean {
  const dx = listenerX - sourceX
  const dy = listenerY - sourceY
  return dx * dx + dy * dy <= NEARBY_COMBAT_AUDIO_RANGE * NEARBY_COMBAT_AUDIO_RANGE
}

export class SfxPlayer {
  private ctx: AudioContext | null = null

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  private beep(frequency: number, durationMs: number, type: OscillatorType = 'square', gain = 0.08) {
    const ctx = this.ensureContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    amp.gain.value = gain
    osc.connect(amp)
    amp.connect(ctx.destination)
    const t = ctx.currentTime
    amp.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000)
    osc.start(t)
    osc.stop(t + durationMs / 1000)
  }

  playAttack(gain = 0.06) {
    this.beep(320, 60, 'triangle', gain)
  }

  playHit(gain = 0.09) {
    this.beep(180, 70, 'square', gain)
  }

  playMiss(gain = 0.05) {
    this.beep(90, 90, 'sawtooth', gain)
  }

  /** Quieter beeps when the listener is far from the action. */
  playAttackNearby(listenerX: number, listenerY: number, sourceX: number, sourceY: number) {
    if (!isWithinCombatAudioRange(listenerX, listenerY, sourceX, sourceY)) return
    this.playAttack(0.045)
  }

  playHitNearby(listenerX: number, listenerY: number, sourceX: number, sourceY: number) {
    if (!isWithinCombatAudioRange(listenerX, listenerY, sourceX, sourceY)) return
    this.playHit(0.065)
  }

  playMissNearby(listenerX: number, listenerY: number, sourceX: number, sourceY: number) {
    if (!isWithinCombatAudioRange(listenerX, listenerY, sourceX, sourceY)) return
    this.playMiss(0.035)
  }

  playKillStreak(streak: string) {
    const patterns: Record<string, number[]> = {
      first_blood: [440, 554, 659],
      double: [523, 659],
      triple: [587, 740, 880],
      ultra: [659, 831, 988, 1175],
      rampage: [392, 523, 659, 784, 988],
    }
    const freqs = patterns[streak] ?? [440, 660]
    freqs.forEach((f, i) => {
      window.setTimeout(() => this.beep(f, 120, 'square', 0.1), i * 90)
    })
  }
}
