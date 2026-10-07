import type { LevelUpKind } from './levelUpSteps'

/**
 * Short celebratory chimes (original, generated PCM WAVs in public/sounds/level-up/).
 */
const FILES: Record<LevelUpKind, string> = {
  base: '/sounds/level-up/base.wav',
  job: '/sounds/level-up/job.wav',
}

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

export function preloadLevelUpAudio(): void {
  if (typeof window === 'undefined') return
  for (const src of Object.values(FILES)) {
    cachedAudio(src).load()
  }
}

export function playLevelUpAudio(kind: LevelUpKind): void {
  if (typeof window === 'undefined') return
  const template = cachedAudio(FILES[kind])
  const audio = template.cloneNode(true) as HTMLAudioElement
  audio.volume = kind === 'base' ? 0.85 : 0.8
  void audio.play().catch(() => {})
}
