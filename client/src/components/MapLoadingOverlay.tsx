import { motion } from 'motion/react'
import { overlayMotion, panelMotion } from './motion/motionPresets'

type Props = {
  label: string
  mapId: string
}

export function MapLoadingOverlay({ label, mapId }: Props) {
  return (
    <motion.div
      className="map-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...overlayMotion}
    >
      <motion.div className="map-loading-panel panel" {...panelMotion}>
        <p className="map-loading-title">Loading map</p>
        <p className="map-loading-destination">{label}</p>
        <p className="muted small map-loading-id">{mapId}</p>
        <div className="map-loading-spinner" aria-hidden />
      </motion.div>
    </motion.div>
  )
}
