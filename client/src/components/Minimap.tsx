import { useRef, useState } from 'react'
import type { MinimapPayload } from '../game/world/minimapTypes'
import { worldRectToMinimap, worldToMinimap } from '../game/world/minimapGeometry'
import { useModalDrag } from './motion/useModalDrag'

const PAD = 6
const COMPACT_SIZE = 136
const EXPANDED_SIZE = 280
const HUD_MARGIN = 10

type Props = {
  data: MinimapPayload | null
}

function minimapInitialPosition(panel: HTMLElement) {
  const w = panel.offsetWidth
  return {
    x: Math.max(HUD_MARGIN, window.innerWidth - w - HUD_MARGIN),
    y: HUD_MARGIN,
  }
}

function MinimapRadar({ data, size }: { data: MinimapPayload; size: number }) {
  const inner = size - PAD * 2
  const view = data.view
  const expanded = size > COMPACT_SIZE
  const toMap = (wx: number, wy: number) => worldToMinimap(wx, wy, view, inner, PAD)
  const rectToMap = (rect: { x: number; y: number; width: number; height: number }) =>
    worldRectToMinimap(rect, view, inner, PAD)
  const local = toMap(data.localPlayer.x, data.localPlayer.y)
  const mobR = expanded ? 4 : 2.5
  const remoteR = expanded ? 4.5 : 3
  const playerR = expanded ? 6 : 4

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="game-hud-minimap-svg">
      <rect x={PAD} y={PAD} width={inner} height={inner} rx={4} fill="#0b1220" stroke="#334155" strokeWidth={1} />
      {data.blockedTiles.map((t, i) => {
        const r = rectToMap(t)
        return (
          <rect
            key={`w-${i}`}
            x={r.x}
            y={r.y}
            width={Math.max(0.5, r.width)}
            height={Math.max(0.5, r.height)}
            fill="#475569"
            opacity={0.85}
          />
        )
      })}
      {data.obstacles.map((o, i) => {
        const r = rectToMap(o)
        return (
          <rect
            key={`o-${i}`}
            x={r.x}
            y={r.y}
            width={Math.max(0.5, r.width)}
            height={Math.max(0.5, r.height)}
            fill="#78716c"
            stroke="#44403c"
            strokeWidth={0.5}
          />
        )
      })}
      {data.mobs.map((m) => {
        const p = toMap(m.x, m.y)
        return <circle key={`m-${m.spawnIndex}`} cx={p.x} cy={p.y} r={mobR} fill="#f472b6" />
      })}
      {data.remotes.map((r) => {
        const p = toMap(r.x, r.y)
        return <circle key={r.characterId} cx={p.x} cy={p.y} r={remoteR} fill="#60a5fa" />
      })}
      <circle cx={local.x} cy={local.y} r={playerR} fill="#4ade80" stroke="#14532d" strokeWidth={1} />
    </svg>
  )
}

export function Minimap({ data }: Props) {
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const pos = useModalDrag(panelRef, true, minimapInitialPosition)
  const size = expanded ? EXPANDED_SIZE : COMPACT_SIZE

  if (!data || data.view.width <= 0 || data.view.height <= 0) return null

  const panelStyle = pos
    ? { position: 'fixed' as const, left: pos.x, top: pos.y, margin: 0, visibility: 'visible' as const }
    : { position: 'fixed' as const, left: 0, top: 0, margin: 0, visibility: 'hidden' as const }

  return (
    <div
      ref={panelRef}
      className={`game-hud-minimap${expanded ? ' game-hud-minimap--expanded' : ''}`}
      style={panelStyle}
      aria-label="Minimap"
    >
      <div className="game-hud-minimap-header modal-drag-handle" title="Drag to move minimap">
        <span className="game-hud-minimap-title">Map</span>
        <button
          type="button"
          className="game-hud-minimap-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Restore minimap size' : 'Maximize minimap'}
          title={expanded ? 'Restore size' : 'Maximize'}
        >
          {expanded ? '▢' : '⤢'}
        </button>
      </div>
      <MinimapRadar data={data} size={size} />
    </div>
  )
}
