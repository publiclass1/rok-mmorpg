import { useEffect, useState, type RefObject } from 'react'
import type Phaser from 'phaser'
import { onGameEvent } from '../game/events'
import type { WorldScene } from '../game/scenes/WorldScene'

type Props = {
  gameRef: RefObject<Phaser.Game | null>
  revision: string
}

function captureFromGame(game: Phaser.Game): string | null {
  const scene = game.scene.getScene('WorldScene') as WorldScene | undefined
  if (!scene?.scene.isActive()) return null
  return scene.captureHudPortrait()
}

export function PlayerHudPortrait({ gameRef, revision }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      const game = gameRef.current
      if (!game || cancelled) return
      const url = captureFromGame(game)
      if (url) setSrc(url)
    }

    refresh()
    const retry = window.setTimeout(refresh, 150)
    const retryLate = window.setTimeout(refresh, 500)

    return () => {
      cancelled = true
      window.clearTimeout(retry)
      window.clearTimeout(retryLate)
    }
  }, [gameRef, revision])

  useEffect(() => {
    const onReady = () => {
      const game = gameRef.current
      if (!game) return
      const url = captureFromGame(game)
      if (url) setSrc(url)
    }
    const unsub = onGameEvent('worldReady', onReady)
    return () => {
      unsub()
    }
  }, [gameRef])

  return (
    <img
      className="game-hud-vitals__portrait-img"
      src={src ?? undefined}
      alt=""
      draggable={false}
    />
  )
}
