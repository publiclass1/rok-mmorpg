import { DECOR_ASSETS, DECOR_DRAG_MIME } from '../../lib/mapDecor/catalog'
import type { EditorTool } from './MapEditorCanvas'
import { TOOL_LABELS, ToolIcon } from './toolIcons'

type Props = {
  tool: EditorTool
  onToolChange: (tool: EditorTool) => void
  obstacleMode: 'tile' | 'rect' | 'line' | 'erase'
  onObstacleModeChange: (mode: 'tile' | 'rect' | 'line' | 'erase') => void
  onResetView?: () => void
  disabled?: boolean
}

export function MapEditorToolbar({ tool, onToolChange, obstacleMode, onObstacleModeChange, onResetView, disabled }: Props) {
  const groups = [
    { label: 'Terrain', tools: ['ground', 'tiles'] as EditorTool[] },
    { label: 'Walkability', tools: ['collision'] as EditorTool[] },
    { label: 'Objects', tools: ['obstacle', 'portal', 'npc', 'mob_spot'] as EditorTool[] },
    { label: 'Edit', tools: ['select'] as EditorTool[] },
  ]
  return (
    <div className="map-admin-canvas-toolbar">
      <div className="map-admin-tool-groups" role="toolbar" aria-label="Map editor tools">
        {groups.map((group) => <div className="map-admin-tool-group" key={group.label}>
          <span className="map-admin-tool-group-label">{group.label}</span>
          <div className="map-admin-tool-icons">
          {group.tools.map((t) => (
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
          {group.label === 'Objects' && tool === 'obstacle' && <select className="map-admin-brush-select" value={obstacleMode} onChange={(e) => onObstacleModeChange(e.target.value as Props['obstacleMode'])} aria-label="Obstacle brush mode">
            <option value="rect">Rectangle</option><option value="tile">Tiles</option><option value="line">Wall line</option><option value="erase">Eraser</option>
          </select>}
        </div>)}
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
