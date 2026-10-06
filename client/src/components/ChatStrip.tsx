import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../game/realtime/mapChat'

type Tab = 'map' | 'party'

type Props = {
  partyEnabled: boolean
  onSend: (tab: Tab, text: string) => boolean
  mapLines: ChatMessage[]
  partyLines: ChatMessage[]
}

export function ChatStrip({ partyEnabled, onSend, mapLines, partyLines }: Props) {
  const [tab, setTab] = useState<Tab>('map')
  const [draft, setDraft] = useState('')
  const [minimized, setMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const lines = tab === 'map' ? mapLines : partyLines

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length, tab])

  function submit() {
    if (!draft.trim()) return
    const ok = onSend(tab, draft)
    if (ok) setDraft('')
  }

  return (
    <div className={`chat-strip${minimized ? ' chat-strip--minimized' : ''}`}>
      <div className="chat-strip-header row spread">
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
          <div className="chat-strip-log" ref={scrollRef}>
            {lines.map((line) => (
              <p key={`${line.at}-${line.characterId}`} className="small chat-line">
                <strong>{line.name}:</strong> {line.text}
              </p>
            ))}
          </div>
          <input
            className="chat-strip-input"
            value={draft}
            placeholder={tab === 'party' && !partyEnabled ? 'Join a party to chat' : 'Say something…'}
            disabled={tab === 'party' && !partyEnabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
        </>
      )}
    </div>
  )
}
