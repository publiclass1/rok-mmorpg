import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ActivityLogEntry } from '../game/events'
import { emitGameEvent } from '../game/events'
import type { ChatMessage } from '../game/realtime/mapChat'
import { ActivityLog } from './ActivityLog'

const LOG_HEIGHT_KEY = 'chat-strip-log-height'
const LOG_WIDTH_KEY = 'chat-strip-panel-width'
const POSITION_KEY = 'chat-strip-position'
const LOG_HEIGHT_DEFAULT = 72
const LOG_HEIGHT_MIN = 56
const LOG_HEIGHT_MAX = 280
const PANEL_WIDTH_DEFAULT = 360
const PANEL_WIDTH_MIN = 200
const PANEL_WIDTH_MAX = 720

type ChatTab = 'map' | 'party'
type Tab = ChatTab | 'log'

type PanelPosition = { x: number; y: number }

function readStoredLogHeight(): number {
  try {
    const raw = localStorage.getItem(LOG_HEIGHT_KEY)
    if (!raw) return LOG_HEIGHT_DEFAULT
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return LOG_HEIGHT_DEFAULT
    return Math.min(LOG_HEIGHT_MAX, Math.max(LOG_HEIGHT_MIN, n))
  } catch {
    return LOG_HEIGHT_DEFAULT
  }
}

function readStoredPanelWidth(): number {
  try {
    const raw = localStorage.getItem(LOG_WIDTH_KEY)
    if (!raw) return PANEL_WIDTH_DEFAULT
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return PANEL_WIDTH_DEFAULT
    return Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, n))
  } catch {
    return PANEL_WIDTH_DEFAULT
  }
}

function maxPanelWidthForOverlay(overlay: HTMLElement): number {
  const pad = 12
  return Math.max(PANEL_WIDTH_MIN, Math.min(PANEL_WIDTH_MAX, overlay.clientWidth - pad))
}

function clampPanelWidth(overlay: HTMLElement | null, width: number): number {
  const maxW = overlay ? maxPanelWidthForOverlay(overlay) : PANEL_WIDTH_MAX
  return Math.min(maxW, Math.max(PANEL_WIDTH_MIN, width))
}

function readStoredPosition(): PanelPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<PanelPosition>
    if (typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { x: p.x, y: p.y }
    }
  } catch {
    /* ignore */
  }
  return null
}

function clampPosition(
  overlay: HTMLElement,
  strip: HTMLElement,
  x: number,
  y: number,
): PanelPosition {
  const pad = 6
  const maxX = Math.max(pad, overlay.clientWidth - strip.offsetWidth - pad)
  const maxY = Math.max(pad, overlay.clientHeight - strip.offsetHeight - pad)
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  }
}

function defaultDockPosition(overlay: HTMLElement, strip: HTMLElement): PanelPosition {
  const marginX = 10
  const marginY = 10
  const dock = overlay.querySelector('.game-bottom-dock')
  const dockH = dock instanceof HTMLElement ? dock.offsetHeight : 48
  const x = marginX
  const y = Math.max(marginY, overlay.clientHeight - dockH - marginY - strip.offsetHeight)
  return clampPosition(overlay, strip, x, y)
}

type Props = {
  partyEnabled: boolean
  onSend: (tab: ChatTab, text: string) => boolean
  mapLines: ChatMessage[]
  partyLines: ChatMessage[]
  activityEntries: ActivityLogEntry[]
  mapChatPlaceholder?: string
}

export type ChatStripHandle = {
  focusChat: () => void
  /** Empty draft blurs input; otherwise sends and shows chat / bubble. */
  commitOrBlurChat: () => void
}

