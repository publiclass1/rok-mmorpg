type Props = {
  label: string
  mapId: string
}

export function MapLoadingOverlay({ label, mapId }: Props) {
  return (
    <div className="map-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="map-loading-panel panel">
        <p className="map-loading-title">Loading map</p>
        <p className="map-loading-destination">{label}</p>
        <p className="muted small map-loading-id">{mapId}</p>
        <div className="map-loading-spinner" aria-hidden />
      </div>
    </div>
  )
}
