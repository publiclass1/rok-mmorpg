import { useEffect, useMemo, useState } from 'react'
import {
  appearanceKey,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import type { EquipSlot } from '../game/character/characterState'
import { renderPlayerPreview } from '../game/preview/playerPreviewRuntime'

type Props = {
  appearance: CharacterAppearance
  equipment: Record<EquipSlot, string | null>
  jobId?: string
  className?: string
  size?: 'sm' | 'lg'
}

export function CharacterFieldPreview({
  appearance,
  equipment,
  jobId,
  className,
  size = 'lg',
}: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const renderKey = useMemo(
    () => `${appearanceKey(appearance)}|${jobId ?? 'novice'}|${JSON.stringify(equipment)}`,
    [appearance, jobId, equipment],
  )

  useEffect(() => {
    let cancelled = false
    setSrc(null)

    void renderPlayerPreview({ appearance, equipment, jobId }).then((url) => {
      if (!cancelled && url) setSrc(url)
    })

    return () => {
      cancelled = true
    }
  }, [renderKey, appearance, equipment, jobId])

  return (
    <img
      className={`character-field-preview character-field-preview--${size}${className ? ` ${className}` : ''}`}
      src={src ?? undefined}
      alt=""
      draggable={false}
      aria-hidden
    />
  )
}
