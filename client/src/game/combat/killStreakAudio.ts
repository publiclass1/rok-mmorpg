import type { PvpKillStreakKind } from '../world/pvpConfig'

/**
 * Voiced announcer clips (CC-BY-SA 4.0) — Salatiel / SauerWebUI, from OpenGameArt.
 * https://opengameart.org/content/classic-killstreak-announcer-voices-double-kill-triple-kill
 */
const STREAK_FILES: Record<PvpKillStreakKind, string> = {
  first_blood: '/sounds/pvp/voices/firstblood.wav',
  double: '/sounds/pvp/voices/doublekill.wav',
  triple: '/sounds/pvp/voices/triplekill.wav',
  ultra: '/sounds/pvp/voices/quadruplekill.wav',
  rampage: '/sounds/pvp/voices/quintuplekill.wav',
}

/** Short callout for non-streak kills in PVP. */
const DEFAULT_KILL_FILE = '/sounds/pvp/voices/headshot.wav'

const cache = new Map<string, HTMLAudioElement>()

function cachedAudio(src: string): HTMLAudioElement {
  let audio = cache.get(src)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    cache.set(src, audio)
  }
  return audio
}

export function preloadKillStreakAudio(): void {
  if (typeof window === 'undefined') return
  for (const src of [...Object.values(STREAK_FILES), DEFAULT_KILL_FILE]) {
    cachedAudio(src).load()
  }
}

export function playKillStreakAudio(streak: PvpKillStreakKind | null): void {
  if (typeof window === 'undefined') return
  const src = streak ? STREAK_FILES[streak] : DEFAULT_KILL_FILE
  const template = cachedAudio(src)
  const audio = template.cloneNode(true) as HTMLAudioElement
  audio.volume = streak ? 0.92 : 0.7
  void audio.play().catch(() => {
    // Autoplay policy or missing file — ignore.
  })
}
