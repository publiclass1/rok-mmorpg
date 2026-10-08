import { useCallback, useState } from 'react'
import {
  clampWorldYScale,
  loadWorldYScale,
  saveWorldYScale,
  WORLD_Y_SCALE_MAX,
  WORLD_Y_SCALE_MIN,
} from '../game/world/worldViewPerspective'
import { emitGameEvent } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  onClose: () => void
}

function tiltLabel(yScale: number): string {
  if (yScale >= WORLD_Y_SCALE_MAX - 0.001) return 'Flat (top-down)'
  const tiltPct = Math.round((1 - yScale) * 100)
  return `Oblique (~${tiltPct}% tilt)`
}

export function DisplaySettingsWindow({ onClose }: Props) {
  const [yScale, setYScale] = useState(() => loadWorldYScale())

  const applyScale = useCallback((next: number) => {
    const clamped = saveWorldYScale(next)
    setYScale(clamped)
    emitGameEvent('worldViewPerspective', { yScale: clamped })
  }, [])

  return (
    <AnimatedModal panelClassName="panel modal display-settings-modal">
      <ModalHeader title="Display" onClose={onClose} />
      <ModalScrollBody>
        <section className="display-settings-section">
          <h3 className="display-settings-section__title">View tilt</h3>
          <p className="muted small">
            Squashes the world vertically for a 2.5D angle. Movement and the minimap stay top-down.
          </p>
          <label className="display-settings-slider">
            <span className="display-settings-slider__label">{tiltLabel(yScale)}</span>
            <input
              type="range"
              min={WORLD_Y_SCALE_MIN}
              max={WORLD_Y_SCALE_MAX}
              step={0.01}
              value={yScale}
              onChange={(e) => applyScale(clampWorldYScale(Number(e.target.value)))}
            />
            <span className="display-settings-slider__value">{yScale.toFixed(2)}</span>
          </label>
        </section>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
