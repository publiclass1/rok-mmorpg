import type { EditorTool } from './MapEditorCanvas'

const s = 20

export function ToolIcon({ tool, size = s }: { tool: EditorTool; size?: number }) {
  switch (tool) {
    case 'ground':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="14" width="18" height="7" rx="1" fill="#22c55e" />
          <path d="M6 14c2-4 4-6 6-6s4 2 6 6" fill="#16a34a" />
        </svg>
      )
    case 'collision':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="4" y="4" width="7" height="7" fill="#6b7280" />
          <rect x="13" y="4" width="7" height="7" fill="#4b5563" />
          <rect x="4" y="13" width="7" height="7" fill="#4b5563" />
          <rect x="13" y="13" width="7" height="7" fill="#374151" />
        </svg>
      )
    case 'tiles':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path fill="#94a3b8" d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
        </svg>
      )
    case 'obstacle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="5" y="8" width="14" height="12" rx="2" fill="#78716c" stroke="#44403c" />
        </svg>
      )
    case 'portal':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="4" y="3" width="16" height="18" rx="2" fill="#3b82f6" opacity="0.5" />
          <path d="M12 8v8M9 11l3-3 3 3" stroke="#e5e7eb" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'npc':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="8" r="4" fill="#fcd34d" />
          <path d="M6 20c0-4 2.5-6 6-6s6 2 6 6" fill="#60a5fa" />
        </svg>
      )
    case 'select':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M4 4l7 16 2-7 7-2z" fill="#e5e7eb" stroke="#9ca3af" />
        </svg>
      )
    default:
      return null
  }
}

export const EDITOR_TOOLS: EditorTool[] = ['ground', 'collision', 'tiles', 'obstacle', 'portal', 'npc', 'select']

export const TOOL_LABELS: Record<EditorTool, string> = {
  ground: 'Paint ground',
  collision: 'Paint collision',
  tiles: 'Tile brush',
  obstacle: 'Draw obstacle',
  portal: 'Draw portal',
  npc: 'Place NPC',
  select: 'Select / move (Space + drag to pan)',
}
