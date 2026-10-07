import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminStats,
  grantZenyByName,
  searchAdminCharacters,
  setCharacterGm,
  type AdminCharacterRow,
  type AdminStats,
} from './adminPanelApi'
import { mapDisplayName } from '../game/world/mapDisplayName'

export function GameAdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [gmOnly, setGmOnly] = useState(false)
  const [characters, setCharacters] = useState<AdminCharacterRow[]>([])
  const [zenyName, setZenyName] = useState('')
  const [zenyAmount, setZenyAmount] = useState('')

  const refreshStats = useCallback(async () => {
    setLoading(true)
    setStatus(null)
    try {
      const data = await fetchAdminStats()
      setStats(data)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSearch = useCallback(async () => {
    setLoading(true)
    setStatus(null)
    try {
      const data = await searchAdminCharacters(searchQ, gmOnly)
      setCharacters(data.characters)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [searchQ, gmOnly])

  useEffect(() => {
    void refreshStats()
    const t = window.setInterval(() => void refreshStats(), 30_000)
    return () => window.clearInterval(t)
  }, [refreshStats])

  useEffect(() => {
    void refreshSearch()
  }, [refreshSearch])

  async function sendZeny() {
    const name = zenyName.trim()
    const amount = Number.parseInt(zenyAmount, 10)
    if (!name) {
      setStatus('Enter a character name.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Enter a positive zeny amount.')
      return
    }
    setStatus(null)
    try {
      const result = await grantZenyByName(name, amount)
      setStatus(result.message)
      setZenyAmount('')
      setCharacters((prev) =>
        prev.map((c) => (c.id === result.character.id ? { ...c, zeny: result.character.zeny } : c)),
      )
      void refreshStats()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Grant zeny failed')
    }
  }

  async function toggleGm(row: AdminCharacterRow) {
    setStatus(null)
    try {
      const { character } = await setCharacterGm(row.id, !row.is_gm)
      setCharacters((prev) => prev.map((c) => (c.id === character.id ? { ...c, is_gm: character.is_gm } : c)))
      setStatus(`${character.name} GM: ${character.is_gm ? 'on' : 'off'}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'GM update failed')
    }
  }

  return (
    <main className="map-admin-root game-admin-root">
      <header className="map-admin-header panel">
        <div>
          <h1>Game admin</h1>
          <p className="muted small">Server stats, online players, and GM flags.</p>
        </div>
        <div className="map-admin-header-actions">
          <button type="button" className="secondary" disabled={loading} onClick={() => void refreshStats()}>
            Refresh stats
          </button>
          <a className="map-admin-link" href="/admin/maps">Map editor</a>
          <a className="map-admin-link" href="/">Back to game</a>
        </div>
      </header>

      {status && <p className="map-admin-status">{status}</p>}

      {stats && (
        <section className="game-admin-stats panel">
          <h2>Overview</h2>
          <div className="game-admin-stat-grid">
            <div className="game-admin-stat">
              <span className="muted small">Online</span>
              <strong>{stats.totalOnline}</strong>
              <span className="muted small">last {stats.onlineWindowSeconds}s</span>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Characters</span>
              <strong>{stats.totalCharacters}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Accounts</span>
              <strong>{stats.totalAccounts}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Parties</span>
              <strong>{stats.totalParties}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Guilds</span>
              <strong>{stats.totalGuilds}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Vendor stalls</span>
              <strong>{stats.totalVendorStalls}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Total zeny</span>
              <strong>{stats.totalZeny.toLocaleString()}</strong>
            </div>
            <div className="game-admin-stat">
              <span className="muted small">Avg zeny / char</span>
              <strong>{stats.averageZeny.toLocaleString()}</strong>
            </div>
          </div>
        </section>
      )}

      {stats && (
        <section className="panel game-admin-section">
          <h2>Players online per map</h2>
          {stats.onlinePerMap.length === 0 ? (
            <p className="muted small">No players online in the presence window.</p>
          ) : (
            <table className="game-admin-table">
              <thead>
                <tr>
                  <th>Map</th>
                  <th>Players</th>
                </tr>
              </thead>
              <tbody>
                {stats.onlinePerMap.map((row) => (
                  <tr key={row.mapId}>
                    <td>{mapDisplayName(row.mapId)}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="panel game-admin-section">
        <h2>Send zeny</h2>
        <p className="muted small">Grant zeny by exact character name (server-side).</p>
        <div className="row gap game-admin-search">
          <input
            placeholder="Character name"
            value={zenyName}
            onChange={(e) => setZenyName(e.target.value)}
          />
          <input
            type="number"
            min={1}
            placeholder="Amount"
            value={zenyAmount}
            onChange={(e) => setZenyAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendZeny()
            }}
          />
          <button type="button" disabled={loading} onClick={() => void sendZeny()}>
            Send zeny
          </button>
        </div>
      </section>

      <section className="panel game-admin-section">
        <h2>Grandmaster (GM)</h2>
        <p className="muted small">GMs can use in-game chat: /zeny &lt;player&gt; &lt;amount&gt;</p>
        <div className="row gap game-admin-search">
          <input
            placeholder="Search character name…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void refreshSearch()
            }}
          />
          <label className="map-admin-check">
            <input type="checkbox" checked={gmOnly} onChange={(e) => setGmOnly(e.target.checked)} />
            GMs only
          </label>
          <button type="button" className="secondary" disabled={loading} onClick={() => void refreshSearch()}>
            Search
          </button>
        </div>
        <table className="game-admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Map</th>
              <th>Zeny</th>
              <th>GM</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{mapDisplayName(c.map_id)}</td>
                <td>{c.zeny.toLocaleString()}</td>
                <td>
                  <label className="map-admin-check">
                    <input
                      type="checkbox"
                      checked={Boolean(c.is_gm)}
                      onChange={() => void toggleGm(c)}
                    />
                    GM
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted small game-admin-footer">
        Map file editing works only in local dev (<code>npm run dev</code>); hosted builds can still use this dashboard.
      </p>
    </main>
  )
}