export const ChatStrip = forwardRef<ChatStripHandle, Props>(function ChatStrip(
  { partyEnabled, onSend, mapLines, partyLines, activityEntries, mapChatPlaceholder },
  ref,
) {
  const [tab, setTab] = useState<Tab>('map')
  const [draft, setDraft] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [focusChatPending, setFocusChatPending] = useState(false)
  const [logHeightPx, setLogHeightPx] = useState(readStoredLogHeight)
  const [panelWidthPx, setPanelWidthPx] = useState(readStoredPanelWidth)
  const [position, setPosition] = useState<PanelPosition | null>(readStoredPosition)
  const logHeightRef = useRef(logHeightPx)
  logHeightRef.current = logHeightPx
  const panelWidthRef = useRef(panelWidthPx)
  panelWidthRef.current = panelWidthPx
  const positionRef = useRef(position)
  positionRef.current = position
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const resizeDragRef = useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)
  const moveDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  )
  const defaultPositionedRef = useRef(Boolean(readStoredPosition()))

  const lines = tab === 'map' ? mapLines : tab === 'party' ? partyLines : []

  useEffect(() => () => emitGameEvent('uiKeyboardLock', false), [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (tab === 'log') {
      el.scrollTop = 0
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [lines.length, activityEntries.length, tab])

  const persistLogHeight = useCallback((height: number) => {
    try {
      localStorage.setItem(LOG_HEIGHT_KEY, String(height))
    } catch {
      /* ignore */
    }
  }, [])

  const persistPanelWidth = useCallback((width: number) => {
    try {
      localStorage.setItem(LOG_WIDTH_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [])

  const persistPosition = useCallback((pos: PanelPosition) => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(pos))
    } catch {
      /* ignore */
    }
  }, [])

  const ensurePosition = useCallback(() => {
    const strip = stripRef.current
    const overlay = strip?.closest('.game-hud-overlay')
    if (!strip || !(overlay instanceof HTMLElement)) return null
    const current = positionRef.current
    if (current) {
      const clamped = clampPosition(overlay, strip, current.x, current.y)
      if (clamped.x !== current.x || clamped.y !== current.y) {
        setPosition(clamped)
        positionRef.current = clamped
      }
      return clamped
    }
    const docked = defaultDockPosition(overlay, strip)
    setPosition(docked)
    positionRef.current = docked
    defaultPositionedRef.current = true
    return docked
  }, [])

  useLayoutEffect(() => {
    if (defaultPositionedRef.current && position !== null) return
    ensurePosition()
  }, [ensurePosition, position, minimized, logHeightPx, panelWidthPx, tab])

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const resize = resizeDragRef.current
      if (resize) {
        const strip = stripRef.current
        const overlay = strip?.closest('.game-hud-overlay')
        const overlayEl = overlay instanceof HTMLElement ? overlay : null
        const nextHeight = Math.min(
          LOG_HEIGHT_MAX,
          Math.max(LOG_HEIGHT_MIN, resize.startHeight + (e.clientY - resize.startY)),
        )
        const nextWidth = clampPanelWidth(
          overlayEl,
          resize.startWidth + (e.clientX - resize.startX),
        )
        setLogHeightPx(nextHeight)
        setPanelWidthPx(nextWidth)
        panelWidthRef.current = nextWidth
        logHeightRef.current = nextHeight
        return
      }

      const move = moveDragRef.current
      if (!move) return
      const strip = stripRef.current
      const overlay = strip?.closest('.game-hud-overlay')
      if (!strip || !(overlay instanceof HTMLElement)) return
      const next = clampPosition(
        overlay,
        strip,
        move.origX + (e.clientX - move.startX),
        move.origY + (e.clientY - move.startY),
      )
      setPosition(next)
      positionRef.current = next
    }

    function onPointerUp() {
      if (resizeDragRef.current) {
        resizeDragRef.current = null
        document.body.style.removeProperty('user-select')
        document.body.classList.remove('chat-strip-resizing')
        persistLogHeight(logHeightRef.current)
        persistPanelWidth(panelWidthRef.current)
        ensurePosition()
      }
      if (moveDragRef.current) {
        moveDragRef.current = null
        document.body.style.removeProperty('user-select')
        document.body.classList.remove('chat-strip-dragging')
        const pos = positionRef.current
        if (pos) persistPosition(pos)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.body.style.removeProperty('user-select')
      document.body.classList.remove('chat-strip-dragging')
      document.body.classList.remove('chat-strip-resizing')
    }
  }, [persistLogHeight, persistPanelWidth, persistPosition, ensurePosition])

  useEffect(() => {
    function onResize() {
      const strip = stripRef.current
      const overlay = strip?.closest('.game-hud-overlay')
      if (strip && overlay instanceof HTMLElement) {
        const clamped = clampPanelWidth(overlay, panelWidthRef.current)
        if (clamped !== panelWidthRef.current) {
          setPanelWidthPx(clamped)
          panelWidthRef.current = clamped
        }
      }
      ensurePosition()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ensurePosition])

  function onResizePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const strip = stripRef.current
    resizeDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: strip?.offsetWidth ?? panelWidthPx,
      startHeight: logHeightPx,
    }
    document.body.style.userSelect = 'none'
    document.body.classList.add('chat-strip-resizing')
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onResizePointerUp(e: React.PointerEvent) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function onHeaderPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    const target = e.target
    if (target instanceof HTMLElement && target.closest('button')) return

    const strip = stripRef.current
    const overlay = strip?.closest('.game-hud-overlay')
    if (!strip || !(overlay instanceof HTMLElement)) return

    e.preventDefault()
    const pos = ensurePosition() ?? defaultDockPosition(overlay, strip)
    moveDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    }
    document.body.style.userSelect = 'none'
    document.body.classList.add('chat-strip-dragging')
  }

  const focusChat = useCallback(() => {
    setFocusChatPending(true)
    setMinimized(false)
    setTab((current) => (current === 'log' ? 'map' : current))
  }, [])

  useEffect(() => {
    if (!focusChatPending || minimized || tab === 'log') return
    inputRef.current?.focus()
    setFocusChatPending(false)
  }, [focusChatPending, minimized, tab])

  function blurChatInput() {
    inputRef.current?.blur()
  }

  const commitOrBlurChat = useCallback(() => {
    if (tab === 'log') {
      setTab('map')
      setFocusChatPending(true)
      return
    }
    if (!draft.trim()) {
      blurChatInput()
      return
    }
    const ok = onSend(tab, draft)
    if (ok) setDraft('')
  }, [draft, onSend, tab])

  useImperativeHandle(ref, () => ({ focusChat, commitOrBlurChat }), [focusChat, commitOrBlurChat])

  const logPaneStyle = {
    height: `${logHeightPx}px`,
    maxHeight: `${logHeightPx}px`,
  }

  const stripStyle = {
    width: `${panelWidthPx}px`,
    maxWidth: 'none',
    ...(position !== null ? { left: `${position.x}px`, top: `${position.y}px` } : {}),
  }

  return (
    <div
      ref={stripRef}
      className={`chat-strip chat-strip--floating${minimized ? ' chat-strip--minimized' : ''}`}
      style={stripStyle}
    >
      <div
        className="chat-strip-header row spread"
        onPointerDown={onHeaderPointerDown}
        title="Drag to move chat"
      >
        <div className="chat-strip-tabs row gap">
          <button
            type="button"
            className={tab === 'map' ? 'hud-btn' : 'secondary hud-btn'}
            onClick={() => setTab('map')}
          >
            Map
          </button>
          <button
            type="button"
            className={tab === 'party' ? 'hud-btn' : 'secondary hud-btn'}
            disabled={!partyEnabled}
            onClick={() => setTab('party')}
          >
            Party
          </button>
          <button
            type="button"
            className={tab === 'log' ? 'hud-btn' : 'secondary hud-btn'}
            onClick={() => setTab('log')}
          >
            Log
          </button>
        </div>
        <button
          type="button"
          className="secondary hud-btn chat-strip-minimize"
          onClick={() => setMinimized((m) => !m)}
          aria-expanded={!minimized}
        >
          {minimized ? 'Show chat' : 'Minimize'}
        </button>
      </div>
      {!minimized && (
        <>
          <div className="chat-strip-log-wrap">
            <div className="chat-strip-log" ref={scrollRef} style={logPaneStyle}>
              {tab === 'log' ? (
                <ActivityLog
                  entries={activityEntries}
                  maxEntries={100}
                  showTitle={false}
                  className="activity-log--chat-strip"
                />
              ) : (
                lines.map((line) => (
                  <p
                    key={`${line.at}-${line.characterId}`}
                    className={`small chat-line${line.characterId === 'system' ? ' chat-line--system' : ''}`}
                  >
                    <strong>{line.name}:</strong> {line.text}
                  </p>
                ))
              )}
            </div>
            <button
              type="button"
              className="chat-strip-log-resize"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize chat box"
              onPointerDown={onResizePointerDown}
              onPointerUp={onResizePointerUp}
            />
          </div>
          {tab !== 'log' && (
            <input
              ref={inputRef}
              className="chat-strip-input"
              value={draft}
              placeholder={
                tab === 'party' && !partyEnabled
                  ? 'Join a party to chat'
                  : tab === 'map' && mapChatPlaceholder
                    ? mapChatPlaceholder
                    : 'Say something…'
              }
              disabled={tab === 'party' && !partyEnabled}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => emitGameEvent('uiKeyboardLock', true)}
              onBlur={() => emitGameEvent('uiKeyboardLock', false)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.code === 'Space') {
                  e.stopPropagation()
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  commitOrBlurChat()
                }
              }}
            />
          )}
        </>
      )}
    </div>
  )
})
