import { DECOR_ASSETS, DECOR_DRAG_MIME } from '../../lib/mapDecor/catalog'
import type { EditorTool } from './MapEditorCanvas'
import { EDITOR_TOOLS, TOOL_LABELS, ToolIcon } from './toolIcons'

type Props = {
  tool: EditorTool
  onToolChange: (tool: EditorTool) => void
  onResetView?: () => void
  disabled?: boolean
}

export function MapEditorToolbar({ tool, onToolChange, onResetView, disabled }: Props) {
  return (
    <div className="map-admin-canvas-toolbar">
      <div className="map-admin-tool-icons" role="toolbar" aria-label="Map editor tools">
        {EDITOR_TOOLS.map((t) => (
          <button
            key={t}
            type="button"
            className={`map-admin-tool-icon${tool === t ? ' active' : ''}`}
            title={TOOL_LABELS[t]}
            aria-label={TOOL_LABELS[t]}
            aria-pressed={tool === t}
            disabled={disabled}
            onClick={() => onToolChange(t)}
          >
            <ToolIcon tool={t} />
          </button>
        ))}
      </div>
      {onResetView && (
        <button type="button" className="map-admin-reset-view secondary" disabled={disabled} onClick={onResetView}>
          Reset view
        </button>
      )}
      <div className="map-admin-toolbar-decor" aria-label="Decor drag onto map">
        {DECOR_ASSETS.map((asset) => (
          <div
            key={asset.id}
            className="map-admin-decor-chip"
            draggable={!disabled}
            title={`Drag ${asset.label}`}
            onDragStart={(e) => {
              e.dataTransfer.setData(DECOR_DRAG_MIME, asset.id)
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <img src={asset.src} alt="" width={28} height={28} />
          </div>
        ))}
      </div>
    </div>
  )
}
