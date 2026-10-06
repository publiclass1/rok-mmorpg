import { DECOR_ASSETS, DECOR_DRAG_MIME } from '../../lib/mapDecor/catalog'

export function DecorAssetPalette() {
  return (
    <fieldset className="map-admin-fieldset">
      <legend>Decor (drag onto map)</legend>
      <div className="map-admin-decor-palette">
        {DECOR_ASSETS.map((asset) => (
          <div
            key={asset.id}
            className="map-admin-decor-item"
            draggable
            title={`Drag ${asset.label} onto the map`}
            onDragStart={(e) => {
              e.dataTransfer.setData(DECOR_DRAG_MIME, asset.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <img src={asset.src} alt="" width={48} height={48} className="map-admin-decor-thumb" />
            <span>{asset.label}</span>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
