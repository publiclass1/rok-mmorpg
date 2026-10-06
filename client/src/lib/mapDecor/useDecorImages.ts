import { useEffect, useState } from 'react'
import { DECOR_ASSETS, type DecorAssetId } from './catalog'

const cache = new Map<DecorAssetId, HTMLImageElement>()

/** Bumps when SVG thumbnails finish loading (triggers canvas redraw). */
export function useDecorImages(): number {
  const [ready, setReady] = useState(0)

  useEffect(() => {
    let pending = 0
    for (const asset of DECOR_ASSETS) {
      if (cache.has(asset.id)) continue
      pending++
      const img = new Image()
      img.onload = () => {
        cache.set(asset.id, img)
        setReady((n) => n + 1)
      }
      img.onerror = () => setReady((n) => n + 1)
      img.src = asset.src
    }
    if (pending === 0) setReady(1)
  }, [])

  return ready
}

export function getDecorImage(id: DecorAssetId): HTMLImageElement | undefined {
  return cache.get(id)
}
