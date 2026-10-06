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

  playAttack() {
    this.beep(320, 60, 'triangle', 0.06)
  }

  playHit() {
    this.beep(180, 70, 'square', 0.09)
  }

  playMiss() {
    this.beep(90, 90, 'sawtooth', 0.05)
  }
}
