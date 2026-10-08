const FILE = '/sounds/job-change/job-change.wav'

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

export function preloadJobChangeAudio(): void {
  if (typeof window === 'undefined') return
  cachedAudio(FILE).load()
}

export function playJobChangeAudio(): void {
  if (typeof window === 'undefined') return
  const template = cachedAudio(FILE)
  const audio = template.cloneNode(true) as HTMLAudioElement
  audio.volume = 0.88
  void audio.play().catch(() => {})
}
